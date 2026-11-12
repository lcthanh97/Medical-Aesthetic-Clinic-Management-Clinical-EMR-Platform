import { describe, it, expect } from 'vitest';
import {
  CLINIC_OPERATING_SLOTS,
  computeSlotsAvailability,
} from '../../../src/features/appointments/utils/timeSlots';

describe('timeSlots utils - Quản lý khung giờ hoạt động bệnh viện', () => {
  it('định nghĩa chính xác 16 khung giờ hoạt động (8 sáng, 8 chiều)', () => {
    expect(CLINIC_OPERATING_SLOTS).toHaveLength(16);

    const morningSlots = CLINIC_OPERATING_SLOTS.filter((s) => s.period === 'morning');
    const afternoonSlots = CLINIC_OPERATING_SLOTS.filter((s) => s.period === 'afternoon');

    expect(morningSlots).toHaveLength(8);
    expect(morningSlots[0].time).toBe('07:00');
    expect(morningSlots[0].endTime).toBe('07:30');
    expect(morningSlots[7].time).toBe('10:30');
    expect(morningSlots[7].endTime).toBe('11:00');

    expect(afternoonSlots).toHaveLength(8);
    expect(afternoonSlots[0].time).toBe('13:00');
    expect(afternoonSlots[0].endTime).toBe('13:30');
    expect(afternoonSlots[7].time).toBe('16:30');
    expect(afternoonSlots[7].endTime).toBe('17:00');
  });

  it('tất cả các slot đều trống khi chưa có lịch hẹn nào và ngày ở tương lai', () => {
    const slots = computeSlotsAvailability({
      dateStr: '2026-12-01',
      existingAppointments: [],
      now: new Date('2026-11-12T00:00:00'),
    });

    expect(slots).toHaveLength(16);
    expect(slots.every((s) => s.isAvailable)).toBe(true);
    expect(slots.every((s) => !s.isBooked)).toBe(true);
    expect(slots.every((s) => !s.isPast)).toBe(true);
  });

  it('đánh dấu slot là isPast nếu thời gian đã qua trong ngày', () => {
    // 09:15 ngày 12/11/2026 -> các slot 07:00, 07:30, 08:00, 08:30, 09:00 đã qua
    const now = new Date('2026-11-12T09:15:00');
    const slots = computeSlotsAvailability({
      dateStr: '2026-11-12',
      existingAppointments: [],
      now,
    });

    const slot0700 = slots.find((s) => s.time === '07:00');
    const slot0900 = slots.find((s) => s.time === '09:00');
    const slot0930 = slots.find((s) => s.time === '09:30');

    expect(slot0700?.isPast).toBe(true);
    expect(slot0700?.isAvailable).toBe(false);

    expect(slot0900?.isPast).toBe(true);
    expect(slot0900?.isAvailable).toBe(false);

    expect(slot0930?.isPast).toBe(false);
    expect(slot0930?.isAvailable).toBe(true);
  });

  it('đánh dấu slot là isBooked khi trùng giờ với bác sĩ được chọn', () => {
    const existing = [
      {
        id: 'appt-1',
        scheduledAt: new Date('2026-11-15T08:00:00'),
        employeeId: 'doc-1',
        employee: { fullName: 'BS. Lê Thị B' },
        status: 'SCHEDULED',
      },
    ];

    // Bệnh nhân chọn doc-1
    const slotsWithDoc1 = computeSlotsAvailability({
      dateStr: '2026-11-15',
      existingAppointments: existing,
      employeeId: 'doc-1',
      now: new Date('2026-11-12T00:00:00'),
    });

    const slot0800 = slotsWithDoc1.find((s) => s.time === '08:00');
    const slot0830 = slotsWithDoc1.find((s) => s.time === '08:30');

    expect(slot0800?.isBooked).toBe(true);
    expect(slot0800?.isAvailable).toBe(false);
    expect(slot0800?.reason).toContain('BS. Lê Thị B');

    // Slot 08:30 cách 30 phút nên còn trống
    expect(slot0830?.isBooked).toBe(false);
    expect(slot0830?.isAvailable).toBe(true);

    // Nếu bệnh nhân chọn doc-2, slot 08:00 vẫn còn trống đối với doc-2
    const slotsWithDoc2 = computeSlotsAvailability({
      dateStr: '2026-11-15',
      existingAppointments: existing,
      employeeId: 'doc-2',
      now: new Date('2026-11-12T00:00:00'),
    });

    const slot0800Doc2 = slotsWithDoc2.find((s) => s.time === '08:00');
    expect(slot0800Doc2?.isBooked).toBe(false);
    expect(slot0800Doc2?.isAvailable).toBe(true);
  });

  it('đánh dấu slot là isBooked khi trùng phòng khám được chọn', () => {
    const existing = [
      {
        id: 'appt-2',
        scheduledAt: new Date('2026-11-15T14:00:00'),
        roomId: 'room-laser-01',
        room: { name: 'Phòng Laser 01' },
        status: 'SCHEDULED',
      },
    ];

    const slots = computeSlotsAvailability({
      dateStr: '2026-11-15',
      existingAppointments: existing,
      roomId: 'room-laser-01',
      now: new Date('2026-11-12T00:00:00'),
    });

    const slot1400 = slots.find((s) => s.time === '14:00');
    expect(slot1400?.isBooked).toBe(true);
    expect(slot1400?.isAvailable).toBe(false);
    expect(slot1400?.reason).toContain('Phòng Laser 01');
  });

  it('bỏ qua các lịch hẹn đã bị HỦY (status === CANCELLED)', () => {
    const existing = [
      {
        id: 'appt-3',
        scheduledAt: new Date('2026-11-15T09:00:00'),
        employeeId: 'doc-1',
        status: 'CANCELLED',
      },
    ];

    const slots = computeSlotsAvailability({
      dateStr: '2026-11-15',
      existingAppointments: existing,
      employeeId: 'doc-1',
      now: new Date('2026-11-12T00:00:00'),
    });

    const slot0900 = slots.find((s) => s.time === '09:00');
    expect(slot0900?.isBooked).toBe(false);
    expect(slot0900?.isAvailable).toBe(true);
  });
});
