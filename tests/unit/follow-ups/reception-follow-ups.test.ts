import { describe, expect, it } from 'vitest';
import { bookingSchema, contactSchema, listSchema, rescheduleSchema } from '@/features/follow-ups/reception/follow-up-reception.schema';
import { classifyReceptionPlan, FollowUpReceptionService, outsideFollowUpWindow,
  type ReceptionActor, type ReceptionPlan, type ReceptionStore, type ReceptionTransaction } from '@/features/follow-ups/reception/follow-up-reception.service';

const now = new Date('2026-11-17T02:00:00Z');
const actor: ReceptionActor = { accountId: 'account-1', employeeId: 'reception-1', role: 'RECEPTIONIST' };
const appointmentAt = '2026-11-20T09:00:00+07:00';
function plan(overrides: Record<string, unknown> = {}): ReceptionPlan {
  return { id: 'plan-1', patientId: 'patient-1', doctorId: 'doctor-1', decision: 'SCHEDULED', status: 'CONFIRMED',
    targetDate: new Date('2026-11-20T00:00:00+07:00'), windowDays: 1, priority: 'NORMAL',
    preparation: null, patientMessage: null, version: 1, confirmedAt: now, treatmentSessionId: null,
    patient: { fullName: 'Bệnh nhân thử', patientCode: 'BN-TEST', phone: null }, doctor: { fullName: 'Bác sĩ thử' },
    appointments: [], ...overrides } as ReceptionPlan;
}
function appointment(overrides: Record<string, unknown> = {}) {
  return { id: 'appointment-1', scheduledAt: new Date(appointmentAt), status: 'SCHEDULED',
    employeeId: 'doctor-1', roomId: null, serviceId: null, treatmentSessionId: null, ...overrides };
}
function memory(initial = plan()) {
  let row = initial;
  let created = 0;
  let linked = 0;
  let moved = 0;
  let conflicts: Awaited<ReturnType<ReceptionTransaction['conflicts']>> = [];
  const logs: Array<{ entityId: string; action: string; createdAt: Date; metadata: Record<string, unknown> }> = [];
  let sessionAppointment: { id: string; scheduledAt: Date; status: string } | null = null;
  const tx: ReceptionTransaction = {
    async plan() { return row; },
    async treatmentAppointment() { return sessionAppointment; },
    async logs() { return logs; },
    async conflicts() { return conflicts; },
    async doctorExists() { return true; }, async serviceExists() { return true; }, async roomExists() { return true; },
    async createAppointment(input) { created++; row = { ...row, appointments: [...row.appointments, appointment({ id: `appointment-${created}`, ...input })] }; return { id: `appointment-${created}` }; },
    async linkAppointment(id, planId) { linked++; row = { ...row, appointments: [...row.appointments, appointment({ id, followUpPlanId: planId })] }; },
    async moveAppointment(id, date, employeeId) { moved++; row = { ...row, appointments: row.appointments.map((item) => item.id === id ? { ...item, scheduledAt: date, employeeId } : item) }; },
    async log(_actor, entityId, action, data) { logs.unshift({ entityId, action, createdAt: now, metadata: data }); },
  };
  const store: ReceptionStore = {
    async plans() { return [row]; }, async plan() { return row; },
    async logs() { return new Map([[row.id, logs]]); }, async hasCompletedVisit() { return false; },
    async options() { return { doctors: [], services: [], rooms: [] }; },
    async withPlanLock(_id, work) { return work(tx); },
  };
  return { store, get row() { return row; }, get created() { return created; }, get linked() { return linked; },
    get moved() { return moved; }, logs, setConflicts(value: typeof conflicts) { conflicts = value; },
    setSessionAppointment(value: typeof sessionAppointment) { sessionAppointment = value; } };
}
const service = (store: ReceptionStore) => new FollowUpReceptionService(store, () => now);
const booking = () => bookingSchema.parse({ scheduledAt: appointmentAt, employeeId: 'doctor-1' });

