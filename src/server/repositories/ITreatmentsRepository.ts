import type { Prisma, TreatmentPlan, TreatmentStep } from '@prisma/client';

export interface ITreatmentsRepository {
  // Treatment Plan
  getPlansByVisitId(visitId: string): Promise<TreatmentPlan[]>;
  createPlan(input: Prisma.TreatmentPlanUncheckedCreateInput): Promise<TreatmentPlan>;
  updatePlan(id: string, input: Prisma.TreatmentPlanUpdateInput): Promise<TreatmentPlan>;
  deletePlan(id: string): Promise<TreatmentPlan>;

  // Treatment Step
  getStepsByPlanId(planId: string): Promise<TreatmentStep[]>;
  createStep(input: Prisma.TreatmentStepUncheckedCreateInput): Promise<TreatmentStep>;
  updateStep(id: string, input: Prisma.TreatmentStepUpdateInput): Promise<TreatmentStep>;
  deleteStep(id: string): Promise<TreatmentStep>;
}
