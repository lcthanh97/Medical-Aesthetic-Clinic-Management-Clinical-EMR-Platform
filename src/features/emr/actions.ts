'use server';

import { cookies } from 'next/headers';
import { PrismaAuthRepository } from '@/infrastructure/database/repositories/PrismaAuthRepository';
import { PrismaEmrRepository } from '@/infrastructure/database/repositories/PrismaEmrRepository';
import { AuthService } from '@/server/services/AuthService';
import { AuthorizationService } from '@/server/policies/AuthorizationService';
import { isDoctorEmrReadEnvironment, isDoctorReadEnvironment, isLocalDoctorTestDatabase } from '@/server/policies/DoctorDatabaseAccess';
import { EmrService } from '@/server/services/EmrService';
import { PRESCRIPTION_READ } from '@/server/services/PrescriptionsService';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/infrastructure/database/prisma';

const emrRepository = new PrismaEmrRepository();
const emrService = new EmrService(emrRepository);
const authService = new AuthService(new PrismaAuthRepository());
const authorization = new AuthorizationService();
const SESSION_COOKIE = 'clinic_session';
const EMR_DISABLED = 'EMR đang bị khóa cho tới khi xác minh xong policy và kiểm thử PostgreSQL cô lập.';
const EMR_DENIED = 'Không có quyền truy cập Visit này.';
const EMR_AUTHORIZATION_ENABLED = process.env.EMR_AUTHORIZATION_ENABLED === 'true';

function isImageFeatureEnabled(): boolean {
  return isDoctorReadEnvironment();
}

async function getActor() {
  if (!EMR_AUTHORIZATION_ENABLED || !isDoctorReadEnvironment()) return null;
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  return authService.getSession(cookie);
}

function denied() {
  return { success: false as const, error: EMR_DENIED };
}

type EmrActionFailure = { success: false; error: string; data?: any };

function disabled(): EmrActionFailure {
  return { success: false, error: EMR_DISABLED };
}

export async function getPatients(search?: string) {
  try {
    if (!isDoctorEmrReadEnvironment()) return disabled();
    const actor = await getActor();
    if (!actor?.employeeId || !authorization.hasPermission(actor, 'EMR_READ')) return EMR_AUTHORIZATION_ENABLED ? denied() : disabled();
    const data = await emrService.getList(actor.employeeId, search);
    return {
      success: true as const,
      data: JSON.parse(JSON.stringify(data)),
      // The patient-wide panel has no single Visit to authorize against. Keep its
      // edit affordance local-test-only; production demo writes are Visit-scoped.
      canWrite: isLocalDoctorTestDatabase() && authorization.hasPermission(actor, 'EMR_WRITE'),
      canReadImages: authorization.hasRolePermission(actor, 'IMAGE_READ'),
      canReadPrescriptions: authorization.hasRolePermission(actor, PRESCRIPTION_READ),
      canReadTreatmentPlans: authorization.hasRolePermission(actor, 'TREATMENT_READ'),
    };
  } catch {
    return denied();
  }
}

export async function getPatientFullEMR(patientId: string) {
  try {
    if (!isDoctorEmrReadEnvironment()) return disabled();
    const actor = await getActor();
    if (!actor?.employeeId || !authorization.hasPermission(actor, 'EMR_READ')) return EMR_AUTHORIZATION_ENABLED ? denied() : disabled();
    const data = await emrService.getPatientFullEMR(patientId, actor.employeeId, {
      prescriptions: authorization.hasRolePermission(actor, PRESCRIPTION_READ),
      treatmentPlans: authorization.hasRolePermission(actor, 'TREATMENT_READ'),
      clinicalOrders: authorization.hasRolePermission(actor, 'IMAGE_READ'),
    });
    if (!data) return denied();
    return { success: true as const, data: JSON.parse(JSON.stringify(data)) };
  } catch {
    return denied();
  }
}

