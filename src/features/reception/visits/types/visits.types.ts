export type VisitQueueStatus = 'WAITING' | 'EXAMINING' | 'COMPLETED' | 'CANCELLED';

export type VisitType = 'NEW' | 'RE_EXAMINATION' | 'AESTHETIC';

export interface RoomQueueItem {
  id: string;
  name: string;
  departmentId?: string;
  departmentName?: string;
  waitingCount: number;
}

export interface WalkInVisitDto {
  patientId: string;
  roomId: string;
  visitType?: VisitType | string;
  reason: string;
  receptionNote?: string;
}

export interface TransferRoomDto {
  targetRoomId: string;
  reason?: string;
}

export interface CancelVisitDto {
  reason?: string;
}

export interface VisitItem {
  id: string;
  visitCode: string;
  queueNumber: number;
  patientId: string;
  patientCode: string;
  patientName: string;
  patientPhone?: string | null;
  patientDob?: string | null;
  roomId: string;
  roomName: string;
  visitType: string;
  reason: string;
  receptionNote?: string | null;
  status: VisitQueueStatus;
  visitDate: string; // ISO string
  checkInTime: string; // HH:mm
}

export interface QueueSummary {
  totalVisits: number;
  waitingCount: number;
  examiningCount: number;
  completedCount: number;
}

export interface VisitListQuery {
  date?: string; // YYYY-MM-DD
  roomId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface VisitListResponse {
  items: VisitItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

