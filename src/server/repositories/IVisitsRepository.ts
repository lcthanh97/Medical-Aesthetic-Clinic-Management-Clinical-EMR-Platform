export interface VisitFilter {
  date?: string;
  roomId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface DirectVisitInput {
  patientId: string;
  roomId: string;
  visitDate: Date;
  status: string;
  reason: string;
  receptionNote?: string;
  visitType?: string;
}

export interface IVisitsRepository {
  createDirectVisit(input: DirectVisitInput): Promise<{ visit: any; queueNumber: number }>;
  findById(id: string): Promise<any | null>;
  findMany(filter?: VisitFilter): Promise<{ items: any[]; total: number }>;
  getQueue(roomId?: string, date?: Date, status?: string): Promise<any[]>;
  getQueueSummary(date?: Date): Promise<{
    totalVisits: number;
    waitingCount: number;
    examiningCount: number;
    completedCount: number;
  }>;
  getRoomsWithWaitingCount(): Promise<any[]>;
  findPatientActiveVisit(patientId: string, date: Date): Promise<any | null>;
  findRoomById(roomId: string): Promise<any | null>;
  transferRoom(visitId: string, targetRoomId: string, reason?: string): Promise<any>;
  cancelVisit(visitId: string, reason?: string): Promise<any>;
  createAudit(data: { action: string; entity: string; entityId: string; accountId?: string }): Promise<void>;
}

