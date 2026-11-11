import { NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { authenticateTreatmentImageAction, imageFailure, recordTreatmentImageAudit } from '@/server/services/TreatmentImageAccess';
import { getPrivateTreatmentImage } from '@/server/services/TreatmentImageStorage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function privateKeyIsValid(key: string, patientId: string, planId: string): boolean {
  return key.startsWith(`private/patients/${patientId}/${planId}/`) && key.split('/').every((part) => part && part !== '.' && part !== '..');
}

function ipFromRequest(request: Request): string | null {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim().slice(0, 64) ?? null;
}

export async function GET(request: Request, context: { params: Promise<{ imageId: string }> }) {
  const { imageId } = await context.params;
  const access = await authenticateTreatmentImageAction(['IMAGE_READ']);
  if (!access.success) {
    await recordTreatmentImageAudit({ action: 'IMAGE_VIEW_DENIED', entityId: imageId || null, ipAddress: ipFromRequest(request) });
    return NextResponse.json({ success: false, code: access.code, message: access.message, trace: access.trace }, { status: access.code === 'UNAUTHENTICATED' ? 401 : 403, headers: { 'Cache-Control': 'private, no-store' } });
  }
  if (!imageId || imageId.length > 100) {
    await recordTreatmentImageAudit({ accountId: access.actor.accountId, action: 'IMAGE_VIEW_DENIED', entityId: null, ipAddress: ipFromRequest(request) });
    return NextResponse.json({ success: false, code: 'NOT_FOUND', message: imageFailure('NOT_FOUND') }, { status: 404, headers: { 'Cache-Control': 'private, no-store' } });
  }

  const canManageHidden = access.actor.rolePermissions.some(({ permissionCodes }) =>
    ['IMAGE_READ', 'IMAGE_WRITE', 'EMR_WRITE'].every((code) => permissionCodes.includes(code)),
  );

  const image = await prisma.treatmentImage.findFirst({
    where: {
      id: imageId,
      ...(canManageHidden ? {} : { isHidden: false }),
      visit: { is: { employeeId: access.actor.employeeId ?? '', employee: { is: { accountId: access.actor.accountId } } } },
    },
    select: {
      id: true,
      imageUrl: true,
      planId: true,
      visitId: true,
      sessionId: true,
      mimeType: true,
      plan: { select: { id: true, patientId: true, visitId: true } },
      visit: { select: { patientId: true } },
      session: { select: { visitId: true, stage: { select: { planId: true } } } },
    },
  });
  if (!image || image.plan.visitId !== image.visitId || image.plan.patientId !== image.visit.patientId ||
    (image.session && (image.session.visitId !== image.visitId || image.session.stage.planId !== image.planId)) || !privateKeyIsValid(image.imageUrl, image.plan.patientId, image.plan.id)) {
    await recordTreatmentImageAudit({ accountId: access.actor.accountId, action: 'IMAGE_VIEW_DENIED', entityId: imageId, ipAddress: ipFromRequest(request) });
    return NextResponse.json({ success: false, code: 'NOT_FOUND', message: imageFailure('NOT_FOUND'), trace: [...access.trace, 'inScopeOrCoherence:FAIL'] }, { status: 404, headers: { 'Cache-Control': 'private, no-store' } });
  }

  try {
    const content = await getPrivateTreatmentImage(image.imageUrl);
    await recordTreatmentImageAudit({ accountId: access.actor.accountId, action: 'IMAGE_VIEW', entityId: image.id, ipAddress: ipFromRequest(request) });
    const body = new ArrayBuffer(content.bytes.byteLength);
    new Uint8Array(body).set(content.bytes);
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    const contentType = image.mimeType && allowedTypes.has(image.mimeType) ? image.mimeType : 'application/octet-stream';
    return new Response(body, { status: 200, headers: {
      'Content-Type': contentType,
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    } });
  } catch (error) {
    const configured = error instanceof Error && error.message === 'IMAGE_STORAGE_NOT_CONFIGURED';
    return NextResponse.json({ success: false, code: configured ? 'STORAGE_NOT_CONFIGURED' : 'STORAGE_ERROR', message: configured ? imageFailure('STORAGE_NOT_CONFIGURED') : 'Không thể mở ảnh riêng tư lúc này.' }, { status: configured ? 503 : 502, headers: { 'Cache-Control': 'private, no-store' } });
  }
}