describe('phân loại danh sách lễ tân', () => {
  it('nhận diện cần đặt lịch, quá hạn, đã đặt, không cần và khi có dấu hiệu', () => {
    expect(classifyReceptionPlan(plan(), [], false, now)).toBe('NEEDS_BOOKING');
    expect(classifyReceptionPlan(plan({ targetDate: new Date('2026-11-10T00:00:00+07:00') }), [], false, now)).toBe('OVERDUE');
    expect(classifyReceptionPlan(plan({ appointments: [appointment()] }), [], false, now)).toBe('BOOKED');
    expect(classifyReceptionPlan(plan({ decision: 'NOT_NEEDED' }), [], false, now)).toBe('NOT_NEEDED');
    expect(classifyReceptionPlan(plan({ decision: 'ON_SYMPTOMS' }), [], false, now)).toBe('ON_SYMPTOMS');
    expect(classifyReceptionPlan(plan(), [], true, now)).toBe('COMPLETED');
  });

  it('cần xem lại khi phiên bản tăng và biến mất sau khi xác nhận', () => {
    const changed = plan({ version: 2, appointments: [appointment()] });
    const booked = { action: 'FOLLOWUP_APPOINTMENT_BOOKED', createdAt: now, metadata: { planVersion: 1 } };
    expect(classifyReceptionPlan(changed, [booked], false, now)).toBe('NEEDS_REVIEW');
    expect(classifyReceptionPlan(changed, [{ action: 'FOLLOWUP_PLAN_CHANGE_ACK', createdAt: now, metadata: { planVersion: 2 } }, booked], false, now)).toBe('BOOKED');
  });

  it('gọi lại hôm nay khi liên hệ gần nhất có hẹn gọi lại', () => {
    expect(classifyReceptionPlan(plan(), [{ action: 'FOLLOWUP_CONTACT_LOGGED', createdAt: now,
      metadata: { outcome: 'HEN_GOI_LAI', callbackAt: now.toISOString() } }], false, now)).toBe('CALL_BACK_TODAY');
  });
});

