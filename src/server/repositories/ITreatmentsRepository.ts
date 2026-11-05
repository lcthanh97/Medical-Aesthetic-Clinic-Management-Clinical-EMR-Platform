import type { Prisma, TreatmentPlan, TreatmentStep } from '@prisma/client';
import type { ProtocolTemplateFilters, TreatmentSessionFilters } from '@/features/treatments/schemas/treatments.schema';

export type ProtocolTemplateRecord = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  indication: string | null;
  contraindication: string | null;
  version: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: { fullName: string };
  stages: Array<{
    id: string;
    stageType: string;
    name: string;
    orderNo: number;
    goal: string | null;
    durationDays: number | null;
    notes: string | null;
    steps: Array<{
      id: string;
      orderNo: number;
      instruction: string;
      repeatCount: number;
      intervalDays: number | null;
      plannedDurationMinutes: number | null;
      procedure: { code: string; name: string; category: string } | null;
    }>;
  }>;
};

export type ProtocolTemplatePage = {
  items: ProtocolTemplateRecord[];
  total: number;
  page: number;
  pageSize: number;
  statuses: string[];
  stageTypes: string[];
};

export type TreatmentSessionListRecord = Prisma.TreatmentSessionGetPayload<{
  include: {
    visit: { select: { id: true; visitDate: true; status: true; employeeId: true; patient: { select: { id: true; patientCode: true; fullName: true } } } };
    stage: { include: { plan: { select: { id: true; name: true; status: true; patientId: true; visitId: true } } } };
    step: { select: { id: true; stageId: true; orderNo: true; content: true; status: true } };
    performedBy: { select: { id: true; fullName: true } };
  };
}>;

export type TreatmentSessionInventoryDetail = {
  sessionId: string;
  consumptions: Array<{
    id: string; actualQuantity: Prisma.Decimal; unit: string;
    medicine: { name: string } | null; supply: { name: string } | null;
  }>;
  equipmentUsages: Array<{
    id: string; startedAt: Date; endedAt: Date | null; parameters: Prisma.JsonValue;
    equipment: { name: string }; operator: { fullName: string } | null;
  }>;
};

export interface ITreatmentsRepository {
  getAssignedVisitsForEmployee(employeeId: string): Promise<Array<{
    id: string;
    visitDate: Date;
    status: string;
    patient: { id: string; patientCode: string; fullName: string };
  }>>;
  // Treatment Plan
  getPlansByVisitId(visitId: string, employeeId: string): Promise<Array<TreatmentPlan & {
    visit: { id: string; visitDate: Date; status: string; patient: { id: string; patientCode: string; fullName: string } };
    createdBy: { fullName: string };
    stages: Array<TreatmentStageWithSessions>;
  }>>;
  getTreatmentSessions(employeeId: string, filters: TreatmentSessionFilters): Promise<TreatmentSessionListRecord[]>;
  getProtocolTemplates(filters: ProtocolTemplateFilters): Promise<ProtocolTemplatePage>;
  getSessionInventoryDetails(sessionIds: string[], employeeId: string): Promise<TreatmentSessionInventoryDetail[]>;
  createPlan(input: Prisma.TreatmentPlanUncheckedCreateInput): Promise<TreatmentPlan>;
  updatePlan(id: string, input: Prisma.TreatmentPlanUpdateInput): Promise<TreatmentPlan>;
  deletePlan(id: string): Promise<TreatmentPlan>;

  // Treatment Step
  getStepsByPlanId(planId: string): Promise<TreatmentStep[]>;
  createStep(input: Prisma.TreatmentStepUncheckedCreateInput): Promise<TreatmentStep>;
  updateStep(id: string, input: Prisma.TreatmentStepUpdateInput): Promise<TreatmentStep>;
  deleteStep(id: string): Promise<TreatmentStep>;
}

type TreatmentStageWithSessions = Prisma.TreatmentStageGetPayload<{
  include: {
    steps: true;
    sessions: {
      include: {
        performedBy: { select: { fullName: true } };
        step: { select: { id: true; orderNo: true; content: true } };
      };
    };
  };
}>;