export async function getAssignedVisitExamination(visitId: string) {
  try {
    if (!isDoctorEmrReadEnvironment()) return disabled();
    const actor = await getActor();
    if (!actor) return { success: false as const, code: 'AUTH_REQUIRED' as const, error: 'Vui lòng đăng nhập lại để mở lượt khám.' };
    if (!actor.employeeId || !authorization.hasPermission(actor, 'EMR_READ')) return denied();
    const hasRoleRead = (permissionCode: string) => authorization.hasRolePermission(actor, permissionCode);
    const data = await emrService.getAssignedVisit(visitId, {
      accountId: actor.accountId,
      employeeId: actor.employeeId,
      sessionId: actor.sessionId,
    }, {
      prescriptions: hasRoleRead(PRESCRIPTION_READ),
      treatmentPlans: false,
      clinicalOrders: hasRoleRead('EMR_READ'),
    }, authorization.allowedRoleNames('EMR_READ'));
    if (!data) return denied();
    const hasWritePermission = authorization.hasPermission(actor, 'EMR_WRITE');
    const canWrite = authorization.canWriteVisit(actor, data.employeeId, data.status);
    const canSupplementNotes = authorization.canSupplementVisit(actor, data.employeeId, data.status);
    const canStartVisit = hasWritePermission && data.employeeId === actor.employeeId && ['WAITING', 'CHECKED_IN'].includes(data.status);
    const safeData = JSON.parse(JSON.stringify(data));
    for (const order of safeData.orders ?? []) {
      for (const result of order.imagingResults ?? []) {
        result.hasImage = Boolean(result.fileUrl);
        delete result.fileUrl;
      }
    }
    return {
      success: true as const,
      data: safeData,
      canWrite,
      canStartVisit,
      canSupplementNotes,
      writeBlockReason: canWrite || canSupplementNotes ? undefined : !hasWritePermission
        ? 'Tài khoản chưa có quyền ghi bệnh án trong role Bác sĩ.'
        : data.status === 'COMPLETED'
          ? 'Visit đã hoàn tất; bệnh án chỉ được xem.'
          : 'Chỉ Visit đang khám mới cho phép sửa chẩn đoán và ghi chú.',
      canReadClinicalOrders: hasRoleRead('EMR_READ'),
      canManageClinicalOrders: hasWritePermission,
      canReadPrescriptions: hasRoleRead(PRESCRIPTION_READ),
    };
  } catch (error) {
    const failure = error as { name?: string; code?: string };
    console.error('[emr] examination read failed', { name: failure?.name, code: failure?.code });
    return { success: false as const, error: 'Không tải được lượt khám. Hãy thử lại sau.' };
  }
}

export async function startAssignedVisit(visitId: string) {
  if (!isDoctorEmrReadEnvironment()) return { success: false as const, error: EMR_DISABLED };
  const actor = await getActor();
  if (!actor?.employeeId || !authorization.hasPermission(actor, 'EMR_WRITE')) return EMR_AUTHORIZATION_ENABLED ? denied() : disabled();
  if (typeof visitId !== 'string' || !visitId.trim() || visitId.length > 100) return { success: false as const, error: 'Visit không hợp lệ.' };
  try {
    await prisma.$transaction(async (tx) => {
      const now = new Date();
      const session = await tx.refreshToken.findFirst({ where: { id: actor.sessionId, accountId: actor.accountId, revokedAt: null, expiresAt: { gt: now } }, select: { id: true } });
      if (!session) throw new Error('AUTH_REQUIRED');
      const updated = await tx.visit.updateMany({
        where: {
          id: visitId,
          employeeId: actor.employeeId,
          employee: { is: { accountId: actor.accountId } },
          status: { in: ['WAITING', 'CHECKED_IN'] },
        },
        data: { status: 'IN_PROGRESS' },
      });
      if (updated.count !== 1) throw new Error('VISIT_SCOPE_OR_STATE_DENIED');
      await tx.auditLog.create({ data: { accountId: actor.accountId, action: 'VISIT_STARTED', entity: 'Visit', entityId: visitId } });
    }, { isolationLevel: 'Serializable', maxWait: 10_000, timeout: 15_000 });
    revalidatePath('/bacsi/queue'); revalidatePath('/bacsi/examination'); revalidatePath('/bacsi');
    return { success: true as const };
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    return { success: false as const, error: code === 'AUTH_REQUIRED' ? 'Phiên đăng nhập hết hạn. Hãy đăng nhập lại.' : 'Không thể bắt đầu khám. Visit có thể không thuộc bác sĩ này hoặc trạng thái đã thay đổi.' };
  }
}

