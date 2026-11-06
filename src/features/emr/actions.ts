'use server';

import { cookies } from 'next/headers';
import { PrismaAuthRepository } from '@/infrastructure/database/repositories/PrismaAuthRepository';
import { PrismaEmrRepository } from '@/infrastructure/database/repositories/PrismaEmrRepository';
import { AuthService } from '@/server/services/AuthService';
import { AuthorizationService } from '@/server/policies/AuthorizationService';
import { isDoctorDemoMedicalRecordWriteAllowed, isDoctorReadEnvironment, isLocalDoctorTestDatabase } from '@/server/policies/DoctorDatabaseAccess';
import { EmrService } from '@/server/services/EmrService';
import { hasImageRead } from '@/server/services/ClinicalServicesService';
import { hasPrescriptionPermission, PRESCRIPTION_READ } from '@/server/services/PrescriptionsService';
import { revalidatePath } from 'next/cache';

const emrRepository = new PrismaEmrRepository();
const emrService = new EmrService(emrRepository);
const authService = new AuthService(new PrismaAuthRepository());
const authorization = new AuthorizationService();
const SESSION_COOKIE = 'clinic_session';
const EMR_DISABLED = 'EMR đang bị khóa cho tới khi xác minh xong policy và kiểm thử PostgreSQL cô lập.';
const EMR_DENIED = 'Không có quyền truy cập Visit này.';
const EMR_AUTHORIZATION_ENABLED = process.env.EMR_AUTHORIZATION_ENABLED === 'true';

function isLocalEmrTestDatabase(): boolean {
  return isDoctorReadEnvironment();
}

function isLocalImageTestDatabase(): boolean {
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
    if (!isDoctorReadEnvironment()) return disabled();
    const actor = await getActor();
    if (!actor?.employeeId || !authorization.hasPermission(actor, 'EMR_READ')) return EMR_AUTHORIZATION_ENABLED ? denied() : disabled();
    const data = await emrService.getList(actor.employeeId, search);
    return {
      success: true as const,
      data: JSON.parse(JSON.stringify(data)),
      // The patient-wide panel has no single Visit to authorize against. Keep its
      // edit affordance local-test-only; production demo writes are Visit-scoped.
      canWrite: isLocalDoctorTestDatabase() && authorization.hasPermission(actor, 'EMR_WRITE'),
      canReadImages: hasImageRead(actor),
      canReadPrescriptions: hasPrescriptionPermission(actor, PRESCRIPTION_READ),
      canReadTreatmentPlans: actor.rolePermissions.some(({ permissionCodes }) => permissionCodes.includes('TREATMENT_READ')),
    };
  } catch {
    return denied();
  }
}

export async function getPatientFullEMR(patientId: string) {
  try {
    if (!isDoctorReadEnvironment()) return disabled();
    const actor = await getActor();
    if (!actor?.employeeId || !authorization.hasPermission(actor, 'EMR_READ')) return EMR_AUTHORIZATION_ENABLED ? denied() : disabled();
    const data = await emrService.getPatientFullEMR(patientId, actor.employeeId, {
      prescriptions: hasPrescriptionPermission(actor, PRESCRIPTION_READ),
      treatmentPlans: actor.rolePermissions.some(({ permissionCodes }) => permissionCodes.includes('TREATMENT_READ')),
      clinicalOrders: hasImageRead(actor),
    });
    if (!data) return denied();
    return { success: true as const, data: JSON.parse(JSON.stringify(data)) };
  } catch {
    return denied();
  }
}

export async function getAssignedVisitExamination(visitId: string) {
  try {
    if (!isLocalEmrTestDatabase()) return disabled();
    const actor = await getActor();
    if (!actor) return { success: false as const, code: 'AUTH_REQUIRED' as const, error: 'Vui lòng đăng nhập lại để mở lượt khám.' };
    if (!actor.employeeId || !authorization.hasPermission(actor, 'EMR_READ')) return denied();
    const data = await emrService.getAssignedVisit(visitId, {
      accountId: actor.accountId,
      employeeId: actor.employeeId,
      sessionId: actor.sessionId,
    }, {
      prescriptions: hasPrescriptionPermission(actor, PRESCRIPTION_READ),
      treatmentPlans: false,
      clinicalOrders: hasImageRead(actor),
    });
    if (!data) return denied();
    const hasWritePermission = authorization.hasPermission(actor, 'EMR_WRITE');
    const canWrite = hasWritePermission && isDoctorDemoMedicalRecordWriteAllowed(actor, visitId);
    return {
      success: true as const,
      data: JSON.parse(JSON.stringify(data)),
      canWrite,
      writeBlockReason: canWrite ? undefined : hasWritePermission
        ? 'Lượt khám này nằm ngoài phạm vi được phép ghi trên cổng hiện tại.'
        : 'Tài khoản chưa có quyền ghi bệnh án.',
      canReadClinicalOrders: hasImageRead(actor),
      canReadPrescriptions: hasPrescriptionPermission(actor, PRESCRIPTION_READ),
    };
  } catch (error) {
    const failure = error as { name?: string; code?: string };
    console.error('[emr] examination read failed', { name: failure?.name, code: failure?.code });
    return { success: false as const, error: 'Không tải được lượt khám. Hãy thử lại sau.' };
  }
}

async function saveMedicalRecordForVerifiedActor(
  visitId: string,
  input: { preliminaryDiagnosis?: string; finalDiagnosis?: string; notes?: string },
  expected: { preliminaryDiagnosis: string | null; finalDiagnosis: string | null; notes: string | null } | null,
) {
  const actor = await getActor();
  if (!actor?.employeeId || !authorization.hasPermission(actor, 'EMR_WRITE') || !isDoctorDemoMedicalRecordWriteAllowed(actor, visitId)) {
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
  if (!isDoctorReadEnvironment()) return disabled();
  try {
    return await saveMedicalRecordForVerifiedActor(visitId, input, expected);
  } catch (error) {
    const message = error instanceof Error && error.message.includes('Ä‘Ã£ thay Ä‘á»•i')
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
    const message = error instanceof Error && error.message.includes('đã thay đổi')
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
  if (!EMR_AUTHORIZATION_ENABLED || !isLocalImageTestDatabase()) return null;
  const actor = await getActor();
  if (!actor?.employeeId || !hasImageRead(actor)) return null;
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
    if (!isLocalImageTestDatabase()) return imageActionDenied();
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
    if (!isLocalImageTestDatabase() || typeof patientId !== 'string' || !patientId.trim() || typeof imageId !== 'string' || !imageId.trim()) return imageActionDenied();
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
    if (!isLocalImageTestDatabase() || typeof patientId !== 'string' || !patientId.trim() || !Array.isArray(imageIds) || imageIds.length !== 2) return imageActionDenied();
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
