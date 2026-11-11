'use server';

import { prisma } from '@/infrastructure/database/prisma';
import { authenticateTreatmentImageAction, imageFailure, recordTreatmentImageAudit } from '@/server/services/TreatmentImageAccess';

const IMAGE_READ = 'IMAGE_READ';
const IMAGE_WRITE = 'IMAGE_WRITE';
const EMR_WRITE = 'EMR_WRITE';
const AUDIT_READ = 'AUDIT_READ';
const IMAGE_PHASES = new Set(['BEFORE', 'DURING', 'AFTER', 'FOLLOW_UP']);
const IMAGE_TYPES = new Set(['CLINICAL', 'DERMOSCOPY']);
const IMAGE_AUDIT_ACTIONS = new Set(['IMAGE_VIEW', 'IMAGE_VIEW_DENIED', 'IMAGE_UPLOAD', 'IMAGE_UPLOAD_DENIED', 'IMAGE_NOTE_ADD', 'IMAGE_COMPARE', 'IMAGE_HIDE', 'IMAGE_RESTORE']);

function scopedVisit(patientId: string, actor: { accountId: string; employeeId: string | null }) {
  return {
    patientId,
    employeeId: actor.employeeId ?? '',
    employee: { is: { accountId: actor.accountId } },
  };
}

function validId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 100;
}

function canManageHiddenImages(actor: { rolePermissions: Array<{ permissionCodes: string[] }> }) {
  return actor.rolePermissions.some(({ permissionCodes }) =>
    [IMAGE_READ, IMAGE_WRITE, EMR_WRITE].every((code) => permissionCodes.includes(code)),
  );
}

function canReadImageAudit(actor: { rolePermissions: Array<{ permissionCodes: string[] }> }) {
  return actor.rolePermissions.some(({ permissionCodes }) =>
    permissionCodes.includes(IMAGE_READ) && (permissionCodes.includes(AUDIT_READ) || permissionCodes.includes('audit.view')),
  );
}