export async function completeAssignedVisit(visitId: string) {
  if (!isDoctorEmrReadEnvironment()) return { success: false as const, error: EMR_DISABLED };
  const actor = await getActor();
  if (!actor?.employeeId || !authorization.hasPermission(actor, 'EMR_WRITE') || !authorization.hasRolePermission(actor, 'PRESCRIPTION_WRITE')) return denied();
  const employeeId = actor.employeeId;
  if (typeof visitId !== 'string' || !visitId.trim() || visitId.length > 100) return { success: false as const, error: 'Visit không hợp lệ.' };
  try {
    await prisma.$transaction(async (tx) => {
      const now = new Date();
      const session = await tx.refreshToken.findFirst({ where: { id: actor.sessionId, accountId: actor.accountId, revokedAt: null, expiresAt: { gt: now } }, select: { id: true } });
      if (!session) throw new Error('AUTH_REQUIRED');
      const visit = await tx.visit.findFirst({
        where: { id: visitId, employeeId, employee: { is: { accountId: actor.accountId } } },
        select: { id: true, status: true },
      });
      if (!visit) throw new Error('VISIT_SCOPE_DENIED');
      if (!['IN_PROGRESS', 'EXAMINING'].includes(visit.status)) throw new Error('VISIT_NOT_ACTIVE');
      const prescription = await tx.prescription.findFirst({ where: { visitId, employeeId, items: { some: {} } }, select: { id: true } });
      if (!prescription) throw new Error('PRESCRIPTION_REQUIRED');
      const updated = await tx.visit.updateMany({ where: { id: visitId, employeeId, status: visit.status }, data: { status: 'COMPLETED' } });
      if (updated.count !== 1) throw new Error('VISIT_STATE_CHANGED');
      await tx.auditLog.create({ data: { accountId: actor.accountId, action: 'VISIT_COMPLETED', entity: 'Visit', entityId: visitId } });
    }, { isolationLevel: 'Serializable', maxWait: 10_000, timeout: 15_000 });
    revalidatePath('/bacsi/queue'); revalidatePath('/bacsi/examination'); revalidatePath('/bacsi'); revalidatePath('/bacsi/emr');
    return { success: true as const };
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    const message = code === 'PRESCRIPTION_REQUIRED' ? 'Cần lưu đơn thuốc có ít nhất một thuốc trước khi hoàn tất Visit.'
      : code === 'VISIT_NOT_ACTIVE' ? 'Visit không còn ở trạng thái đang khám.'
      : code === 'VISIT_STATE_CHANGED' ? 'Trạng thái Visit vừa thay đổi. Hãy tải lại trang.'
      : code === 'AUTH_REQUIRED' ? 'Phiên đăng nhập hết hạn. Hãy đăng nhập lại.' : EMR_DENIED;
    return { success: false as const, error: message };
  }
}

async function saveMedicalRecordForVerifiedActor(
  visitId: string,
  input: { preliminaryDiagnosis?: string; finalDiagnosis?: string; notes?: string },
  expected: { preliminaryDiagnosis: string | null; finalDiagnosis: string | null; notes: string | null } | null,
) {
  const actor = await getActor();
  if (!actor?.employeeId || !authorization.hasPermission(actor, 'EMR_WRITE')) {
    return EMR_AUTHORIZATION_ENABLED ? denied() : disabled();
  }
  const data = await emrService.saveMedicalRecord(
    visitId,
    { accountId: actor.accountId, employeeId: actor.employeeId, sessionId: actor.sessionId },
    authorization.allowedRoleNames('EMR_WRITE'),
    input,
    expected,
  );
  revalidatePath('/emr');
  revalidatePath('/bacsi/emr');
  revalidatePath('/bacsi/examination');
  return { success: true as const, data: JSON.parse(JSON.stringify(data)) };
}

export async function saveExaminationMedicalRecord(
  visitId: string,
  input: { preliminaryDiagnosis?: string; finalDiagnosis?: string; notes?: string },
  expected: { preliminaryDiagnosis: string | null; finalDiagnosis: string | null; notes: string | null } | null,
) {
  if (!isDoctorEmrReadEnvironment()) return disabled();
  try {
    return await saveMedicalRecordForVerifiedActor(visitId, input, expected);
  } catch (error) {
    const message = error instanceof Error && (error.message.includes('\u0111\u00e3 thay \u0111\u1ed5i') || error.message.includes('\u0111\u00e3 \u0111\u01b0\u1ee3c t\u1ea1o \u1edf n\u01a1i kh\u00e1c'))
      ? error.message
      : EMR_DENIED;
    return { success: false as const, error: message };
  }
}

export async function saveMedicalRecord(
  visitId: string,
  input: { preliminaryDiagnosis?: string; finalDiagnosis?: string; notes?: string },
  expected: { preliminaryDiagnosis: string | null; finalDiagnosis: string | null; notes: string | null } | null
) {
  try {
    return await saveMedicalRecordForVerifiedActor(visitId, input, expected);
  } catch (error) {
    const message = error instanceof Error && (error.message.includes('\u0111\u00e3 thay \u0111\u1ed5i') || error.message.includes('\u0111\u00e3 \u0111\u01b0\u1ee3c t\u1ea1o \u1edf n\u01a1i kh\u00e1c'))
      ? error.message
      : EMR_DENIED;
    return { success: false as const, error: message };
  }
}

function validImageFilter(value: unknown): value is string | undefined {
  return value === undefined || (typeof value === 'string' && value.length <= 200 && value.trim().length > 0);
}

