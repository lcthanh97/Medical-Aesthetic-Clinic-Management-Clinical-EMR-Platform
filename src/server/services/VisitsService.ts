import type { IVisitsRepository } from '@/server/repositories/IVisitsRepository';
import type { IVisitsService } from './IVisitsService';
import { VisitsMapper } from '@/server/mappers/VisitsMapper';
import { DomainError } from '@/domain/errors/DomainError';
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

export class VisitsService implements IVisitsService {
  constructor(private readonly repository: IVisitsRepository) {}

  async createWalkInVisit(dto: WalkInVisitDto, accountId?: string): Promise<VisitItem> {
    const visitDate = new Date();

    // 1. Kiểm tra phòng khám tồn tại
    const room = await this.repository.findRoomById(dto.roomId);
    if (!room) {
      throw new DomainError('Phòng khám được chọn không tồn tại trên hệ thống', 'ROOM_NOT_FOUND');
    }

    // 2. Kiểm tra bệnh nhân đã có lượt khám đang chờ hoặc đang khám trong ngày chưa (chặn trùng)
    const activeVisit = await this.repository.findPatientActiveVisit(dto.patientId, visitDate);
    if (activeVisit) {
      throw new DomainError(
        `Bệnh nhân hiện đang có lượt khám chưa hoàn tất tại ${activeVisit.room?.name || 'phòng khám'}. Vui lòng kiểm tra lại hàng đợi.`,
        'DUPLICATE_ACTIVE_VISIT'
      );
    }

    // 3. Tạo lượt khám và cấp STT tự động trong transaction
    const { visit, queueNumber } = await this.repository.createDirectVisit({
      patientId: dto.patientId,
      roomId: dto.roomId,
      visitDate,
      status: 'WAITING',
      reason: dto.reason,
      receptionNote: dto.receptionNote,
      visitType: dto.visitType || 'NEW',
    });

    // 4. Ghi vết kiểm toán y khoa
    await this.repository.createAudit({
      action: `CREATE_WALK_IN_VISIT: Room ${dto.roomId}, STT #${queueNumber}`,
      entity: 'Visit',
      entityId: visit.id,
      accountId,
    });

    return VisitsMapper.toVisitItem(visit, queueNumber);
  }

  async getById(id: string): Promise<VisitItem> {
    const visit = await this.repository.findById(id);
    if (!visit) {
      throw new DomainError(`Không tìm thấy thông tin lượt khám: ${id}`, 'VISIT_NOT_FOUND');
    }
    return VisitsMapper.toVisitItem(visit);
  }

  async getList(query?: VisitListQuery): Promise<VisitListResponse> {
    const page = query?.page && query.page > 0 ? Number(query.page) : 1;
    const limit = query?.limit && query.limit > 0 ? Number(query.limit) : 20;

    const { items, total } = await this.repository.findMany({
      date: query?.date,
      roomId: query?.roomId,
      status: query?.status,
      search: query?.search,
      page,
      limit,
    });

    const mapped = items.map((v, idx) => VisitsMapper.toVisitItem(v, idx + 1));
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: mapped,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getQueue(roomId?: string, dateString?: string, status?: string): Promise<VisitItem[]> {
    const date = dateString ? new Date(dateString) : new Date();
    const visits = await this.repository.getQueue(roomId, date, status);

    return visits.map((v, idx) => VisitsMapper.toVisitItem(v, idx + 1));
  }

  async getQueueSummary(dateString?: string): Promise<QueueSummary> {
    const date = dateString ? new Date(dateString) : new Date();
    return this.repository.getQueueSummary(date);
  }

  async getRooms(): Promise<RoomQueueItem[]> {
    const rooms = await this.repository.getRoomsWithWaitingCount();
    if (rooms && rooms.length > 0) {
      return rooms;
    }

    // Fallback phòng mẫu nếu database chưa khởi tạo
    return [
      { id: 'room-01', name: 'Phòng khám Da liễu 1', departmentName: 'Khoa Da liễu', waitingCount: 0 },
      { id: 'room-02', name: 'Phòng khám Da liễu 2', departmentName: 'Khoa Da liễu', waitingCount: 0 },
      { id: 'room-03', name: 'Phòng Laser Thẩm Mỹ', departmentName: 'Khoa Thẩm mỹ Da', waitingCount: 0 },
      { id: 'room-04', name: 'Phòng Soi Da & Chăm Sóc', departmentName: 'Khoa Chăm sóc Da', waitingCount: 0 },
    ];
  }

  async transferRoom(visitId: string, dto: TransferRoomDto, accountId?: string): Promise<VisitItem> {
    const visit = await this.repository.findById(visitId);
    if (!visit) {
      throw new DomainError(`Không tìm thấy lượt khám: ${visitId}`, 'VISIT_NOT_FOUND');
    }

    // Chỉ cho phép chuyển phòng khi lượt khám đang chờ (WAITING)
    if (visit.status !== 'WAITING') {
      throw new DomainError(
        'Chỉ có thể điều chuyển phòng khám khi lượt khám đang ở trạng thái Chờ khám (WAITING).',
        'CANNOT_TRANSFER_VISIT'
      );
    }

    if (visit.roomId === dto.targetRoomId) {
      throw new DomainError('Phòng khám đích phải khác phòng khám hiện tại.', 'SAME_ROOM_TRANSFER');
    }

    const targetRoom = await this.repository.findRoomById(dto.targetRoomId);
    if (!targetRoom) {
      throw new DomainError('Phòng khám đích không tồn tại trên hệ thống.', 'TARGET_ROOM_NOT_FOUND');
    }

    const updated = await this.repository.transferRoom(visitId, dto.targetRoomId, dto.reason);

    await this.repository.createAudit({
      action: `TRANSFER_ROOM: Visit ${visitId} -> Room ${dto.targetRoomId}. Lý do: ${dto.reason || 'Điều chuyển phòng'}`,
      entity: 'Visit',
      entityId: visitId,
      accountId,
    });

    return VisitsMapper.toVisitItem(updated);
  }

  async cancelVisit(visitId: string, dto: CancelVisitDto, accountId?: string): Promise<VisitItem> {
    const visit = await this.repository.findById(visitId);
    if (!visit) {
      throw new DomainError(`Không tìm thấy lượt khám: ${visitId}`, 'VISIT_NOT_FOUND');
    }

    // Không cho phép hủy lượt khám đã khám hoặc đang khám
    if (visit.status !== 'WAITING') {
      throw new DomainError(
        'Không thể hủy lượt khám đã hoặc đang diễn ra tại phòng khám.',
        'CANNOT_CANCEL_VISIT'
      );
    }

    const cancelled = await this.repository.cancelVisit(visitId, dto.reason);

    await this.repository.createAudit({
      action: `CANCEL_VISIT: Visit ${visitId}. Lý do: ${dto.reason || 'Lễ tân hủy lượt'}`,
      entity: 'Visit',
      entityId: visitId,
      accountId,
    });

    return VisitsMapper.toVisitItem(cancelled);
  }
}

