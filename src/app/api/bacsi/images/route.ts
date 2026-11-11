import { createHash, randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { authenticateTreatmentImageAction, imageFailure, recordTreatmentImageAudit } from '@/server/services/TreatmentImageAccess';
import {
  deletePrivateTreatmentImage,
  detectClinicalImageMime,
  isTreatmentImageStorageConfigured,
  MAX_TREATMENT_IMAGE_BYTES,
  normalizeClinicalImage,
  putPrivateTreatmentImage,
} from '@/server/services/TreatmentImageStorage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const IMAGE_READ = 'IMAGE_READ';
const IMAGE_WRITE = 'IMAGE_WRITE';
const PHASES = new Set(['BEFORE', 'DURING', 'AFTER', 'FOLLOW_UP']);
const IMAGE_TYPES = new Set(['CLINICAL', 'DERMOSCOPY']);

function requestIp(request: Request): string | null {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim().slice(0, 64) ?? null;
}

function textField(form: FormData, key: string, max: number): string | null {
  const value = form.get(key);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : null;
}

async function rejectUpload(request: Request, input: { accountId?: string | null; patientId?: string | null; code: string; message: string; status: number; trace: string[] }) {
  await recordTreatmentImageAudit({ accountId: input.accountId, action: 'IMAGE_UPLOAD_DENIED', entityId: input.patientId ?? null, ipAddress: requestIp(request) });
  return NextResponse.json({ success: false, code: input.code, message: input.message, trace: input.trace }, { status: input.status, headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: Request) {
  const access = await authenticateTreatmentImageAction([IMAGE_READ, IMAGE_WRITE]);
  if (!access.success) return rejectUpload(request, {
    code: access.code,
    message: access.message,
    status: access.code === 'UNAUTHENTICATED' ? 401 : 403,
    trace: access.trace,
  });
  const trace = [...access.trace];

  const rawContentLength = request.headers.get('content-length');
  const contentLength = rawContentLength === null ? NaN : Number(rawContentLength);
  if (rawContentLength === null || !Number.isSafeInteger(contentLength) || contentLength <= 0) {
    return rejectUpload(request, { accountId: access.actor.accountId, code: 'VALIDATION_FAILED', message: 'Yêu cầu tải ảnh thiếu thông tin dung lượng hợp lệ.', status: 411, trace: [...trace, 'fileSize:FAIL'] });
  }
  if (contentLength > MAX_TREATMENT_IMAGE_BYTES + 64 * 1024) {
    return rejectUpload(request, { accountId: access.actor.accountId, code: 'FILE_TOO_LARGE', message: imageFailure('FILE_TOO_LARGE'), status: 413, trace: [...trace, 'fileSize:FAIL'] });
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return rejectUpload(request, { accountId: access.actor.accountId, code: 'VALIDATION_FAILED', message: imageFailure('VALIDATION_FAILED'), status: 400, trace: [...trace, 'parseMultipart:FAIL'] });
  }

  const patientId = textField(form, 'patientId', 100);
  const visitId = textField(form, 'visitId', 100);
  const planId = textField(form, 'planId', 100);
  const sessionId = textField(form, 'sessionId', 100) || null;
  const phase = textField(form, 'phase', 30);
  const imageType = textField(form, 'imageType', 30);
  const bodyArea = textField(form, 'bodyArea', 200) || null;
  const description = textField(form, 'description', 1000) || null;
  const capturedAtRaw = textField(form, 'capturedAt', 40);
  const file = form.get('file');
  if (!patientId || !visitId || !planId || !phase || !imageType || !capturedAtRaw || !PHASES.has(phase) || !IMAGE_TYPES.has(imageType) || !(file instanceof File)) {
    return rejectUpload(request, { accountId: access.actor.accountId, patientId, code: 'VALIDATION_FAILED', message: imageFailure('VALIDATION_FAILED'), status: 422, trace: [...trace, 'validateFields:FAIL'] });
  }
  const capturedAt = new Date(capturedAtRaw);
  if (Number.isNaN(capturedAt.getTime()) || capturedAt.getTime() > Date.now() + 5 * 60 * 1000) {
    return rejectUpload(request, { accountId: access.actor.accountId, patientId, code: 'VALIDATION_FAILED', message: imageFailure('VALIDATION_FAILED'), status: 422, trace: [...trace, 'validateCapturedAt:FAIL'] });
  }

  const visit = await prisma.visit.findFirst({
    where: { id: visitId, patientId, employeeId: access.actor.employeeId!, employee: { is: { accountId: access.actor.accountId } } },
    select: { id: true, patientId: true },
  });
  if (!visit) return rejectUpload(request, { accountId: access.actor.accountId, patientId, code: 'FORBIDDEN_SCOPE', message: imageFailure('FORBIDDEN_SCOPE'), status: 404, trace: [...trace, 'inScope:FAIL'] });
  trace.push('inScope:OK');

  const plan = await prisma.treatmentPlan.findFirst({ where: { id: planId, patientId, visitId }, select: { id: true, patientId: true, visitId: true } });
  if (!plan) return rejectUpload(request, { accountId: access.actor.accountId, patientId, code: 'ENTITY_MISMATCH', message: imageFailure('ENTITY_MISMATCH'), status: 422, trace: [...trace, 'entityCoherence:FAIL'] });
  if (sessionId) {
    const treatmentSession = await prisma.treatmentSession.findFirst({
      where: { id: sessionId, visitId, stage: { is: { planId } } },
      select: { id: true, visitId: true, stage: { select: { planId: true } } },
    });
    if (!treatmentSession || treatmentSession.visitId !== visit.id || treatmentSession.stage.planId !== plan.id) {
      return rejectUpload(request, { accountId: access.actor.accountId, patientId, code: 'ENTITY_MISMATCH', message: imageFailure('ENTITY_MISMATCH'), status: 422, trace: [...trace, 'entityCoherence:FAIL'] });
    }
  }
  trace.push('entityCoherence:OK');

  if (file.size <= 0) return rejectUpload(request, { accountId: access.actor.accountId, patientId, code: 'INVALID_FILE_TYPE', message: imageFailure('INVALID_FILE_TYPE'), status: 422, trace: [...trace, 'fileSize:FAIL'] });
  if (file.size > MAX_TREATMENT_IMAGE_BYTES) return rejectUpload(request, { accountId: access.actor.accountId, patientId, code: 'FILE_TOO_LARGE', message: imageFailure('FILE_TOO_LARGE'), status: 413, trace: [...trace, 'fileSize:FAIL'] });
  const original = Buffer.from(await file.arrayBuffer());
  const mimeType = detectClinicalImageMime(original);
  if (!mimeType) return rejectUpload(request, { accountId: access.actor.accountId, patientId, code: 'INVALID_FILE_TYPE', message: imageFailure('INVALID_FILE_TYPE'), status: 422, trace: [...trace, 'fileSignature:FAIL'] });
  trace.push('fileSignature:OK');

  const templateName = process.env.EMR_IMAGE_CONSENT_TEMPLATE_NAME || 'Đồng ý lưu ảnh lâm sàng';
  const consents = await prisma.signedConsent.findMany({
    where: { visitId, OR: [{ treatmentPlanId: null }, { treatmentPlanId: planId }], template: { is: { name: templateName, version: 1 } } },
    select: { signedAt: true, audits: { select: { action: true, createdAt: true } } },
  });
  const hasConsent = consents.some((consent) => !consent.audits.some((audit) => audit.action === 'REVOKED' && audit.createdAt >= consent.signedAt));
  if (!hasConsent) return rejectUpload(request, { accountId: access.actor.accountId, patientId, code: 'CONSENT_MISSING', message: imageFailure('CONSENT_MISSING'), status: 403, trace: [...trace, 'hasImageConsent:FAIL'] });
  trace.push('hasImageConsent:OK');

  if (!isTreatmentImageStorageConfigured()) return rejectUpload(request, { accountId: access.actor.accountId, patientId, code: 'STORAGE_NOT_CONFIGURED', message: imageFailure('STORAGE_NOT_CONFIGURED'), status: 503, trace: [...trace, 'privateStorage:FAIL'] });

  let storedBytes: Buffer;
  try {
    storedBytes = await normalizeClinicalImage(original, mimeType);
  } catch {
    return rejectUpload(request, { accountId: access.actor.accountId, patientId, code: 'INVALID_FILE_TYPE', message: imageFailure('INVALID_FILE_TYPE'), status: 422, trace: [...trace, 'imageDecode:FAIL'] });
  }
  if (storedBytes.length > MAX_TREATMENT_IMAGE_BYTES) {
    return rejectUpload(request, { accountId: access.actor.accountId, patientId, code: 'FILE_TOO_LARGE', message: imageFailure('FILE_TOO_LARGE'), status: 413, trace: [...trace, 'normalizedFileSize:FAIL'] });
  }
  const checksumSha256 = createHash('sha256').update(storedBytes).digest('hex');
  const duplicate = await prisma.treatmentImage.findFirst({
    where: { planId, checksumSha256, capturedAt: { gte: new Date(capturedAt.getTime() - 3000), lte: new Date(capturedAt.getTime() + 3000) } },
    select: { id: true },
  });
  if (duplicate) return rejectUpload(request, { accountId: access.actor.accountId, patientId, code: 'VALIDATION_FAILED', message: 'Ảnh trùng đã được tải lên gần cùng thời điểm.', status: 409, trace: [...trace, 'duplicateCheck:FAIL'] });

  const imageId = randomUUID();
  const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/png' ? 'png' : 'webp';
  const storageKey = `private/patients/${patientId}/${planId}/${imageId}.${extension}`;
  try {
    await putPrivateTreatmentImage(storageKey, storedBytes, mimeType);
    trace.push('privateStorage:OK');
    await prisma.$transaction(async (tx) => {
      const image = await tx.treatmentImage.create({
        data: {
          id: imageId,
          planId,
          sessionId,
          visitId,
          imageUrl: storageKey,
          imageType,
          phase,
          bodyArea,
          description,
          capturedAt,
          capturedById: access.actor.employeeId,
          mimeType,
          fileSizeBytes: storedBytes.length,
          checksumSha256,
        },
        select: { id: true, planId: true, sessionId: true, visitId: true, imageType: true, phase: true, bodyArea: true, description: true, capturedAt: true, mimeType: true, fileSizeBytes: true, createdAt: true },
      });
      if (description) await tx.imageNoteRevision.create({ data: { imageId, version: 1, text: description, authorId: access.actor.employeeId! } });
      await tx.auditLog.create({ data: { accountId: access.actor.accountId, action: 'IMAGE_UPLOAD', entity: 'TreatmentImage', entityId: imageId, ipAddress: requestIp(request) } });
      return image;
    }, { isolationLevel: 'Serializable' });
    return NextResponse.json({ success: true, data: { id: imageId, planId, sessionId, visitId, imageType, phase, bodyArea, description, capturedAt: capturedAt.toISOString(), mimeType, fileSizeBytes: storedBytes.length }, trace: [...trace, 'metadataAndAuditTransaction:OK'] }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    try { await deletePrivateTreatmentImage(storageKey); } catch { /* keep the original database failure */ }
    console.error('[emr-images] upload transaction failed', { name: error instanceof Error ? error.name : 'UnknownError' });
    return rejectUpload(request, { accountId: access.actor.accountId, patientId, code: 'VALIDATION_FAILED', message: 'Không lưu được ảnh. Tệp đã tải lên kho riêng tư được bù trừ.', status: 500, trace: [...trace, 'metadataAndAuditTransaction:FAIL', 'compensation:ATTEMPTED'] });
  }
}
