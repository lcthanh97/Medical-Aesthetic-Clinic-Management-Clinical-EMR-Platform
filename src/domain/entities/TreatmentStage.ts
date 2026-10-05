export interface TreatmentStage {
  id: string;
  planId: string;
  stageType: 'ATTACK' | 'RECOVERY' | 'MAINTENANCE';
  name: string;
  orderNo: number;
  goal?: string;
  plannedStartDate?: Date;
  plannedEndDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SUSPENDED' | 'CANCELLED';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
