import type { ITreatmentsRepository } from '@/server/repositories/ITreatmentsRepository';
import type { ITreatmentsService } from './ITreatmentsService';
import type { Prisma } from '@prisma/client';
import type { AuthActor } from './AuthService';
import type { ProtocolTemplateFilters, TreatmentSessionFilters } from '@/features/treatments/schemas/treatments.schema';

export function hasAssignedTreatmentRead(actor: AuthActor): boolean {
  if (!actor.accountId || !actor.employeeId || !actor.sessionId) return false;
  return actor.rolePermissions.some(({ permissionCodes }) =>
    permissionCodes.includes('EMR_READ') && permissionCodes.includes('TREATMENT_READ'),
  );
}

export function hasTreatmentInventoryRead(actor: AuthActor): boolean {
  if (!actor.accountId || !actor.employeeId || !actor.sessionId) return false;
  return actor.rolePermissions.some(({ permissionCodes }) =>
    permissionCodes.includes('EMR_READ') && permissionCodes.includes('TREATMENT_READ') && permissionCodes.includes('INVENTORY_READ'),
  );
}

function assertAssignedTreatmentRead(actor: AuthActor): asserts actor is AuthActor & { employeeId: string } {
  if (!hasAssignedTreatmentRead(actor)) throw new Error('TREATMENT_ACCESS_DENIED');
}

export class TreatmentsService implements ITreatmentsService {
  constructor(private readonly repository: ITreatmentsRepository) {}

  // Treatment Plan
  getAssignedVisits(actor: AuthActor) {
    assertAssignedTreatmentRead(actor);
    return this.repository.getAssignedVisitsForEmployee(actor.employeeId);
  }

  getPlansByVisitId(visitId: string, actor: AuthActor) {
    assertAssignedTreatmentRead(actor);
    return this.repository.getPlansByVisitId(visitId, actor.employeeId);
  }

  getTreatmentSessions(actor: AuthActor, filters: TreatmentSessionFilters) {
    assertAssignedTreatmentRead(actor);
    return this.repository.getTreatmentSessions(actor.employeeId, filters);
  }

  getProtocolTemplates(actor: AuthActor, filters: ProtocolTemplateFilters) {
    assertAssignedTreatmentRead(actor);
    return this.repository.getProtocolTemplates(filters);
  }

  getSessionInventoryDetails(actor: AuthActor, sessionIds: string[]) {
    assertAssignedTreatmentRead(actor);
    if (!hasTreatmentInventoryRead(actor)) throw new Error('TREATMENT_INVENTORY_ACCESS_DENIED');
    return this.repository.getSessionInventoryDetails(sessionIds, actor.employeeId);
  }

  createPlan(input: Prisma.TreatmentPlanUncheckedCreateInput) {
    return this.repository.createPlan(input);
  }

  updatePlan(id: string, input: Prisma.TreatmentPlanUpdateInput) {
    return this.repository.updatePlan(id, input);
  }

  deletePlan(id: string) {
    return this.repository.deletePlan(id);
  }

  // Treatment Step
  getStepsByStageId(stageId: string) {
    return this.repository.getStepsByPlanId(stageId);
  }

  async createStep(input: Prisma.TreatmentStepUncheckedCreateInput) {
    const existingSteps = await this.repository.getStepsByPlanId(input.stageId);
    if (existingSteps.some(step => step.orderNo === input.orderNo)) {
      throw new Error(`Bước điều trị có số thứ tự (STT) ${input.orderNo} đã tồn tại trong phác đồ này.`);
    }
    return this.repository.createStep(input);
  }

  updateStep(id: string, input: Prisma.TreatmentStepUpdateInput) {
    return this.repository.updateStep(id, input);
  }

  deleteStep(id: string) {
    return this.repository.deleteStep(id);
  }
}