export async function getTreatmentImageWorkspace(
  patientId: string,
  filters: {
    visitId?: string;
    planId?: string;
    sessionId?: string;
    phase?: string;
    imageType?: string;
    bodyArea?: string;
    from?: string;
    to?: string;
    sort?: 'newest' | 'oldest';
    showHidden?: boolean;
  } = {},
) {
  const access = await authenticateTreatmentImageAction([IMAGE_READ]);
  if (!access.success) return access;
  if (!validId(patientId)) return { success: false as const, code: 'VALIDATION_FAILED' as const, message: imageFailure('VALIDATION_FAILED'), trace: [...access.trace, 'validate:FAIL'] };

  if (
    (filters.visitId && !validId(filters.visitId)) || (filters.planId && !validId(filters.planId)) ||
    (filters.sessionId && !validId(filters.sessionId)) || (filters.phase && !IMAGE_PHASES.has(filters.phase)) ||
    (filters.imageType && !IMAGE_TYPES.has(filters.imageType)) || (filters.bodyArea && filters.bodyArea.length > 200) ||
    (filters.sort && !['newest', 'oldest'].includes(filters.sort)) ||
    (filters.showHidden !== undefined && typeof filters.showHidden !== 'boolean')
  ) return { success: false as const, code: 'VALIDATION_FAILED' as const, message: imageFailure('VALIDATION_FAILED'), trace: [...access.trace, 'validate:FAIL'] };
  const validDay = (value?: string) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (!validDay(filters.from) || !validDay(filters.to)) return { success: false as const, code: 'VALIDATION_FAILED' as const, message: imageFailure('VALIDATION_FAILED'), trace: [...access.trace, 'validate:FAIL'] };

  const patientInScope = await prisma.visit.findFirst({
    where: scopedVisit(patientId, access.actor),
    select: { patientId: true },
  });
  if (!patientInScope) return { success: false as const, code: 'FORBIDDEN_SCOPE' as const, message: imageFailure('FORBIDDEN_SCOPE'), trace: [...access.trace, 'inScope:FAIL'] };

  const from = filters.from ? new Date(`${filters.from}T00:00:00.000`) : undefined;
  const to = filters.to ? new Date(`${filters.to}T23:59:59.999`) : undefined;
  if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime())) || (from && to && from > to)) {
    return { success: false as const, code: 'VALIDATION_FAILED' as const, message: imageFailure('VALIDATION_FAILED'), trace: [...access.trace, 'validate:FAIL'] };
  }
  const canSeeHidden = canManageHiddenImages(access.actor);
  const where = {
    visit: { is: scopedVisit(patientId, access.actor) },
    ...(filters.visitId ? { visitId: filters.visitId } : {}),
    ...(filters.planId ? { planId: filters.planId } : {}),
    ...(filters.sessionId ? { sessionId: filters.sessionId } : {}),
    ...(filters.phase ? { phase: filters.phase } : {}),
    ...(filters.imageType ? { imageType: filters.imageType } : {}),
    ...(filters.bodyArea ? { bodyArea: filters.bodyArea } : {}),
    ...(from || to ? { capturedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    ...(filters.showHidden && canSeeHidden ? {} : { isHidden: false }),
  };
  const records = await prisma.treatmentImage.findMany({
    where,
    select: {
      id: true, planId: true, sessionId: true, visitId: true, imageType: true, phase: true,
      bodyArea: true, description: true, capturedAt: true, createdAt: true,
      mimeType: true, fileSizeBytes: true, isHidden: true,
      hiddenReason: canSeeHidden ? true : false, hiddenAt: canSeeHidden ? true : false,
      plan: { select: { id: true, name: true, visitId: true, patientId: true } },
      visit: { select: { patientId: true } },
      session: { select: { id: true, sessionNo: true, treatmentArea: true, visitId: true, stage: { select: { planId: true } } } },
      capturedBy: { select: { fullName: true } },
    },
    orderBy: filters.sort === 'oldest' ? [{ capturedAt: 'asc' }, { id: 'asc' }] : [{ capturedAt: 'desc' }, { id: 'desc' }],
    take: 500,
  });
  const safe = records.filter((image) =>
    image.plan.visitId === image.visitId && image.plan.patientId === image.visit.patientId &&
    (!image.session || (image.session.visitId === image.visitId && image.session.stage.planId === image.planId)),
  ).map(({ plan, visit: _visit, session, ...image }) => ({
    ...image,
    plan: { id: plan.id, name: plan.name },
    session: session ? { id: session.id, sessionNo: session.sessionNo, treatmentArea: session.treatmentArea } : null,
  }));
  return {
    success: true as const,
    data: JSON.parse(JSON.stringify(safe)),
    permissions: {
      canUpload: access.actor.rolePermissions.some(({ permissionCodes }) => permissionCodes.includes(IMAGE_READ) && permissionCodes.includes(IMAGE_WRITE)),
      canNote: access.actor.rolePermissions.some(({ permissionCodes }) => permissionCodes.includes(IMAGE_READ) && permissionCodes.includes(EMR_WRITE)),
      canHide: canSeeHidden,
      canAudit: canReadImageAudit(access.actor),
    },
    trace: [...access.trace, 'inScope:OK', 'entityCoherence:OK', 'listImages:OK'],
  };
}

export async function getTreatmentImageUploadOptions(patientId: string) {
  const access = await authenticateTreatmentImageAction([IMAGE_READ, IMAGE_WRITE]);
  if (!access.success) return access;
  if (!validId(patientId)) return { success: false as const, code: 'VALIDATION_FAILED' as const, message: imageFailure('VALIDATION_FAILED'), trace: [...access.trace, 'validate:FAIL'] };

  const visits = await prisma.visit.findMany({
    where: scopedVisit(patientId, access.actor),
    select: {
      id: true, visitDate: true, status: true,
      treatmentPlans: { select: { id: true, name: true, status: true, stages: { select: { sessions: { select: { id: true, sessionNo: true, visitId: true } } } } } },
    },
    orderBy: { visitDate: 'desc' },
  });
  if (!visits.length) return { success: false as const, code: 'FORBIDDEN_SCOPE' as const, message: imageFailure('FORBIDDEN_SCOPE'), trace: [...access.trace, 'inScope:FAIL'] };

  const templateName = process.env.EMR_IMAGE_CONSENT_TEMPLATE_NAME || 'Đồng ý lưu ảnh lâm sàng';
  const consents = await prisma.signedConsent.findMany({
    where: {
      visitId: { in: visits.map((visit) => visit.id) },
      template: { is: { name: templateName, version: 1 } },
      OR: [{ treatmentPlanId: null }, { treatmentPlanId: { in: visits.flatMap((visit) => visit.treatmentPlans.map((plan) => plan.id)) } }],
    },
    select: { visitId: true, treatmentPlanId: true, signedAt: true, audits: { select: { action: true, createdAt: true } } },
  });
  const consentPairs = consents.filter((consent) => !consent.audits.some((audit) => audit.action === 'REVOKED' && audit.createdAt >= consent.signedAt))
    .map(({ visitId, treatmentPlanId }) => `${visitId}:${treatmentPlanId ?? '*'}`);
  return {
    success: true as const,
    data: visits.map(({ treatmentPlans, ...visit }) => ({
      ...visit,
      plans: treatmentPlans.map(({ stages, ...plan }) => ({
        ...plan,
        sessions: stages.flatMap((stage) => stage.sessions).filter((session) => session.visitId === visit.id).map(({ visitId: _visitId, ...session }) => session),
        hasImageConsent: consentPairs.includes(`${visit.id}:${plan.id}`) || consentPairs.includes(`${visit.id}:*`),
      })),
    })),
    trace: [...access.trace, 'inScope:OK', 'listUploadOptions:OK'],
  };
}

export async function getTreatmentImageDetails(patientId: string, imageId: string) {
  const access = await authenticateTreatmentImageAction([IMAGE_READ]);
  if (!access.success) return access;
  if (!validId(patientId) || !validId(imageId)) return { success: false as const, code: 'VALIDATION_FAILED' as const, message: imageFailure('VALIDATION_FAILED'), trace: [...access.trace, 'validate:FAIL'] };
  const canSeeHidden = canManageHiddenImages(access.actor);
  const image = await prisma.treatmentImage.findFirst({
    where: { id: imageId, visit: { is: scopedVisit(patientId, access.actor) }, ...(canSeeHidden ? {} : { isHidden: false }) },
    select: {
      id: true, planId: true, sessionId: true, visitId: true, imageType: true, phase: true,
      bodyArea: true, description: true, capturedAt: true, createdAt: true, mimeType: true,
      fileSizeBytes: true, isHidden: true, hiddenReason: canSeeHidden,
      hiddenAt: canSeeHidden, imageUrl: true,
      plan: { select: { id: true, name: true, patientId: true, visitId: true } },
      visit: { select: { patientId: true, visitDate: true, status: true, room: { select: { name: true } }, employee: { select: { fullName: true } } } },
      session: { select: { id: true, sessionNo: true, treatmentArea: true, status: true, startedAt: true, completedAt: true, visitId: true, performedBy: { select: { fullName: true } }, stage: { select: { planId: true } } } },
      capturedBy: { select: { fullName: true } },
      notes: { orderBy: [{ version: 'desc' }], take: 100, select: { id: true, version: true, text: true, createdAt: true, author: { select: { fullName: true } } } },
    },
  });
  if (!image || image.plan.patientId !== patientId || image.plan.visitId !== image.visitId || (image.session && (image.session.visitId !== image.visitId || image.session.stage.planId !== image.planId))) {
    return { success: false as const, code: 'NOT_FOUND' as const, message: imageFailure('NOT_FOUND'), trace: [...access.trace, 'inScope:FAIL'] };
  }
  const { imageUrl: _privateStorageKey, visit, plan, session, ...safe } = image;
  return { success: true as const, data: JSON.parse(JSON.stringify({
    ...safe, visit: { ...visit, roomName: visit.room?.name ?? null, employeeName: visit.employee?.fullName ?? null, room: undefined, employee: undefined },
    plan: { id: plan.id, name: plan.name },
    session: session ? { ...session, performedByName: session.performedBy?.fullName ?? null, performedBy: undefined, stage: undefined } : null,
  })), trace: [...access.trace, 'inScope:OK', 'entityCoherence:OK', 'getImageMeta:OK'] };
}

export async function compareTreatmentImages(patientId: string, imageIds: [string, string]) {
  const access = await authenticateTreatmentImageAction([IMAGE_READ]);
  if (!access.success) return access;
  if (!validId(patientId) || !Array.isArray(imageIds) || imageIds.length !== 2 || !imageIds.every(validId) || imageIds[0] === imageIds[1]) {
    return { success: false as const, code: 'VALIDATION_FAILED' as const, message: imageFailure('VALIDATION_FAILED'), trace: [...access.trace, 'validate:FAIL'] };
  }
  const images = await prisma.treatmentImage.findMany({
    where: { id: { in: imageIds }, isHidden: false, visit: { is: scopedVisit(patientId, access.actor) } },
    select: { id: true, planId: true, visitId: true, imageType: true, phase: true, bodyArea: true, capturedAt: true, mimeType: true, fileSizeBytes: true, plan: { select: { name: true, patientId: true, visitId: true } }, session: { select: { sessionNo: true, visitId: true, stage: { select: { planId: true } } } }, capturedBy: { select: { fullName: true } } },
  });
  const byId = new Map(images.map((image) => [image.id, image]));
  const pair = imageIds.map((id) => byId.get(id));
  if (pair.some((image) => !image) || pair.some((image) => image!.plan.patientId !== patientId || image!.plan.visitId !== image!.visitId || (image!.session && (image!.session.visitId !== image!.visitId || image!.session.stage.planId !== image!.planId)))) {
    return { success: false as const, code: 'NOT_FOUND' as const, message: imageFailure('NOT_FOUND'), trace: [...access.trace, 'inScope:FAIL'] };
  }
  const [left, right] = pair as [NonNullable<typeof pair[0]>, NonNullable<typeof pair[1]>];
  const warnings: string[] = [];
  const leftArea = (left.bodyArea ?? '').trim().toLocaleLowerCase('vi-VN');
  const rightArea = (right.bodyArea ?? '').trim().toLocaleLowerCase('vi-VN');
  if (!leftArea || !rightArea || leftArea !== rightArea) warnings.push('KHAC_VUNG_DA');
  if (left.imageType !== right.imageType) warnings.push('KHAC_LOAI_ANH');
  if (left.planId !== right.planId) warnings.push('KHAC_KE_HOACH');
  const beforeAfter = left.phase === 'BEFORE' && right.phase === 'AFTER' ? [left, right] : right.phase === 'BEFORE' && left.phase === 'AFTER' ? [right, left] : null;
  if (beforeAfter && beforeAfter[0].capturedAt > beforeAfter[1].capturedAt) warnings.push('THU_TU_THOI_GIAN_NGUOC');
  await prisma.auditLog.create({ data: { accountId: access.actor.accountId, action: 'IMAGE_COMPARE', entity: 'TreatmentImage', entityId: imageIds[0] } });
  const publicPair = pair.map((image) => {
    const { plan, session, capturedBy, ...rest } = image!;
    return { ...rest, plan: { name: plan.name }, session: session ? { sessionNo: session.sessionNo } : null, capturedByName: capturedBy?.fullName ?? null };
  });
  return { success: true as const, data: { images: JSON.parse(JSON.stringify(publicPair)), warnings }, trace: [...access.trace, 'inScope:OK', 'entityCoherence:OK', 'compareImages:OK'] };
}

export async function addTreatmentImageNote(input: { patientId: string; imageId: string; text: string; expectedLatestVersion: number }) {
  const access = await authenticateTreatmentImageAction([IMAGE_READ, EMR_WRITE]);
  if (!access.success) return access;
  const text = typeof input?.text === 'string' ? input.text.trim() : '';
  if (!validId(input?.patientId) || !validId(input?.imageId) || !text || text.length > 4000 || !Number.isInteger(input.expectedLatestVersion) || input.expectedLatestVersion < 0) {
    return { success: false as const, code: 'VALIDATION_FAILED' as const, message: imageFailure('VALIDATION_FAILED'), trace: [...access.trace, 'validate:FAIL'] };
  }
  try {
    const revision = await prisma.$transaction(async (tx) => {
      const image = await tx.treatmentImage.findFirst({ where: { id: input.imageId, isHidden: false, visit: { is: scopedVisit(input.patientId, access.actor) } }, select: { id: true, description: true, notes: { select: { version: true }, orderBy: { version: 'desc' }, take: 1 } } });
      if (!image) throw new Error('NOT_FOUND');
      const currentVersion = image.notes[0]?.version ?? 0;
      if (currentVersion !== input.expectedLatestVersion) throw new Error('CONFLICT');
      const note = await tx.imageNoteRevision.create({ data: { imageId: image.id, version: currentVersion + 1, text, authorId: access.actor.employeeId! }, select: { id: true, version: true, text: true, createdAt: true } });
      await tx.treatmentImage.update({ where: { id: image.id }, data: { description: text } });
      await tx.auditLog.create({ data: { accountId: access.actor.accountId, action: 'IMAGE_NOTE_ADD', entity: 'TreatmentImage', entityId: image.id } });
      return note;
    }, { isolationLevel: 'Serializable' });
    return { success: true as const, data: JSON.parse(JSON.stringify(revision)), trace: [...access.trace, 'inScope:OK', 'addNote:OK', 'audit:OK'] };
  } catch (error) {
    const code = error instanceof Error && error.message === 'CONFLICT' ? 'CONFLICT' : error instanceof Error && error.message === 'NOT_FOUND' ? 'NOT_FOUND' : 'CONFLICT';
    return { success: false as const, code, message: imageFailure(code), trace: [...access.trace, 'addNote:FAIL'] };
  }
}

export async function setTreatmentImageHidden(input: { patientId: string; imageId: string; reason?: string; restore?: boolean }) {
  const access = await authenticateTreatmentImageAction([IMAGE_READ, IMAGE_WRITE, EMR_WRITE]);
  if (!access.success) return access;
  const reason = typeof input?.reason === 'string' ? input.reason.trim() : '';
  if (!validId(input?.patientId) || !validId(input?.imageId) || (!input.restore && (!reason || reason.length > 500))) {
    return { success: false as const, code: 'VALIDATION_FAILED' as const, message: imageFailure('VALIDATION_FAILED'), trace: [...access.trace, 'validate:FAIL'] };
  }
  const image = await prisma.treatmentImage.findFirst({ where: { id: input.imageId, visit: { is: scopedVisit(input.patientId, access.actor) } }, select: { id: true, isHidden: true } });
  if (!image) return { success: false as const, code: 'NOT_FOUND' as const, message: imageFailure('NOT_FOUND'), trace: [...access.trace, 'inScope:FAIL'] };
  if (Boolean(input.restore) === !image.isHidden) return { success: false as const, code: 'VALIDATION_FAILED' as const, message: 'Trạng thái ảnh đã được cập nhật.', trace: [...access.trace, 'validate:FAIL'] };
  const hidden = !input.restore;
  await prisma.$transaction(async (tx) => {
    await tx.treatmentImage.update({
      where: { id: image.id },
      data: hidden
        ? { isHidden: true, hiddenReason: reason, hiddenById: access.actor.employeeId, hiddenAt: new Date() }
        : { isHidden: false, hiddenReason: null, hiddenById: null, hiddenAt: null },
    });
    await tx.auditLog.create({ data: { accountId: access.actor.accountId, action: hidden ? 'IMAGE_HIDE' : 'IMAGE_RESTORE', entity: 'TreatmentImage', entityId: image.id } });
  }, { isolationLevel: 'Serializable' });
  return { success: true as const, data: { id: image.id, isHidden: hidden }, trace: [...access.trace, 'inScope:OK', hidden ? 'hideImage:OK' : 'restoreImage:OK', 'audit:OK'] };
}

export async function getTreatmentImageAudit(patientId: string, action?: string) {
  const access = await authenticateTreatmentImageAction([IMAGE_READ]);
  if (!access.success) return access;
  if (!canReadImageAudit(access.actor)) return { success: false as const, code: 'FORBIDDEN_PERMISSION' as const, message: imageFailure('FORBIDDEN_PERMISSION'), trace: [...access.trace, 'hasPermission:FAIL'] };
  if (!validId(patientId)) return { success: false as const, code: 'VALIDATION_FAILED' as const, message: imageFailure('VALIDATION_FAILED'), trace: [...access.trace, 'validate:FAIL'] };
  if (action && !IMAGE_AUDIT_ACTIONS.has(action)) return { success: false as const, code: 'VALIDATION_FAILED' as const, message: imageFailure('VALIDATION_FAILED'), trace: [...access.trace, 'validate:FAIL'] };
  const imageIds = await prisma.treatmentImage.findMany({ where: { visit: { is: scopedVisit(patientId, access.actor) } }, select: { id: true } });
  const logs = await prisma.auditLog.findMany({
    where: { entity: 'TreatmentImage', entityId: { in: [...imageIds.map(({ id }) => id), patientId] }, ...(action ? { action } : {}) },
    select: { id: true, accountId: true, action: true, entity: true, entityId: true, ipAddress: true, createdAt: true, account: { select: { username: true } } },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  return { success: true as const, data: JSON.parse(JSON.stringify(logs.map(({ account, ...log }) => ({ ...log, username: account?.username ?? '—' })))), trace: [...access.trace, 'inScope:OK', 'listAuditLog:OK'] };
}
