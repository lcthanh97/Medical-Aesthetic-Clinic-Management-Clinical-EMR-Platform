import { describe, expect, it } from 'vitest';
import { planFollowUpReminders } from '@/features/follow-ups/reminder-planning';
import { runFollowUpReminderJob, type ReminderStore, type ReminderTransaction } from '@/features/follow-ups/reminder-job';
import { handleReminderRequest } from '@/app/api/system/follow-up-reminders/route';

const morning = new Date('2026-11-17T02:00:00.000Z');
const target = new Date('2026-11-20T00:00:00+07:00');

function plan(overrides: Record<string, unknown> = {}) {
  return { id: 'plan-1', patientId: 'patient-1', patientCode: 'BN-TEST', version: 1,
    status: 'CONFIRMED', decision: 'SCHEDULED', targetDate: target, confirmedAt: morning,
    windowDays: 0, appointments: [], existingKeys: new Set<string>(), ...overrides };
}

function decide(overrides: Record<string, unknown> = {}, now = morning) {
  return planFollowUpReminders({ ...plan(overrides), completed: false, patientConfirmed: false, now });
}

function memoryStore(records: ReturnType<typeof plan>[], options: { locked?: boolean; completed?: boolean; patientConfirmed?: boolean } = {}) {
  let writes = 0;
  let audits = 0;
  const tx: ReminderTransaction = {
    async loadBatch(afterId) { return records.filter((record) => !afterId || record.id > afterId).slice(0, 200); },
    async signals() { return { completed: options.completed ?? false, patientConfirmed: options.patientConfirmed ?? false }; },
    async create(record, action) { writes++; record.existingKeys.add(action.key); return true; },
    async savepoint() {}, async rollbackRecord() {}, async releaseRecord() {},
    async audit() { audits++; },
  };
  const store: ReminderStore = { async withLock(work) { return options.locked ? null : work(tx); } };
  return { store, get writes() { return writes; }, get audits() { return audits; } };
}

describe('lập kế hoạch nhắc tái khám', () => {
  it('dùng ngày dự kiến khi chưa có lịch và chọn đúng mốc gần nhất', () => {
    expect(decide()).toMatchObject({ action: 'CREATE', kind: 'REMIND_3D', appointment: false });
    expect(decide({ targetDate: new Date('2026-11-18T00:00:00+07:00') })).toMatchObject({ action: 'CREATE', kind: 'REMIND_1D' });
  });

  it('ưu tiên giờ lịch thật và chỉ chọn một mốc', () => {
    const appointments = [{ scheduledAt: new Date('2026-11-18T08:00:00+07:00'), status: 'BOOKED' }];
    expect(decide({ appointments })).toMatchObject({ action: 'CREATE', kind: 'REMIND_1D', appointment: true });
  });

  it('lịch hủy dừng nhắc, lịch hoàn tất và kế hoạch không phù hợp bị bỏ qua', () => {
    for (const overrides of [{ status: 'DRAFT' }, { status: 'CANCELLED' }, { decision: 'NOT_NEEDED' },
      { decision: 'ON_SYMPTOMS' }, { appointments: [{ scheduledAt: target, status: 'CANCELLED' }] }]) {
      expect(decide(overrides)).toMatchObject({ action: 'SKIP', reason: 'INELIGIBLE' });
    }
    expect(planFollowUpReminders({ ...plan(), completed: true, patientConfirmed: false, now: morning })).toMatchObject({ action: 'SKIP', reason: 'COMPLETED' });
  });

  it('chống trùng theo loại, phiên bản và thời điểm; sửa lịch cho phép nhắc mới', () => {
    const first = decide();
    expect(first.action).toBe('CREATE');
    if (first.action !== 'CREATE') return;
    expect(decide({ existingKeys: new Set([first.key]) })).toMatchObject({ action: 'SKIP', reason: 'ALREADY_SENT' });
    expect(decide({ existingKeys: new Set([first.key]), version: 2 })).toMatchObject({ action: 'CREATE' });
    expect(decide({ existingKeys: new Set([first.key]), targetDate: new Date('2026-11-19T00:00:00+07:00') })).toMatchObject({ action: 'CREATE' });
  });

  it('không gửi trong giờ yên tĩnh hoặc mốc quá hạn; xác nhận đến chặn mốc 3 ngày', () => {
    expect(decide({}, new Date('2026-11-17T15:00:00Z'))).toMatchObject({ action: 'SKIP', reason: 'QUIET_HOURS' });
    expect(decide({}, new Date('2026-11-21T02:00:00Z'))).toMatchObject({ action: 'SKIP', reason: 'NOT_DUE' });
    expect(planFollowUpReminders({ ...plan(), completed: false, patientConfirmed: true, now: morning })).toMatchObject({ action: 'SKIP', reason: 'PATIENT_CONFIRMED' });
  });

  it('tính ngày theo Việt Nam tại ranh giới nửa đêm UTC', () => {
    expect(decide({ targetDate: new Date('2026-11-18T00:00:00+07:00') }, new Date('2026-11-17T16:59:00Z')))
      .toMatchObject({ action: 'SKIP', reason: 'QUIET_HOURS' });
    expect(decide({ targetDate: new Date('2026-11-18T00:00:00+07:00') }, new Date('2026-11-17T23:59:00Z')))
      .toMatchObject({ action: 'SKIP', reason: 'QUIET_HOURS' });
  });
});

