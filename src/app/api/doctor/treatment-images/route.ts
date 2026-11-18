import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/infrastructure/database/prisma';
import { getDoctorSession } from '@/server/auth/doctor-session';
import { deleteTreatmentImageObject, isStoredTreatmentImage, uploadTreatmentImage } from '@/server/storage/neon-object-storage';

const BUCKET_PREFIX = 'treatment-images';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const allowedTypes = new Map([
  ['image/jpeg', { extension: 'jpg', signature: (b: Buffer) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff }],
  ['image/png', { extension: 'png', signature: (b: Buffer) => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) }],
  ['image/webp', { extension: 'webp', signature: (b: Buffer) => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' }],
]);

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

function isDoctorRole(name: string) {
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return normalized.includes('bac si') || normalized.includes('doctor');
}

async function getAuthorizedDoctor() {
  const session = await getDoctorSession();
  if (!session) return null;
  const account = await prisma.account.findFirst({
    where: { id: session.accountId, status: 'ACTIVE', employee: { id: session.employeeId } },
    include: { roles: { include: { role: true } } },
  });
  return account?.roles.some(({ role }) => isDoctorRole(role.name)) ? session : null;
}

export async function GET(request: NextRequest) {
  try {
    const doctor = await getAuthorizedDoctor();
    if (!doctor) return NextResponse.json({ error: 'Phiên bác sĩ không hợp lệ.' }, { status: 401 });
    const visitId = request.nextUrl.searchParams.get('visitId') || undefined;
    if (visitId) {
      const assigned = await prisma.visit.findFirst({ where: { id: visitId, employeeId: doctor.employeeId }, select: { id: true } });
      if (!assigned) return NextResponse.json({ error: 'Lượt khám không thuộc phạm vi được phân công.' }, { status: 403 });
    }

    const [visits, images] = await Promise.all([
      prisma.visit.findMany({
        where: { employeeId: doctor.employeeId },
        select: {
          id: true, visitDate: true, status: true,
          patient: { select: { id: true, fullName: true, patientCode: true, dateOfBirth: true } },
          treatmentPlans: { select: { id: true, name: true, version: true, status: true } },
        },
        orderBy: { visitDate: 'desc' }, take: 200,
      }),
      prisma.treatmentImage.findMany({
        where: { visit: { employeeId: doctor.employeeId }, ...(visitId ? { visitId } : {}) },
        select: {
          id: true, visitId: true, planId: true, sessionId: true, imageUrl: true, imageType: true, phase: true,
          bodyArea: true, description: true, capturedAt: true, capturedById: true,
          visit: { select: { id: true, visitDate: true, patient: { select: { id: true, fullName: true, patientCode: true } } } },
          plan: { select: { id: true, name: true, version: true } },
          session: { select: { id: true, sessionNo: true, scheduledAt: true } },
          capturedBy: { select: { fullName: true } },
        },
        orderBy: { capturedAt: 'desc' }, take: 200,
      }),
    ]);

    const safeImages = images.map((image) => ({
      ...image,
      imageUrl: isStoredTreatmentImage(image.imageUrl) ? `/api/doctor/treatment-images/${encodeURIComponent(image.id)}/file` : image.imageUrl,
    }));
    return NextResponse.json({ data: { visits, images: safeImages } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể tải ảnh theo dõi.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let uploadedKey = '';
  let stage = 'authorize';
  try {
    if (!isSameOrigin(request)) return NextResponse.json({ error: 'Yêu cầu tải ảnh không cùng nguồn với ứng dụng.' }, { status: 403 });
    const doctor = await getAuthorizedDoctor();
    if (!doctor) return NextResponse.json({ error: 'Phiên bác sĩ không hợp lệ.' }, { status: 401 });
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > MAX_IMAGE_BYTES + 128 * 1024) return NextResponse.json({ error: 'Ảnh phải có dung lượng tối đa 8 MB.' }, { status: 413 });
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json({ error: 'Không đọc được tệp tải lên. Hãy chọn lại ảnh rồi thử lại.' }, { status: 400 });
    }
    const visitId = String(form.get('visitId') || '').trim();
    const planId = String(form.get('planId') || '').trim() || null;
    const phase = String(form.get('phase') || '').trim();
    const imageType = String(form.get('imageType') || '').trim();
    const bodyArea = String(form.get('bodyArea') || '').trim();
    const description = String(form.get('description') || '').trim();
    const sessionId = String(form.get('sessionId') || '').trim() || null;
    const file = form.get('file');
    if (!visitId || !phase || !imageType || !(file instanceof File)) {
      return NextResponse.json({ error: 'Hãy chọn lượt khám, pha ảnh, loại ảnh và tệp ảnh.' }, { status: 400 });
    }
    if (!['BEFORE', 'AFTER', 'FOLLOW_UP'].includes(phase)) return NextResponse.json({ error: 'Pha ảnh không hợp lệ.' }, { status: 400 });
    if (imageType.length > 80 || bodyArea.length > 120 || description.length > 2000) return NextResponse.json({ error: 'Thông tin mô tả vượt quá độ dài cho phép.' }, { status: 400 });
    if (file.size < 1 || file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: 'Ảnh phải có dung lượng tối đa 8 MB.' }, { status: 400 });
    const fileRule = allowedTypes.get(file.type);
    if (!fileRule) return NextResponse.json({ error: 'Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.' }, { status: 400 });
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!fileRule.signature(bytes)) return NextResponse.json({ error: 'Nội dung tệp không khớp với định dạng ảnh đã chọn.' }, { status: 400 });

    const visit = await prisma.visit.findFirst({
      where: { id: visitId, employeeId: doctor.employeeId },
      select: { id: true, patientId: true },
    });
    if (!visit) return NextResponse.json({ error: 'Lượt khám không thuộc phạm vi được phân công.' }, { status: 403 });
    if (planId) {
      const plan = await prisma.treatmentPlan.findFirst({ where: { id: planId, visitId, patientId: visit.patientId }, select: { id: true, status: true } });
      if (!plan) return NextResponse.json({ error: 'Phác đồ không thuộc lượt khám đã chọn.' }, { status: 400 });
      if (!['ACTIVE', 'IN_PROGRESS', 'PLANNED'].includes(plan.status)) return NextResponse.json({ error: 'Chỉ có thể thêm ảnh vào phác đồ đang theo dõi.' }, { status: 409 });
    }
    if (sessionId) {
      if (!planId) return NextResponse.json({ error: 'Chọn phác đồ để liên kết buổi điều trị.' }, { status: 400 });
      const session = await prisma.treatmentSession.findFirst({ where: { id: sessionId, visitId, stage: { planId } }, select: { id: true } });
      if (!session) return NextResponse.json({ error: 'Buổi điều trị không thuộc lượt khám và phác đồ đã chọn.' }, { status: 400 });
    }

    stage = 'upload';
    uploadedKey = `${BUCKET_PREFIX}/${visitId}/${randomUUID()}.${fileRule.extension}`;
    await uploadTreatmentImage(uploadedKey, file.type, bytes);
    stage = 'save';
    const image = await prisma.treatmentImage.create({
      data: {
        planId, sessionId, visitId, imageUrl: uploadedKey, imageType, phase, bodyArea: bodyArea || null,
        description: description || null, capturedAt: new Date(), capturedById: doctor.employeeId,
      },
      select: { id: true },
    });
    return NextResponse.json({ data: { id: image.id } }, { status: 201 });
  } catch (error) {
    const reason = error instanceof Error ? error.name : 'UnknownError';
    const cause = error instanceof Error ? error.cause : null;
    const code = cause && typeof cause === 'object' && 'code' in cause ? cause.code : undefined;
    console.error('[treatment-images] Save failed', { stage, reason, code });
    if (uploadedKey) {
      try {
        await deleteTreatmentImageObject(uploadedKey);
      } catch {
        console.warn('[treatment-images] Could not clean up an incomplete upload');
      }
    }
    if (stage === 'upload') {
      if (code === 401 || code === 403) {
        return NextResponse.json({ error: 'Kho ảnh từ chối quyền ghi. Hãy báo người quản trị kiểm tra cấu hình.' }, { status: 503 });
      }
      return NextResponse.json({ error: 'Kho ảnh chưa nhận được tệp. Hãy thử lại hoặc chọn một tệp ảnh nhỏ hơn.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Máy chủ chưa thể lưu ảnh vào hồ sơ lượt khám. Vui lòng thử lại.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) return NextResponse.json({ error: 'Yêu cầu cập nhật không cùng nguồn với ứng dụng.' }, { status: 403 });
    const doctor = await getAuthorizedDoctor();
    if (!doctor) return NextResponse.json({ error: 'Phiên bác sĩ không hợp lệ.' }, { status: 401 });
    const body = await request.json();
    const imageId = typeof body.imageId === 'string' ? body.imageId.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    if (!imageId || description.length > 2000) return NextResponse.json({ error: 'Thông tin mô tả ảnh không hợp lệ.' }, { status: 400 });
    const image = await prisma.treatmentImage.findFirst({ where: { id: imageId, capturedById: doctor.employeeId, visit: { employeeId: doctor.employeeId } }, select: { id: true } });
    if (!image) return NextResponse.json({ error: 'Ảnh không thuộc quyền cập nhật của bác sĩ.' }, { status: 403 });
    await prisma.treatmentImage.update({ where: { id: image.id }, data: { description: description || null } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể cập nhật mô tả ảnh.' }, { status: 400 });
  }
}
