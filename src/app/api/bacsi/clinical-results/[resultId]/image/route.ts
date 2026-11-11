import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { authenticateTreatmentImageAction } from '@/server/services/TreatmentImageAccess';
import {
  deletePrivateTreatmentImage,
  detectClinicalImageMime,
  getPrivateTreatmentImage,
  isTreatmentImageStorageConfigured,
  MAX_TREATMENT_IMAGE_BYTES,
  normalizeClinicalImage,
  putPrivateTreatmentImage,
} from '@/server/services/TreatmentImageStorage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function responseError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host')?.split(',')[0].trim() ?? request.headers.get('host');
  if (!origin || !host) return false;
  try { return new URL(origin).origin === `${request.headers.get('x-forwarded-proto') ?? 'http'}://${host}`; } catch { return false; }
}

function privateKeyIsValid(key: string, visitId: string, resultId: string) {
  return key.startsWith(`private/clinical-results/${visitId}/${resultId}/`) && key.split('/').every((part) => part && part !== '.' && part !== '..');
}

async function findScopedResult(resultId: string, employeeId: string, accountId: string) {
  return prisma.imagingResult.findFirst({
    where: {
      id: resultId,
      order: { is: { type: { startsWith: 'IMAGING:' }, visit: { is: { employeeId, employee: { is: { accountId } } } } } },
    },
    select: { id: true, fileUrl: true, order: { select: { visitId: true, visit: { select: { status: true } } } } },
  });
}

export async function GET(_request: Request, context: { params: Promise<{ resultId: string }> }) {
  const { resultId } = await context.params;
  const access = await authenticateTreatmentImageAction(['EMR_READ']);
  if (!access.success) return responseError(access.message, access.code === 'UNAUTHENTICATED' ? 401 : 403);
  if (!resultId || resultId.length > 100) return responseError('Không tìm thấy ảnh kết quả trong phạm vi được phép.', 404);
  const scoped = await findScopedResult(resultId, access.actor.employeeId!, access.actor.accountId);
  if (!scoped?.fileUrl || !privateKeyIsValid(scoped.fileUrl, scoped.order.visitId, resultId)) return responseError('Không tìm thấy ảnh kết quả trong phạm vi được phép.', 404);
  try {
    const content = await getPrivateTreatmentImage(scoped.fileUrl);
    const buffer = new ArrayBuffer(content.bytes.byteLength);
    new Uint8Array(buffer).set(content.bytes);
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
    return new Response(buffer, { status: 200, headers: {
      'Content-Type': content.contentType && allowed.has(content.contentType) ? content.contentType : 'application/octet-stream',
      'Content-Disposition': 'inline', 'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
    } });
  } catch {
    return responseError('Không thể mở ảnh kết quả riêng tư lúc này.', 502);
  }
}

export async function POST(request: Request, context: { params: Promise<{ resultId: string }> }) {
  const { resultId } = await context.params;
  if (!sameOrigin(request)) return responseError('Yêu cầu không hợp lệ.', 403);
  const access = await authenticateTreatmentImageAction(['EMR_READ', 'EMR_WRITE']);
  if (!access.success) return responseError(access.message, access.code === 'UNAUTHENTICATED' ? 401 : 403);
  if (!resultId || resultId.length > 100) return responseError('Kết quả hình ảnh không hợp lệ.', 400);
  if (!isTreatmentImageStorageConfigured()) return responseError('Kho ảnh riêng tư chưa được cấu hình.', 503);
  const contentLength = Number(request.headers.get('content-length'));
  if (!Number.isSafeInteger(contentLength) || contentLength <= 0 || contentLength > MAX_TREATMENT_IMAGE_BYTES + 64 * 1024) return responseError('Tệp ảnh vượt giới hạn 10 MB hoặc thiếu dung lượng hợp lệ.', 413);
  let form: FormData;
  try { form = await request.formData(); } catch { return responseError('Không đọc được tệp tải lên.', 400); }
  const file = form.get('file');
  if (!(file instanceof File) || file.size <= 0 || file.size > MAX_TREATMENT_IMAGE_BYTES) return responseError('Tệp ảnh vượt giới hạn 10 MB hoặc không hợp lệ.', 413);
  const scoped = await findScopedResult(resultId, access.actor.employeeId!, access.actor.accountId);
  if (!scoped || !['IN_PROGRESS', 'EXAMINING'].includes(scoped.order.visit.status)) return responseError('Chỉ có thể tải ảnh vào kết quả thuộc Visit đang khám được phân công.', 403);
  const original = Buffer.from(await file.arrayBuffer());
  const mimeType = detectClinicalImageMime(original);
  if (!mimeType) return responseError('Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP hợp lệ.', 415);
  let bytes: Buffer;
  try { bytes = await normalizeClinicalImage(original, mimeType); } catch { return responseError('Không thể giải mã tệp ảnh.', 415); }
  if (bytes.length > MAX_TREATMENT_IMAGE_BYTES) return responseError('Ảnh sau xử lý vượt giới hạn 10 MB.', 413);

  const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/png' ? 'png' : 'webp';
  const key = `private/clinical-results/${scoped.order.visitId}/${resultId}/${randomUUID()}.${extension}`;
  try {
    await putPrivateTreatmentImage(key, bytes, mimeType);
    await prisma.$transaction(async (tx) => {
      const current = await tx.imagingResult.findFirst({
        where: {
          id: resultId,
          order: {
            is: {
              type: { startsWith: 'IMAGING:' },
              visit: {
                is: {
                  id: scoped.order.visitId,
                  employeeId: access.actor.employeeId!,
                  employee: { is: { accountId: access.actor.accountId } },
                  status: { in: ['IN_PROGRESS', 'EXAMINING'] },
                },
              },
            },
          },
        },
        select: { id: true, fileUrl: true },
      });
      if (!current) throw new Error('RESULT_SCOPE_CHANGED');
      await tx.imagingResult.update({ where: { id: resultId }, data: { fileUrl: key } });
      await tx.auditLog.create({ data: { accountId: access.actor.accountId, action: 'CLINICAL_RESULT_IMAGE_UPLOADED', entity: 'ClinicalOrder', entityId: resultId } });
    }, { isolationLevel: 'Serializable', maxWait: 10_000, timeout: 15_000 });
    if (scoped.fileUrl && privateKeyIsValid(scoped.fileUrl, scoped.order.visitId, resultId)) {
      try { await deletePrivateTreatmentImage(scoped.fileUrl); } catch { /* replaced file remains private; metadata now points to the new key */ }
    }
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    try { await deletePrivateTreatmentImage(key); } catch { /* preserve the database error */ }
    return responseError('Không lưu được ảnh kết quả. Vui lòng thử lại.', 500);
  }
}
