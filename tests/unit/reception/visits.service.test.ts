import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VisitsService } from '../../../src/server/services/VisitsService';
import type { IVisitsRepository } from '../../../src/server/repositories/IVisitsRepository';
import { DomainError } from '../../../src/domain/errors/DomainError';

describe('REC-02 VisitsService Unit Tests (Tiếp nhận trực tiếp & Quản lý Hàng đợi)', () => {
  let mockRepository: IVisitsRepository;
  let service: VisitsService;

  beforeEach(() => {
    mockRepository = {
      createDirectVisit: vi.fn(),
      findById: vi.fn(),
      findMany: vi.fn(),
      getQueue: vi.fn(),
      getQueueSummary: vi.fn(),
      getRoomsWithWaitingCount: vi.fn(),
      findPatientActiveVisit: vi.fn(),
      findRoomById: vi.fn(),
      transferRoom: vi.fn(),
      cancelVisit: vi.fn(),
      createAudit: vi.fn(),
    };
    service = new VisitsService(mockRepository);
  });

  it('nên tạo lượt khám trực tiếp tại quầy thành công và cấp số thứ tự (STT)', async () => {
    vi.mocked(mockRepository.findRoomById).mockResolvedValue({
      id: 'room-01',
      name: 'Phòng khám Da liễu 1',
    });
    vi.mocked(mockRepository.findPatientActiveVisit).mockResolvedValue(null);

    const mockCreated = {
      id: 'visit-123456',
      patientId: 'patient-01',
      roomId: 'room-01',
      visitDate: new Date('2026-11-02T09:00:00Z'),
      status: 'WAITING',
      patient: {
        id: 'patient-01',
        patientCode: 'BN001',
        fullName: 'Nguyễn Thị Lan Anh',
        phone: '0901234567',
        dateOfBirth: new Date('1996-04-24'),
      },
      room: {
        id: 'room-01',
        name: 'Phòng khám Da liễu 1',
      },
      medicalRecord: {
        notes: JSON.stringify({
          reason: 'Mụn viêm bọc tái phát',
          receptionNote: 'Khách đến trực tiếp tại quầy',
          visitType: 'NEW',
          queueNumber: 4,
        }),
      },
    };

    vi.mocked(mockRepository.createDirectVisit).mockResolvedValue({
      visit: mockCreated,
      queueNumber: 4,
    });

    const result = await service.createWalkInVisit({
      patientId: 'patient-01',
      roomId: 'room-01',
      visitType: 'NEW',
      reason: 'Mụn viêm bọc tái phát',
      receptionNote: 'Khách đến trực tiếp tại quầy',
    });

    expect(result.id).toBe('visit-123456');
    expect(result.queueNumber).toBe(4);
    expect(result.patientName).toBe('Nguyễn Thị Lan Anh');
    expect(result.status).toBe('WAITING');
    expect(result.reason).toBe('Mụn viêm bọc tái phát');
    expect(mockRepository.createAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: expect.stringContaining('CREATE_WALK_IN_VISIT'),
        entity: 'Visit',
        entityId: 'visit-123456',
      })
    );
  });

  it('nên ném ROOM_NOT_FOUND nếu phòng khám tiếp nhận không tồn tại', async () => {
    vi.mocked(mockRepository.findRoomById).mockResolvedValue(null);

    await expect(
      service.createWalkInVisit({
        patientId: 'patient-01',
        roomId: 'non-existent-room',
        reason: 'Đau da ngứa',
      })
    ).rejects.toThrow(DomainError);

    await expect(
      service.createWalkInVisit({
        patientId: 'patient-01',
        roomId: 'non-existent-room',
        reason: 'Đau da ngứa',
      })
    ).rejects.toMatchObject({ code: 'ROOM_NOT_FOUND' });
  });

  it('nên ném DUPLICATE_ACTIVE_VISIT nếu bệnh nhân đã có lượt khám đang chờ trong ngày', async () => {
    vi.mocked(mockRepository.findRoomById).mockResolvedValue({
      id: 'room-01',
      name: 'Phòng 1',
    });
    vi.mocked(mockRepository.findPatientActiveVisit).mockResolvedValue({
      id: 'visit-existing',
      room: { name: 'Phòng Laser' },
    });

    await expect(
      service.createWalkInVisit({
        patientId: 'patient-01',
        roomId: 'room-01',
        reason: 'Khám thêm mụn',
      })
    ).rejects.toMatchObject({ code: 'DUPLICATE_ACTIVE_VISIT' });
  });

  it('nên ném VISIT_NOT_FOUND khi không tìm thấy thông tin lượt khám theo id', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    await expect(service.getById('non-existent-visit-id')).rejects.toMatchObject({
      code: 'VISIT_NOT_FOUND',
    });
  });

  it('nên điều chuyển phòng khám thành công cho lượt khám đang ở trạng thái WAITING', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue({
      id: 'visit-01',
      status: 'WAITING',
      roomId: 'room-01',
      visitDate: new Date(),
      patient: { fullName: 'Trần Văn B' },
      room: { name: 'Phòng 1' },
    });

    vi.mocked(mockRepository.findRoomById).mockResolvedValue({
      id: 'room-02',
      name: 'Phòng 2',
    });

    vi.mocked(mockRepository.transferRoom).mockResolvedValue({
      id: 'visit-01',
      status: 'WAITING',
      roomId: 'room-02',
      visitDate: new Date(),
      patient: { fullName: 'Trần Văn B' },
      room: { name: 'Phòng 2' },
      medicalRecord: {
        notes: JSON.stringify({ transferReason: 'Giảm tải phòng 1' }),
      },
    });

    const result = await service.transferRoom('visit-01', {
      targetRoomId: 'room-02',
      reason: 'Giảm tải phòng 1',
    });

    expect(result.roomId).toBe('room-02');
    expect(mockRepository.transferRoom).toHaveBeenCalledWith('visit-01', 'room-02', 'Giảm tải phòng 1');
  });

  it('nên ném CANNOT_TRANSFER_VISIT nếu lượt khám đã bắt đầu khám (EXAMINING)', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue({
      id: 'visit-01',
      status: 'EXAMINING',
      roomId: 'room-01',
    });

    await expect(
      service.transferRoom('visit-01', { targetRoomId: 'room-02' })
    ).rejects.toMatchObject({ code: 'CANNOT_TRANSFER_VISIT' });
  });

  it('nên ném SAME_ROOM_TRANSFER nếu chọn chuyển sang cùng phòng hiện tại', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue({
      id: 'visit-01',
      status: 'WAITING',
      roomId: 'room-01',
    });

    await expect(
      service.transferRoom('visit-01', { targetRoomId: 'room-01' })
    ).rejects.toMatchObject({ code: 'SAME_ROOM_TRANSFER' });
  });

  it('nên hủy lượt khám thành công khi đang ở trạng thái WAITING', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue({
      id: 'visit-01',
      status: 'WAITING',
      roomId: 'room-01',
      patient: { fullName: 'Lê Văn C' },
      room: { name: 'Phòng 1' },
      visitDate: new Date(),
    });

    vi.mocked(mockRepository.cancelVisit).mockResolvedValue({
      id: 'visit-01',
      status: 'CANCELLED',
      roomId: 'room-01',
      patient: { fullName: 'Lê Văn C' },
      room: { name: 'Phòng 1' },
      visitDate: new Date(),
    });

    const res = await service.cancelVisit('visit-01', { reason: 'Khách bận về gấp' });

    expect(res.status).toBe('CANCELLED');
    expect(mockRepository.cancelVisit).toHaveBeenCalledWith('visit-01', 'Khách bận về gấp');
  });

  it('nên ném CANNOT_CANCEL_VISIT nếu lượt khám đã hoàn tất (COMPLETED)', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue({
      id: 'visit-01',
      status: 'COMPLETED',
      roomId: 'room-01',
    });

    await expect(
      service.cancelVisit('visit-01', { reason: 'Muốn hủy' })
    ).rejects.toMatchObject({ code: 'CANNOT_CANCEL_VISIT' });
  });
});

