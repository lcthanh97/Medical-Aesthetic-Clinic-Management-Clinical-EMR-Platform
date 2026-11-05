import type { ITreatmentsRepository } from '@/server/repositories/ITreatmentsRepository';
import type { ITreatmentsService } from './ITreatmentsService';
import type { Prisma } from '@prisma/client';

export class TreatmentsService implements ITreatmentsService {
  constructor(private readonly repository: ITreatmentsRepository) {}

  // Treatment Plan
  getPlansByVisitId(visitId: string) {
    return this.repository.getPlansByVisitId(visitId);
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
