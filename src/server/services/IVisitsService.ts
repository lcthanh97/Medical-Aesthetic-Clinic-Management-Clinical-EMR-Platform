import type {
  WalkInVisitDto,
  VisitItem,
  VisitListQuery,
  VisitListResponse,
  QueueSummary,
  RoomQueueItem,
  TransferRoomDto,
  CancelVisitDto,
} from '@/features/reception/visits/types/visits.types';

export interface IVisitsService {
  createWalkInVisit(dto: WalkInVisitDto, accountId?: string): Promise<VisitItem>;
  getById(id: string): Promise<VisitItem>;
  getList(query?: VisitListQuery): Promise<VisitListResponse>;
  getQueue(roomId?: string, dateString?: string, status?: string): Promise<VisitItem[]>;
  getQueueSummary(dateString?: string): Promise<QueueSummary>;
  getRooms(): Promise<RoomQueueItem[]>;
  transferRoom(visitId: string, dto: TransferRoomDto, accountId?: string): Promise<VisitItem>;
  cancelVisit(visitId: string, dto: CancelVisitDto, accountId?: string): Promise<VisitItem>;
}