describe('nghiệp vụ lễ tân với kho dữ liệu trong bộ nhớ', () => {
  it('đặt lịch gắn plan, chặn đặt lần hai và ghi outsideWindow', async () => {
    const db = memory();
    expect(await service(db.store).book(actor, db.row.id, booking())).toMatchObject({ outsideWindow: false, linkedExisting: false });
    expect(db.row.appointments[0]?.id).toBe('appointment-1');
    expect(db.created).toBe(1);
    await expect(service(db.store).book(actor, db.row.id, booking())).rejects.toThrow('FOLLOWUP_ALREADY_BOOKED');
    expect(db.logs[0]?.metadata).toMatchObject({ planId: db.row.id, planVersion: 1, outsideWindow: false });
    expect(outsideFollowUpWindow(db.row, new Date('2026-11-25T09:00:00+07:00'))).toBe(true);
  });

  it('đặt ngoài khoảng vẫn lưu lịch và đánh dấu cảnh báo trong audit', async () => {
    const db = memory();
    const input = bookingSchema.parse({ scheduledAt: '2026-11-25T09:00:00+07:00', employeeId: 'doctor-1' });
    expect(await service(db.store).book(actor, 'plan-1', input)).toMatchObject({ outsideWindow: true });
    expect(db.logs[0]?.metadata.outsideWindow).toBe(true);
  });

  it('không cho đặt kế hoạch không hợp lệ, quá khứ, hoặc vi phạm 30 phút', async () => {
    await expect(service(memory(plan({ status: 'DRAFT' })).store).book(actor, 'plan-1', booking())).rejects.toThrow('FOLLOWUP_PLAN_UNAVAILABLE');
    await expect(service(memory(plan({ status: 'CANCELLED' })).store).book(actor, 'plan-1', booking())).rejects.toThrow('FOLLOWUP_PLAN_UNAVAILABLE');
    await expect(service(memory().store).book(actor, 'plan-1', bookingSchema.parse({ scheduledAt: '2026-11-01T09:00:00+07:00', employeeId: 'doctor-1' }))).rejects.toThrow('FOLLOWUP_APPOINTMENT_PAST');
    const db = memory();
    db.setConflicts([{ id: 'other', patientId: 'patient-1', employeeId: 'doctor-2', roomId: null,
      serviceId: null, treatmentSessionId: null, followUpPlanId: null, scheduledAt: new Date(appointmentAt), status: 'SCHEDULED' }]);
    await expect(service(db.store).book(actor, 'plan-1', booking())).rejects.toThrow('FOLLOWUP_CONFLICT:');
  });

  it('liên kết lịch buổi điều trị có sẵn, không tạo lịch mới', async () => {
    const db = memory(plan({ treatmentSessionId: 'session-1' }));
    db.setSessionAppointment({ id: 'session-appointment', scheduledAt: new Date(appointmentAt), status: 'SCHEDULED' });
    expect(await service(db.store).book(actor, 'plan-1', booking())).toMatchObject({ linkedExisting: true });
    expect(db.linked).toBe(1); expect(db.created).toBe(0);
  });

  it('đổi lịch lưu trước/sau và loại trừ chính lịch khi kiểm tra trùng', async () => {
    const db = memory(plan({ appointments: [appointment()] }));
    db.setConflicts([{ id: 'appointment-1', patientId: 'patient-1', employeeId: 'doctor-1', roomId: null,
      serviceId: null, treatmentSessionId: null, followUpPlanId: 'plan-1', scheduledAt: new Date(appointmentAt), status: 'SCHEDULED' }]);
    await service(db.store).reschedule(actor, 'plan-1', rescheduleSchema.parse({ scheduledAt: '2026-11-21T09:00:00+07:00', employeeId: 'doctor-1', reason: 'BN_YEU_CAU' }));
    expect(db.moved).toBe(1);
    expect(db.logs[0]?.metadata).toMatchObject({ before: { scheduledAt: new Date(appointmentAt).toISOString() },
      after: { scheduledAt: new Date('2026-11-21T09:00:00+07:00').toISOString() }, reason: 'BN_YEU_CAU' });
  });

  it('liên hệ chỉ ghi audit, DTO không có nội dung lâm sàng và tab tất cả mới chứa quyết định không hẹn', async () => {
    const db = memory(plan({ decision: 'NOT_NEEDED' }));
    await service(db.store).contact(actor, 'plan-1', contactSchema.parse({ outcome: 'HEN_GOI_LAI', callbackAt: now.toISOString(), note: 'Gọi lại' }));
    expect(db.created).toBe(0); expect(db.logs[0]?.action).toBe('FOLLOWUP_CONTACT_LOGGED');
    expect((await service(db.store).list(actor, listSchema.parse({ tab: 'todo' }))).total).toBe(0);
    const all = await service(db.store).list(actor, listSchema.parse({ tab: 'all' }));
    expect(all.total).toBe(1);
    expect(Object.keys(all.items[0] ?? {})).not.toContain('reason');
    expect(Object.keys(all.items[0] ?? {})).not.toContain('homeCare');
    const conditional = memory(plan({ decision: 'ON_SYMPTOMS' }));
    expect((await service(conditional.store).list(actor, listSchema.parse({ tab: 'todo' }))).total).toBe(0);
    expect((await service(conditional.store).list(actor, listSchema.parse({ tab: 'all' }))).total).toBe(1);
  });

  it('đổi lịch bị chặn nếu trùng bác sĩ trong khoảng 30 phút', async () => {
    const db = memory(plan({ appointments: [appointment()] }));
    db.setConflicts([{ id: 'other-appointment', patientId: 'other-patient', employeeId: 'doctor-1', roomId: null,
      serviceId: null, treatmentSessionId: null, followUpPlanId: null,
      scheduledAt: new Date('2026-11-21T09:10:00+07:00'), status: 'SCHEDULED' }]);
    await expect(service(db.store).reschedule(actor, 'plan-1', rescheduleSchema.parse({
      scheduledAt: '2026-11-21T09:00:00+07:00', employeeId: 'doctor-1', reason: 'BN_YEU_CAU',
    }))).rejects.toThrow('FOLLOWUP_CONFLICT:');
    expect(db.moved).toBe(0);
  });

  it('xác nhận đã xem thay đổi ghi audit và bỏ nhãn cần xem lại', async () => {
    const db = memory(plan({ version: 2, appointments: [appointment()] }));
    db.logs.push({ entityId: 'plan-1', action: 'FOLLOWUP_APPOINTMENT_BOOKED', createdAt: now, metadata: { planVersion: 1 } });
    expect((await service(db.store).list(actor, listSchema.parse({ tab: 'todo' }))).items[0]?.label).toBe('NEEDS_REVIEW');
    await service(db.store).acknowledge(actor, 'plan-1');
    expect(db.logs[0]?.action).toBe('FOLLOWUP_PLAN_CHANGE_ACK');
    expect((await service(db.store).list(actor, listSchema.parse({ tab: 'booked' }))).items[0]?.label).toBe('BOOKED');
  });

  it('tài khoản không phải lễ tân bị từ chối', async () => {
    await expect(service(memory().store).list({ ...actor, role: 'OTHER' }, listSchema.parse({}))).rejects.toThrow('FOLLOWUP_RECEPTION_FORBIDDEN');
  });
});
