export interface TreatmentSession {
  id: string;
  stageId: string;
  stepId?: string;
  visitId: string;
  sessionNo: number;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  performedById?: string;
  treatmentArea?: string;
  clinicalNotes?: string;
  patientResponse?: string;
  adverseReaction?: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
}
