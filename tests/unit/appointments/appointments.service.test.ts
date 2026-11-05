import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppointmentsService } from '../../../src/server/services/AppointmentsService';
import { AppointmentsValidator } from '../../../src/server/validators/AppointmentsValidator';
import type { IAppointmentsRepository } from '../../../src/server/repositories/IAppointmentsRepository';
import type { Appointment } from '@prisma/client';

describe('AppointmentsValidator - Kiểm tra logic trùng giờ & cách nhau tối thiểu 30 phút', () => {
  const baseTime = new Date('2026-10-25T10:00:00.000Z');

  it('cho phép tạo lịch hẹn khi không có lịch nào xung quanh', () => {
    const error = AppointmentsValidator.checkConflict(
      {
        scheduledAt: baseTime,
        patientId: 'patient-1',
        employeeId: 'doc-1',
        roomId: 'room-1',
      },
      []
    );
    expect(error).toBeNull();
  });

  it('chặn khi cùng Bác sĩ và trùng đúng giờ (cách nhau 0 phút)', () => {
    const existing: any[] = [
      {
        id: 'appt-1',
        scheduledAt: new Date('2026-10-25T10:00:00.000Z'),
        patientId: 'patient-2',
        employeeId: 'doc-1',
        roomId: 'room-2',
        status: 'SCHEDULED',
        employee: { fullName: 'BS. Nguyễn Văn A' },
      },
    ];

    const error = AppointmentsValidator.checkConflict(
      {
        scheduledAt: baseTime,
        patientId: 'patient-1',
        employeeId: 'doc-1',
        roomId: 'room-1',
      },
      existing
    );

    expect(error).not.toBeNull();
    expect(error).toContain('Bác sĩ/nhân viên');
    expect(error).toContain('BS. Nguyễn Văn A');
    expect(error).toContain('30 phút');
  });

  it('chặn khi cùng Bác sĩ và cách nhau 15 phút (< 30 phút)', () => {
    const existing: any[] = [
      {
        id: 'appt-1',
        scheduledAt: new Date('2026-10-25T10:15:00.000Z'),
        patientId: 'patient-2',
        employeeId: 'doc-1',
        roomId: 'room-2',
        status: 'SCHEDULED',
        employee: { fullName: 'BS. Nguyễn Văn A' },
      },
    ];

    const error = AppointmentsValidator.checkConflict(
      {
        scheduledAt: baseTime, // 10:00
        patientId: 'patient-1',
        employeeId: 'doc-1',
        roomId: 'room-1',
      },
      existing
    );

    expect(error).not.toBeNull();
    expect(error).toContain('Bác sĩ/nhân viên');
  });

  it('chặn khi cùng Bác sĩ trước đó 20 phút (09:40 vs 10:00, < 30 phút)', () => {
    const existing: any[] = [
      {
        id: 'appt-1',
        scheduledAt: new Date('2026-10-25T09:40:00.000Z'),
        patientId: 'patient-2',
        employeeId: 'doc-1',
        roomId: 'room-2',
        status: 'SCHEDULED',
      },
    ];

    const error = AppointmentsValidator.checkConflict(
      {
        scheduledAt: baseTime, // 10:00
        patientId: 'patient-1',
        employeeId: 'doc-1',
        roomId: 'room-1',
      },
      existing
    );

    expect(error).not.toBeNull();
    expect(error).toContain('Bác sĩ/nhân viên');
  });

  it('cho phép khi cùng Bác sĩ nhưng cách đúng 30 phút (10:00 và 10:30)', () => {
    const existing: any[] = [
      {
        id: 'appt-1',
        scheduledAt: new Date('2026-10-25T10:30:00.000Z'),
        patientId: 'patient-2',
        employeeId: 'doc-1',
        roomId: 'room-2',
        status: 'SCHEDULED',
      },
    ];

    const error = AppointmentsValidator.checkConflict(
      {
        scheduledAt: baseTime, // 10:00
        patientId: 'patient-1',
        employeeId: 'doc-1',
        roomId: 'room-1',
      },
      existing
    );

    expect(error).toBeNull();
  });

  it('chặn khi cùng Phòng khám và cách nhau 10 phút (< 30 phút)', () => {
    const existing: any[] = [
      {
        id: 'appt-1',
        scheduledAt: new Date('2026-10-25T10:10:00.000Z'),
        patientId: 'patient-2',
        employeeId: 'doc-2',
        roomId: 'room-1',
        status: 'SCHEDULED',
        room: { name: 'Phòng Laser 01' },
      },
    ];

    const error = AppointmentsValidator.checkConflict(
      {
        scheduledAt: baseTime, // 10:00
        patientId: 'patient-1',
        employeeId: 'doc-1',
        roomId: 'room-1',
      },
      existing
    );

    expect(error).not.toBeNull();
    expect(error).toContain('Phòng khám');
    expect(error).toContain('Phòng Laser 01');
    expect(error).toContain('30 phút');
  });

  it('chặn khi cùng Bệnh nhân đặt 2 lịch hẹn cách nhau dưới 30 phút', () => {
    const existing: any[] = [
      {
        id: 'appt-1',
        scheduledAt: new Date('2026-10-25T10:10:00.000Z'),
        patientId: 'patient-1',
        employeeId: 'doc-2',
        roomId: 'room-2',
        status: 'SCHEDULED',
      },
    ];

    const error = AppointmentsValidator.checkConflict(
      {
        scheduledAt: baseTime, // 10:00
        patientId: 'patient-1',
        employeeId: 'doc-1',
        roomId: 'room-1',
      },
      existing
    );

    expect(error).not.toBeNull();
    expect(error).toContain('Bệnh nhân đã có lịch hẹn');
    expect(error).toContain('tối thiểu 30 phút');
  });

  it('chặn khi cả 2 lịch hẹn đều chưa phân công Bác sĩ và Phòng và cách nhau dưới 30 phút', () => {
    const existing: any[] = [
      {
        id: 'appt-1',
        scheduledAt: new Date('2026-10-25T10:15:00.000Z'),
        patientId: 'patient-2',
        employeeId: null,
        roomId: null,
        status: 'SCHEDULED',
      },
    ];

    const error = AppointmentsValidator.checkConflict(
      {
        scheduledAt: baseTime, // 10:00
        patientId: 'patient-1',
        employeeId: null,
        roomId: null,
      },
      existing
    );

    expect(error).not.toBeNull();
    expect(error).toContain('chưa phân công');
  });

  it('cho phép trùng giờ nếu khác Bác sĩ và khác Phòng khám và khác Bệnh nhân', () => {
    const existing: any[] = [
      {
        id: 'appt-1',
        scheduledAt: new Date('2026-10-25T10:00:00.000Z'),
        patientId: 'patient-2',
        employeeId: 'doc-2',
        roomId: 'room-2',
        status: 'SCHEDULED',
      },
    ];

    const error = AppointmentsValidator.checkConflict(
      {
        scheduledAt: baseTime, // 10:00
        patientId: 'patient-1',
        employeeId: 'doc-1',
        roomId: 'room-1',
      },
      existing
    );

    expect(error).toBeNull();
  });

  it('bỏ qua lịch hẹn đã bị HỦY (status === CANCELLED)', () => {
    const existing: any[] = [
      {
        id: 'appt-1',
        scheduledAt: new Date('2026-10-25T10:00:00.000Z'),
        patientId: 'patient-1',
        employeeId: 'doc-1',
        roomId: 'room-1',
        status: 'CANCELLED',
      },
    ];

    const error = AppointmentsValidator.checkConflict(
      {
        scheduledAt: baseTime,
        patientId: 'patient-1',
        employeeId: 'doc-1',
        roomId: 'room-1',
      },
      existing
    );

    expect(error).toBeNull();
  });
});

