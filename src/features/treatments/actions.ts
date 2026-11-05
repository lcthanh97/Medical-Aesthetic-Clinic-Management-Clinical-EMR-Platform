'use server';

import { cookies } from 'next/headers';
import { PrismaAuthRepository } from '@/infrastructure/database/repositories/PrismaAuthRepository';
import { PrismaTreatmentsRepository } from '@/infrastructure/database/repositories/PrismaTreatmentsRepository';
import { AuthService, type AuthActor } from '@/server/services/AuthService';
import { AuthorizationService } from '@/server/policies/AuthorizationService';
import { isDoctorReadEnvironment } from '@/server/policies/DoctorDatabaseAccess';
import { TreatmentsService, hasAssignedTreatmentRead, hasTreatmentInventoryRead } from '@/server/services/TreatmentsService';
import { ProtocolTemplateFiltersSchema, TreatmentSessionFiltersSchema } from './schemas/treatments.schema';
import type { Employee, TreatmentPlan, TreatmentStep } from '@prisma/client';

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

const service = new TreatmentsService(new PrismaTreatmentsRepository());
const authService = new AuthService(new PrismaAuthRepository());
const authorization = new AuthorizationService();
const SESSION_COOKIE = 'clinic_session';
const ACCESS_DENIED = 'Không có quyền truy cập phác đồ của lượt khám này.';
const WRITES_DISABLED = 'Thao tác ghi phác đồ và buổi điều trị đang khóa vì chưa có quyền TREATMENT_WRITE được xác minh.';

function isLocalTreatmentTestDatabase(): boolean {
  return isDoctorReadEnvironment();
}

async function getActor(): Promise<AuthActor | null> {
  if (!isLocalTreatmentTestDatabase()) return null;
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  return authService.getSession(cookie);
}

function canReadTreatment(actor: AuthActor | null): actor is AuthActor & { employeeId: string } {
  return Boolean(
    actor?.employeeId &&
    authorization.hasPermission(actor, 'EMR_READ') &&
    hasAssignedTreatmentRead(actor),
  );
}

function denied() {
  return { success: false as const, error: ACCESS_DENIED };
}

function blockedWrite<T>(): ActionResult<T> {
  return { success: false as const, error: WRITES_DISABLED };
}

export async function getAssignedTreatmentVisits() {
  try {
    const actor = await getActor();
    if (!canReadTreatment(actor)) return denied();
    const data = await service.getAssignedVisits(actor);
    return { success: true as const, data: JSON.parse(JSON.stringify(data)) };
  } catch {
    return denied();
  }
}

export async function getPlansByVisitId(visitId: string) {
  try {
    if (typeof visitId !== 'string' || !visitId.trim() || visitId.length > 100) return denied();
    const actor = await getActor();
    if (!canReadTreatment(actor)) return denied();
    const data = await service.getPlansByVisitId(visitId, actor);
    return { success: true as const, data: JSON.parse(JSON.stringify(data)) };
  } catch {
    return denied();
  }
}

export async function getTreatmentSessions(filters: unknown = {}) {
  try {
    const parsed = TreatmentSessionFiltersSchema.safeParse(filters);
    if (!parsed.success) return denied();
    const actor = await getActor();
    if (!canReadTreatment(actor)) return denied();
    const sessions = await service.getTreatmentSessions(actor, parsed.data);
    const inventoryDetails = hasTreatmentInventoryRead(actor)
      ? await service.getSessionInventoryDetails(actor, sessions.map(({ id }) => id))
      : [];
    return {
      success: true as const,
      data: JSON.parse(JSON.stringify({ sessions, inventoryDetails, canReadInventory: hasTreatmentInventoryRead(actor) })),
    };
  } catch {
    return denied();
  }
}

export async function getTreatmentProtocolTemplates(filters: unknown = {}) {
  try {
    const parsed = ProtocolTemplateFiltersSchema.safeParse(filters);
    if (!parsed.success) return denied();
    const actor = await getActor();
    if (!canReadTreatment(actor)) return denied();
    const data = await service.getProtocolTemplates(actor, parsed.data);
    return { success: true as const, data: JSON.parse(JSON.stringify(data)) };
  } catch {
    return denied();
  }
}

// Treatment write actions remain exported for source compatibility, but fail closed until
// a TREATMENT_WRITE permission and approved treatment workflow are available.
export async function getEmployees(): Promise<ActionResult<Employee[]>> { return blockedWrite(); }
export async function createPlan(_input: unknown): Promise<ActionResult<TreatmentPlan>> { return blockedWrite(); }
export async function updatePlan(_id: string, _input: unknown): Promise<ActionResult<TreatmentPlan>> { return blockedWrite(); }
export async function deletePlan(_id: string): Promise<ActionResult<TreatmentPlan>> { return blockedWrite(); }
export async function getStepsByStageId(_stageId: string): Promise<ActionResult<TreatmentStep[]>> { return blockedWrite(); }
export async function createStep(_input: unknown): Promise<ActionResult<TreatmentStep>> { return blockedWrite(); }
export async function updateStep(_id: string, _input: unknown): Promise<ActionResult<TreatmentStep>> { return blockedWrite(); }
export async function deleteStep(_id: string): Promise<ActionResult<TreatmentStep>> { return blockedWrite(); }
export async function checkMedicineInteractions(_visitId: string, _medicineIds: string[]): Promise<ActionResult<unknown[]>> { return blockedWrite(); }
export async function getAllMedicines(): Promise<ActionResult<Array<{ id: string; name: string }>>> { return blockedWrite(); }
export async function getAllSupplies(): Promise<ActionResult<Array<{ id: string; name: string }>>> { return blockedWrite(); }
export async function completeStepWithInventoryDeduction(_input: unknown): Promise<ActionResult<{ totalItemsDeducted: number }>> { return blockedWrite(); }
