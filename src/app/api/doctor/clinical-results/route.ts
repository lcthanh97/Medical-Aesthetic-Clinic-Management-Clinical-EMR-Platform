import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/infrastructure/database/prisma';
import { getDoctorSession } from '@/server/auth/doctor-session';
import { deleteTreatmentImageObject, uploadTreatmentImage } from '@/server/storage/neon-object-storage';

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const resultSchema = z.object({
  orderId: z.string().trim().min(1),
  labResults: z.array(z.object({
    id: z.string().optional(),
    testName: z.string().trim().min(1).max(120),
    result: z.string().trim().min(1).max(2000),
    unit: z.string().trim().max(60).optional().default(''),
  }).strict()).max(30).default([]),
  imagingType: z.string().trim().max(120).optional().default(''),
  conclusion: z.string().trim().max(4000).optional().default(''),
}).strict();

const fileRules = new Map([
  ['image/jpeg', { extension: 'jpg', valid: (bytes: Buffer) => bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff }],
  ['image/png', { extension: 'png', valid: (bytes: Buffer) => bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) }],
  ['image/webp', { extension: 'webp', valid: (bytes: Buffer) => bytes.length > 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' }],
  ['application/pdf', { extension: 'pdf', valid: (bytes: Buffer) => bytes.length > 5 && bytes.toString('ascii', 0, 5) === '%PDF-' }],
]);

function isDoctorRole(name: string) {
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return normalized.includes('bac si') || normalized.includes('doctor');
}

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  const expectedHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (!origin || !expectedHost) return false;
  try {
    const source = new URL(origin);
    const protocol = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
    return source.host.toLowerCase() === expectedHost.toLowerCase() && (!protocol || source.protocol === `${protocol}:`);
  } catch { return false; }
}

async function currentDoctor() {
  const session = await getDoctorSession();
  if (!session) return null;
  const account = await prisma.account.findFirst({
    where: { id: session.accountId, status: 'ACTIVE', employee: { id: session.employeeId } },
    include: { roles: { include: { role: true } } },
  });
  return account?.roles.some(({ role }) => isDoctorRole(role.name)) ? session : null;
}

export async function POST(request: NextRequest) {
  let objectKey = '';
  try {
    if (!isSameOrigin(request)) return NextResponse.json({ error: 'Yêu cầu không cùng nguồn với ứng dụng.' }, { status: 403 });
    const doctor = await currentDoctor();
    if (!doctor) return NextResponse.json({ error: 'Phiên bác sĩ không hợp lệ.' }, { status: 401 });
    if (Number(request.headers.get('content-length') || 0) > MAX_FILE_BYTES + 128 * 1024) {
      return NextResponse.json({ error: 'Tệp kết quả tối đa 8 MB.' }, { status: 413 });
    }

    const form = await request.formData();
    const parsed = resultSchema.safeParse(JSON.parse(String(form.get('payload') || '{}')));
    if (!parsed.success) return NextResponse.json({ error: 'Các trường kết quả chưa hợp lệ.', details: parsed.error.flatten() }, { status: 400 });
    const input = parsed.data;
    const file = form.get('file');
    if (file !== null && !(file instanceof File)) return NextResponse.json({ error: 'Tệp kết quả không hợp lệ.' }, { status: 400 });
    if (file instanceof File && (file.size < 1 || file.size > MAX_FILE_BYTES)) return NextResponse.json({ error: 'Tệp kết quả phải có dung lượng tối đa 8 MB.' }, { status: 400 });
    if (input.labResults.length === 0 && !input.conclusion) {
      return NextResponse.json({ error: 'Nhập ít nhất một chỉ số/kết quả hoặc kết luận chuyên môn trước khi lưu.' }, { status: 400 });
    }
    if (file instanceof File && !input.conclusion) return NextResponse.json({ error: 'Vui lòng nhập kết luận chuyên môn trước khi đính kèm tệp kết quả.' }, { status: 400 });
    const names = input.labResults.map((row) => row.testName.toLocaleLowerCase('vi'));
    if (new Set(names).size !== names.length) return NextResponse.json({ error: 'Tên chỉ số không được trùng trong cùng lần lưu.' }, { status: 400 });

    const order = await prisma.clinicalOrder.findFirst({
      where: {
        id: input.orderId,
        visit: { employeeId: doctor.employeeId, status: { in: ['IN_PROGRESS', 'EXAMINING'] } },
        status: { in: ['IN_PROGRESS', 'READY'] },
      },
      select: { id: true, visitId: true, type: true, status: true, service: { select: { name: true } } },
    });
    if (!order) return NextResponse.json({ error: 'Chỉ định không thuộc lượt đang khám được phân công hoặc chưa ở trạng thái cho phép nhập kết quả.' }, { status: 403 });

    let bytes: Buffer | null = null;
    let contentType = '';
    let extension = '';
    if (file instanceof File) {
      const rule = fileRules.get(file.type);
      if (!rule) return NextResponse.json({ error: 'Chỉ nhận ảnh JPEG/PNG/WebP hoặc tệp PDF.' }, { status: 400 });
      bytes = Buffer.from(await file.arrayBuffer());
      if (!rule.valid(bytes)) return NextResponse.json({ error: 'Nội dung tệp không khớp với định dạng đã chọn.' }, { status: 400 });
      contentType = file.type;
      extension = rule.extension;
      objectKey = `cls-results/${order.visitId}/${order.id}/${randomUUID()}.${extension}`;
      await uploadTreatmentImage(objectKey, contentType, bytes);
    }

    const saved = await prisma.$transaction(async (tx) => {
      const currentOrder = await tx.clinicalOrder.findFirst({
        where: {
          id: order.id,
          visit: { employeeId: doctor.employeeId, status: { in: ['IN_PROGRESS', 'EXAMINING'] } },
          status: { in: ['IN_PROGRESS', 'READY'] },
        },
        select: { id: true, visitId: true, type: true, service: { select: { name: true } },
          labResults: { select: { id: true } }, imagingResults: { select: { id: true } } },
      });
      if (!currentOrder) throw new Error('Chỉ định đã thay đổi trạng thái hoặc không còn thuộc lượt khám được phân công.');
      if (currentOrder.labResults.length || currentOrder.imagingResults.length) throw new Error('Chỉ định đã có kết quả. Tải lại trang để xem dữ liệu hiện có.');

      const labResults = [];
      for (const row of input.labResults) {
        labResults.push(await tx.labResult.create({ data: { orderId: currentOrder.id, testName: row.testName.trim(), result: row.result.trim(), unit: row.unit.trim() || null } }));
      }
      const hasImagingContent = Boolean(input.conclusion || objectKey);
      const imagingResults = hasImagingContent ? [await tx.imagingResult.create({
        data: {
          orderId: currentOrder.id,
          imagingType: input.imagingType.trim() || currentOrder.service?.name || currentOrder.type,
          conclusion: input.conclusion.trim(),
          fileUrl: objectKey || null,
        },
      })] : [];
      await tx.clinicalOrder.update({ where: { id: currentOrder.id }, data: { status: 'COMPLETED' } });
      return { orderId: currentOrder.id, labResults, imagingResults, status: 'COMPLETED' };
    });
    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    if (objectKey) {
      try { await deleteTreatmentImageObject(objectKey); } catch { /* Keep the original save error; do not mask it with cleanup. */ }
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể lưu kết quả cận lâm sàng.' }, { status: 400 });
  }
}