function imageActionDenied() {
  return { success: false as const, error: 'Không thể tải hình ảnh trong phạm vi được phép.' };
}

function withoutPrivateImageUrls<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => withoutPrivateImageUrls(item)) as T;
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== 'imageUrl')
      .map(([key, child]) => [key, withoutPrivateImageUrls(child)]),
  ) as T;
}

async function getImageActor() {
  if (!EMR_AUTHORIZATION_ENABLED || !isImageFeatureEnabled()) return null;
  const actor = await getActor();
  if (!actor?.employeeId || !authorization.hasPermission(actor, 'EMR_READ') || !authorization.hasRolePermission(actor, 'IMAGE_READ')) return null;
  return actor;
}

export async function getTreatmentImageTimeline(
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
  } = {},
) {
  try {
    if (!isImageFeatureEnabled()) return imageActionDenied();
    if (typeof patientId !== 'string' || !patientId.trim() || !filters || typeof filters !== 'object') return imageActionDenied();
    const textFilters = [filters.visitId, filters.planId, filters.sessionId, filters.phase, filters.imageType, filters.bodyArea];
    if (textFilters.some((value) => !validImageFilter(value))) return imageActionDenied();
    const dates = [filters.from, filters.to];
    if (dates.some((value) => value !== undefined && (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T[^ ]+)?$/.test(value) || Number.isNaN(Date.parse(value))))) return imageActionDenied();
    if (filters.from && filters.to && new Date(filters.from) > new Date(filters.to)) return imageActionDenied();
    const actor = await getImageActor();
    if (!actor?.employeeId) return imageActionDenied();
    const data = await emrService.getTreatmentImageTimeline(
      patientId,
      { accountId: actor.accountId, employeeId: actor.employeeId, sessionId: actor.sessionId },
      filters,
    );
    return { success: true as const, data: JSON.parse(JSON.stringify(withoutPrivateImageUrls(data))) };
  } catch {
    return imageActionDenied();
  }
}

export async function getTreatmentImageDetails(patientId: string, imageId: string) {
  try {
    if (!isImageFeatureEnabled() || typeof patientId !== 'string' || !patientId.trim() || typeof imageId !== 'string' || !imageId.trim()) return imageActionDenied();
    const actor = await getImageActor();
    if (!actor?.employeeId) return imageActionDenied();
    const data = await emrService.getTreatmentImageDetails(
      patientId, imageId,
      { accountId: actor.accountId, employeeId: actor.employeeId, sessionId: actor.sessionId },
    );
    if (!data) return imageActionDenied();
    return { success: true as const, data: JSON.parse(JSON.stringify(withoutPrivateImageUrls(data))) };
  } catch {
    return imageActionDenied();
  }
}

export async function compareTreatmentImages(patientId: string, imageIds: [string, string]) {
  try {
    if (!isImageFeatureEnabled() || typeof patientId !== 'string' || !patientId.trim() || !Array.isArray(imageIds) || imageIds.length !== 2) return imageActionDenied();
    const actor = await getImageActor();
    if (!actor?.employeeId) return imageActionDenied();
    const data = await emrService.compareTreatmentImages(
      patientId, imageIds,
      { accountId: actor.accountId, employeeId: actor.employeeId, sessionId: actor.sessionId },
    );
    if (!data) return imageActionDenied();
    const [left, right] = data;
    const leftArea = left.bodyArea?.trim().toLocaleLowerCase('vi-VN');
    const rightArea = right.bodyArea?.trim().toLocaleLowerCase('vi-VN');
    const sameArea = Boolean(leftArea && rightArea && leftArea === rightArea);
    return {
      success: true as const,
      data: JSON.parse(JSON.stringify(withoutPrivateImageUrls({ images: data, sameBodyArea: sameArea }))),
    };
  } catch {
    return imageActionDenied();
  }
}

// Patient-wide edits, allergy/history, and visit creation do not have an approved policy yet.
export async function createPatient(_input: { fullName: string; phone?: string; dateOfBirth?: string }) {
  return disabled();
}

export async function updatePatient(_id: string, _input: { fullName?: string; phone?: string; dateOfBirth?: string }) {
  return disabled();
}

export async function addPatientAllergy(_patientId: string, _input: { substance: string; severity?: string; reaction?: string }) {
  return disabled();
}

export async function addPatientHistory(_patientId: string, _input: { type: string; content: string }) {
  return disabled();
}

export async function createQuickVisit(
  _patientId: string,
  _input: { preliminaryDiagnosis?: string; finalDiagnosis?: string; notes?: string; employeeId?: string; roomId?: string }
) {
  return disabled();
}
