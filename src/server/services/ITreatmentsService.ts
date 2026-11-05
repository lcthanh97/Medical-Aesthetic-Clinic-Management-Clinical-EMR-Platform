import type { Prisma, TreatmentPlan, TreatmentStep } from '@prisma/client';
import type { ProtocolTemplateFilters, TreatmentSessionFilters } from '@/features/treatments/schemas/treatments.schema';
import type { ProtocolTemplatePage, TreatmentSessionInventoryDetail, TreatmentSessionListRecord } from '@/server/repositories/ITreatmentsRepository';
import type { AuthActor } from './AuthService';

export interface ITreatmentsService {
  getAssignedVisits(actor: AuthActor): Promise<Array<{
    id: string;
    visitDate: Date;
    status: string;
    patient: { id: string; patientCode: string; fullName: string };
  }>>;
  // Treatment Plan
  getPlansByVisitId(visitId: string, actor: AuthActor): Promise<Array<TreatmentPlan & {
    visit: { id: string; visitDate: Date; status: string; patient: { id: string; patientCode: string; fullName: string } };
    createdBy: { fullName: string };
    stages: Array<any>;
  }>>;
  getTreatmentSessions(actor: AuthActor, filters: TreatmentSessionFilters): Promise<TreatmentSessionListRecord[]>;
  getProtocolTemplates(actor: AuthActor, filters: ProtocolTemplateFilters): Promise<ProtocolTemplatePage>;
  getSessionInventoryDetails(actor: AuthActor, sessionIds: string[]): Promise<TreatmentSessionInventoryDetail[]>;
  createPlan(input: Prisma.TreatmentPlanUncheckedCreateInput): Promise<TreatmentPlan>;
  updatePlan(id: string, input: Prisma.TreatmentPlanUpdateInput): Promise<TreatmentPlan>;
  deletePlan(id: string): Promise<TreatmentPlan>;

  // Treatment Step
  getStepsByStageId(stageId: string): Promise<TreatmentStep[]>;
  createStep(input: Prisma.TreatmentStepUncheckedCreateInput): Promise<TreatmentStep>;
  updateStep(id: string, input: Prisma.TreatmentStepUpdateInput): Promise<TreatmentStep>;
  deleteStep(id: string): Promise<TreatmentStep>;
}
