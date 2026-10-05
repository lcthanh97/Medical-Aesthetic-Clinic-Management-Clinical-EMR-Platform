export interface TreatmentPlan {
  id: string;
  patientId: string;
  visitId: string;
  protocolTemplateId?: string;
  name: string;
  diagnosisSummary?: string;
  goal?: string;
  status: 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'COMPLETED' | 'CANCELLED';
  version: number;
  createdById: string;
  startDate?: Date;
  expectedEndDate?: Date;
  completedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
