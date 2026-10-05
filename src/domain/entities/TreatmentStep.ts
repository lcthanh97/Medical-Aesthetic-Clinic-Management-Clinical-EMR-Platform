export interface TreatmentStep {
  id: string;
  stageId: string;
  procedureId?: string;
  orderNo: number;
  content: string;
  repeatCount: number;
  intervalDays?: number;
  plannedDurationMinutes?: number;
  defaultParameters?: Record<string, unknown>;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}
