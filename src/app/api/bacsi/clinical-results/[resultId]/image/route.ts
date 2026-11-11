import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { authenticateTreatmentImageAction } from '@/server/services/TreatmentImageAccess';
import {
  deletePrivateTreatmentImage,
  detectClinicalImageMime,
  detectClinicalResultMime,
  getPrivateTreatmentImage,
  isTreatmentImageStorageConfigured,
  MAX_TREATMENT_IMAGE_BYTES,
  normalizeClinicalImage,
  putPrivateTreatmentImage,
} from '@/server/services/TreatmentImageStorage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ResultScope = {
  id: string;
  kind: 'LAB' | 'IMAGING';
  fileUrl: string | null;
  fileMimeType: string | null;
  fileName: string | null;
  order: { id: string; visitId: string; status: string };
};

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

async function findScopedResult(resultId: string, employeeId: string, accountId: string): Promise<ResultScope | null> {
  const relation = { order: { is: { visit: { is: { employeeId, employee: { is: { accountId } } } } } } };
  const imaging = await prisma.imagingResult.findFirst({
    where: { id: resultId, ...relation },
    select: { id: true, fileUrl: true, fileMimeType: true, fileName: true, order: { select: { id: true, visitId: true, visit: { select: { status: true } } } } },
  });
  if (imaging) return { id: imaging.id, kind: 'IMAGING', fileUrl: imaging.fileUrl, fileMimeType: imaging.fileMimeType, fileName: imaging.fileName, order: { id: imaging.order.id, visitId: imaging.order.visitId, status: imaging.order.visit.status } };

  const lab = await prisma.labResult.findFirst({
    where: { id: resultId, ...relation },
    select: { id: true, fileUrl: true, fileMimeType: true, fileName: true, order: { select: { id: true, visitId: true, visit: { select: { status: true } } } } },
  });
  if (!lab) return null;
  return { id: lab.id, kind: 'LAB', fileUrl: lab.fileUrl, fileMimeType: lab.fileMimeType, fileName: lab.fileName, order: { id: lab.order.id, visitId: lab.order.visitId, status: lab.order.visit.status } };
}

export async function GET(_request: Request, context: { params: Promise<{ resultId: string }> }) {
  const { resultId } = await context.params;
  const access = await authenticateTreatmentImageAction(['EMR_READ']);
  if (!access.success) return responseError(access.message, access.code === 'UNAUTHENTICATED' ? 401 : 403);
  if (!resultId || resultId.length > 100) return responseError('Không tìm thấy tệp kết quả trong phạm vi được phép.', 404);
  const scoped = await findScopedResult(resultId, access.actor.employeeId!, access.actor.accountId);
  if (!scoped?.fileUrl || !privateKeyIsValid(scoped.fileUrl, scoped.order.visitId, resultId)) return responseError('Không tìm thấy tệp kết quả trong phạm vi được phép.', 404);
  try {
    const content = await getPrivateTreatmentImage(scoped.fileUrl);
    const buffer = new ArrayBuffer(content.bytes.byteLength);
    new Uint8Array(buffer).set(content.bytes);
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
    const mimeType = content.contentType && allowed.has(content.contentType) ? content.contentType : (scoped.fileMimeType ?? 'application/octet-stream');
    const headers = new Headers({
      'Content-Type': allowed.has(mimeType) ? mimeType : 'application/octet-stream',
      'Content-Disposition': mimeType === 'application/pdf' ? 'inline' : 'inline',
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    });
    return new Response(buffer, { status: 200, headers });
  } catch {
    return responseError('Không thể mở tệp kết quả riêng tư lúc này.', 502);
  }
}