describe('AppointmentsService - Tích hợp Service & Repository', () => {
  let mockRepository: IAppointmentsRepository;
  let service: AppointmentsService;

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      findMany: vi.fn(),
      findConflicts: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    service = new AppointmentsService(mockRepository);
  });

  it('tạo lịch hẹn thành công khi không có xung đột', async () => {
    (mockRepository.findConflicts as any).mockResolvedValue([]);
    (mockRepository.create as any).mockImplementation((input: any) =>
      Promise.resolve({ id: 'appt-new', ...input })
    );

    const result = await service.create({
      patientId: 'patient-1',
      employeeId: 'doc-1',
      roomId: 'room-1',
      scheduledAt: new Date('2026-10-25T14:00:00.000Z'),
      status: 'SCHEDULED',
    });

    expect(result.id).toBe('appt-new');
    expect(mockRepository.findConflicts).toHaveBeenCalledWith(
      new Date('2026-10-25T14:00:00.000Z'),
      30
    );
    expect(mockRepository.create).toHaveBeenCalled();
  });

  it('ném lỗi khi lịch hẹn bị trùng bác sĩ trong vòng 30 phút', async () => {
    (mockRepository.findConflicts as any).mockResolvedValue([
      {
        id: 'existing-1',
        scheduledAt: new Date('2026-10-25T14:15:00.000Z'),
        patientId: 'patient-2',
        employeeId: 'doc-1',
        roomId: 'room-2',
        status: 'SCHEDULED',
        employee: { fullName: 'BS. Lê Thị B' },
      },
    ]);

    await expect(
      service.create({
        patientId: 'patient-1',
        employeeId: 'doc-1',
        roomId: 'room-1',
        scheduledAt: new Date('2026-10-25T14:00:00.000Z'),
        status: 'SCHEDULED',
      })
    ).rejects.toThrow(/Bác sĩ\/nhân viên/);

    expect(mockRepository.create).not.toHaveBeenCalled();
  });

  it('update lịch hẹn kiểm tra trùng lịch và bỏ qua chính nó', async () => {
    const existingAppt: any = {
      id: 'appt-1',
      scheduledAt: new Date('2026-10-25T10:00:00.000Z'),
      patientId: 'patient-1',
      employeeId: 'doc-1',
      roomId: 'room-1',
      status: 'SCHEDULED',
    };

    (mockRepository.findById as any).mockResolvedValue(existingAppt);
    // findConflicts trả về chính appt-1
    (mockRepository.findConflicts as any).mockResolvedValue([existingAppt]);
    (mockRepository.update as any).mockImplementation((id: string, input: any) =>
      Promise.resolve({ id, ...input })
    );

    // Update mà không đổi giờ, không bị xung đột với chính mình
    const result = await service.update('appt-1', {
      status: 'CONFIRMED',
    });

    expect(result.id).toBe('appt-1');
    expect(mockRepository.update).toHaveBeenCalled();
  });

  it('update lịch hẹn ném lỗi nếu chuyển sang khung giờ bị trùng với lịch khác', async () => {
    const existingAppt: any = {
      id: 'appt-1',
      scheduledAt: new Date('2026-10-25T10:00:00.000Z'),
      patientId: 'patient-1',
      employeeId: 'doc-1',
      roomId: 'room-1',
      status: 'SCHEDULED',
    };

    const anotherAppt: any = {
      id: 'appt-2',
      scheduledAt: new Date('2026-10-25T15:15:00.000Z'),
      patientId: 'patient-99',
      employeeId: 'doc-1',
      roomId: 'room-99',
      status: 'SCHEDULED',
    };

    (mockRepository.findById as any).mockResolvedValue(existingAppt);
    // Khi dời sang 15:00, xung đột với appt-2 lúc 15:15
    (mockRepository.findConflicts as any).mockResolvedValue([anotherAppt]);

    await expect(
      service.update('appt-1', {
        scheduledAt: new Date('2026-10-25T15:00:00.000Z'),
      })
    ).rejects.toThrow(/Bác sĩ\/nhân viên/);

    expect(mockRepository.update).not.toHaveBeenCalled();
  });
});