describe('thực thi trong bộ nhớ và route', () => {
  it('dryRun không ghi; hai lần chạy thật không tạo trùng', async () => {
    const memory = memoryStore([plan()]);
    expect((await runFollowUpReminderJob(memory.store, { dryRun: true, now: () => morning }))?.planned).toBe(1);
    expect(memory.writes).toBe(0);
    expect(memory.audits).toBe(0);
    expect((await runFollowUpReminderJob(memory.store, { dryRun: false, now: () => morning }))?.created.REMIND_3D).toBe(1);
    expect((await runFollowUpReminderJob(memory.store, { dryRun: false, now: () => morning }))?.created.REMIND_3D).toBe(0);
    expect(memory.writes).toBe(1);
    expect(memory.audits).toBe(1);
  });

  it('lỗi một kế hoạch không chặn kế hoạch sau trong cùng lô', async () => {
    const records = [plan({ id: 'plan-1' }), plan({ id: 'plan-2' })];
    const memory = memoryStore(records);
    const original = memory.store.withLock.bind(memory.store);
    const store: ReminderStore = { withLock: (work) => original((tx) => work({
      ...tx,
      async signals(record) {
        if (record.id === 'plan-1') throw new Error('Lỗi giả trong bộ nhớ');
        return tx.signals(record);
      },
    })) };
    const counts = await runFollowUpReminderJob(store, { dryRun: false, now: () => morning });
    expect(counts?.errors).toBe(1);
    expect(counts?.created.REMIND_3D).toBe(1);
    expect(memory.writes).toBe(1);
  });

  it('thiếu/sai secret, asOf không dryRun và khóa bận bị từ chối', async () => {
    const memory = memoryStore([]);
    const request = (query = '', header?: string) => new Request(`http://localhost/api/system/follow-up-reminders${query}`, {
      headers: header ? { authorization: header } : {},
    });
    expect((await handleReminderRequest(request(), memory.store, undefined)).status).toBe(503);
    expect((await handleReminderRequest(request(), memory.store, 'secret')).status).toBe(401);
    expect((await handleReminderRequest(request('?asOf=2026-11-17T02:00:00Z', 'Bearer secret'), memory.store, 'secret')).status).toBe(400);
    expect((await handleReminderRequest(request('?dryRun=1', 'Bearer secret'), memoryStore([], { locked: true }).store, 'secret')).status).toBe(409);
    expect((await handleReminderRequest(request('?dryRun=1&asOf=2026-11-17T02:00:00Z', 'Bearer secret'), memory.store, 'secret')).status).toBe(200);
  });
});