export async function POST(request: Request, context: { params: Promise<{ resultId: string }> }) {
  const { resultId } = await context.params;
  if (!sameOrigin(request)) return responseError('Yêu cầu không hợp lệ.', 403);
  const access = await authenticateTreatmentImageAction(['EMR_READ', 'EMR_WRITE']);
  if (!access.success) return responseError(access.message, access.code === 'UNAUTHENTICATED' ? 401 : 403);
  if (!resultId || resultId.length > 100) return responseError('Mã kết quả không hợp lệ.', 400);
  if (!isTreatmentImageStorageConfigured()) return responseError('Kho lưu trữ riêng tư chưa được cấu hình.', 503);
  const contentLength = Number(request.headers.get('content-length'));
  if (!Number.isSafeInteger(contentLength) || contentLength <= 0 || contentLength > MAX_TREATMENT_IMAGE_BYTES + 64 * 1024) return responseError('Tệp vượt quá giới hạn 10 MB hoặc thiếu dung lượng hợp lệ.', 413);
  let form: FormData;
  try { form = await request.formData(); } catch { return responseError('Không đọc được tệp tải lên.', 400); }
  const file = form.get('file');
  if (!(file instanceof File) || file.size <= 0 || file.size > MAX_TREATMENT_IMAGE_BYTES) return responseError('Tệp vượt quá giới hạn 10 MB hoặc không hợp lệ.', 413);
  const scoped = await findScopedResult(resultId, access.actor.employeeId!, access.actor.accountId);
  if (!scoped || !['IN_PROGRESS', 'EXAMINING'].includes(scoped.order.status)) return responseError('Chỉ tải tệp vào kết quả thuộc Visit đang khám được phân công.', 403);

  const original = Buffer.from(await file.arrayBuffer());
  const mimeType = detectClinicalResultMime(original);
  if (!mimeType) return responseError('Chỉ nhận ảnh JPEG, PNG, WebP hoặc tệp PDF hợp lệ.', 415);
  let bytes = original;
  if (mimeType !== 'application/pdf') {
    const imageMime = detectClinicalImageMime(original);
    if (!imageMime) return responseError('Định dạng ảnh không hợp lệ.', 415);
    try { bytes = Buffer.from(await normalizeClinicalImage(original, imageMime)); } catch { return responseError('Không giải mã được tệp ảnh.', 415); }
  }
  if (bytes.length > MAX_TREATMENT_IMAGE_BYTES) return responseError('Tệp sau xử lý vượt quá giới hạn 10 MB.', 413);

  const extension = mimeType === 'application/pdf' ? 'pdf' : mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/png' ? 'png' : 'webp';
  const key = `private/clinical-results/${scoped.order.visitId}/${resultId}/${randomUUID()}.${extension}`;
  const safeFileName = file.name.replace(/[\\/\r\n\0]/g, '_').slice(0, 180) || `ket-qua.${extension}`;
  try {
    await putPrivateTreatmentImage(key, bytes, mimeType);
    await prisma.$transaction(async (tx) => {
      const activeVisit = await tx.visit.findFirst({
        where: { id: scoped.order.visitId, employeeId: access.actor.employeeId!, employee: { is: { accountId: access.actor.accountId } }, status: { in: ['IN_PROGRESS', 'EXAMINING'] } },
        select: { id: true },
      });
      if (!activeVisit) throw new Error('RESULT_SCOPE_CHANGED');
      if (scoped.kind === 'IMAGING') {
        const updated = await tx.imagingResult.updateMany({ where: { id: resultId, order: { is: { visitId: activeVisit.id } } }, data: { fileUrl: key, fileMimeType: mimeType, fileName: safeFileName } });
        if (updated.count !== 1) throw new Error('RESULT_SCOPE_CHANGED');
      } else {
        const updated = await tx.labResult.updateMany({ where: { id: resultId, order: { is: { visitId: activeVisit.id } } }, data: { fileUrl: key, fileMimeType: mimeType, fileName: safeFileName } });
        if (updated.count !== 1) throw new Error('RESULT_SCOPE_CHANGED');
      }
      await tx.clinicalOrder.updateMany({ where: { id: scoped.order.id, visitId: activeVisit.id, status: { in: ['CREATED', 'WAITING'] } }, data: { status: 'IN_PROGRESS' } });
      await tx.auditLog.create({ data: { accountId: access.actor.accountId, action: 'CLINICAL_RESULT_FILE_UPLOADED', entity: 'ClinicalOrder', entityId: resultId } });
    }, { isolationLevel: 'Serializable', maxWait: 10_000, timeout: 15_000 });
    if (scoped.fileUrl && privateKeyIsValid(scoped.fileUrl, scoped.order.visitId, resultId)) {
      try { await deletePrivateTreatmentImage(scoped.fileUrl); } catch { /* old object remains private while the row points to its replacement */ }
    }
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    try { await deletePrivateTreatmentImage(key); } catch { /* preserve the database error */ }
    return responseError('Không lưu được tệp kết quả. Vui lòng thử lại.', 500);
  }
}
