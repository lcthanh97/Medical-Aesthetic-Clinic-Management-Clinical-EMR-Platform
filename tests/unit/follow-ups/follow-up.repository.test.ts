import { beforeEach, describe, expect, it, vi } from 'vitest';

const tx = vi.hoisted(() => ({
  visit: { findFirst: vi.fn() },
  followUpPlan: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn(), findMany: vi.fn() },
  notification: { findFirst: vi.fn() },
  appointment: { findFirst: vi.fn(), findMany: vi.fn() },
  auditLog: { create: vi.fn() },
}));
const db = vi.hoisted(() => ({
  ...tx,
  $transaction: vi.fn(),
  $queryRaw: vi.fn(),
  employee: { findFirst: vi.fn() },
  aftercareTemplate: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
}));

vi.mock('@/infrastructure/database/prisma', () => ({ prisma: db }));
import { PrismaFollowUpRepository } from '@/infrastructure/database/repositories/PrismaFollowUpRepository';

const actor = { accountId: 'account-1', employeeId: 'employee-1' };
const beforePlan = {
  id: 'plan-1', visitId: 'visit-1', patientId: 'patient-1', doctorId: 'employee-1', decision: 'SCHEDULED', status: 'CONFIRMED',
  targetDate: new Date('2026-11-20T00:00:00.000Z'), windowDays: 2, priority: 'NORMAL', reason: 'reason', homeCare: null,
  avoid: null, warningSigns: 'warning', patientMessage: null, hideDiagnosis: true, templateId: null, templateVersion: null,
  treatmentSessionId: null, version: 1, cancelReason: null, confirmedAt: new Date('2026-11-01T00:00:00.000Z'),
  createdAt: new Date('2026-11-01T00:00:00.000Z'), updatedAt: new Date('2026-11-01T00:00:00.000Z'),
};

describe('PrismaFollowUpRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.$transaction.mockImplementation((callback: (transaction: typeof tx) => unknown) => callback(tx));
  });

  it('increments version and audits before/after when saving over a confirmed plan', async () => {
    tx.visit.findFirst.mockResolvedValue({ id: 'visit-1', patientId: 'patient-1' });
    tx.followUpPlan.findUnique.mockResolvedValue(beforePlan);
    tx.notification.findFirst.mockResolvedValue({ id: 'notice-1' });
    tx.followUpPlan.update.mockImplementation(({ data }) => ({ ...beforePlan, ...data, updatedAt: new Date('2026-11-16T00:00:00Z') }));
    const repo = new PrismaFollowUpRepository();
    const result = await repo.saveDraft('visit-1', actor, { decision: 'SCHEDULED', targetDate: '2026-11-20', reason: 'updated', warningSigns: 'warning' });
    expect(result.plan).toMatchObject({ status: 'DRAFT', version: 2, doctorId: 'employee-1' });
    expect(result.needsRenotify).toBe(true);
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      action: 'FOLLOWUP_CONFIRMED_PLAN_EDITED', entityId: 'plan-1',
      metadata: expect.objectContaining({ before: expect.objectContaining({ version: 1 }), after: expect.objectContaining({ version: 2, status: 'DRAFT' }) }),
    }) }));
  });

  it('stores the edited copy of a template and its version', async () => {
    tx.visit.findFirst.mockResolvedValue({ id: 'visit-1', patientId: 'patient-1' });
    tx.followUpPlan.findUnique.mockResolvedValue(null);
    tx.followUpPlan.create.mockImplementation(({ data }) => ({ id: 'plan-1', ...data }));
    const copy = { id: 'template-1', version: 3, homeCare: 'Original', avoid: null, warningSigns: null };
    const result = await new PrismaFollowUpRepository().saveDraft('visit-1', actor, { decision: 'NOT_NEEDED', homeCare: 'Edited' }, copy);
    expect(result.plan).toMatchObject({ homeCare: 'Edited', templateId: 'template-1', templateVersion: 3 });
  });

  it('links an existing treatment session appointment on confirmation and audits the change', async () => {
    tx.visit.findFirst.mockResolvedValue({ id: 'visit-1', patientId: 'patient-1' });
    tx.followUpPlan.findUnique.mockResolvedValue({ ...beforePlan, status: 'DRAFT' });
    tx.appointment.findFirst.mockResolvedValue({ treatmentSessionId: 'session-1' });
    tx.followUpPlan.update.mockImplementation(({ data }) => ({ ...beforePlan, ...data }));
    const result = await new PrismaFollowUpRepository().confirm('visit-1', actor);
    expect(result.linkedToExistingSession).toBe(true);
    expect(result.plan).toMatchObject({ status: 'CONFIRMED', treatmentSessionId: 'session-1' });
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'FOLLOWUP_PLAN_CONFIRMED' }) }));
  });

  it('audits cancellation with the required reason and before/after snapshots', async () => {
    tx.visit.findFirst.mockResolvedValue({ id: 'visit-1' });
    tx.followUpPlan.findUnique.mockResolvedValue(beforePlan);
    tx.followUpPlan.update.mockImplementation(({ data }) => ({ ...beforePlan, ...data }));
    const result = await new PrismaFollowUpRepository().cancel('visit-1', actor, 'Kế hoạch thay đổi');
    expect(result).toMatchObject({ status: 'CANCELLED', cancelReason: 'Kế hoạch thay đổi', doctorId: 'employee-1' });
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      action: 'FOLLOWUP_PLAN_CANCELLED', entityId: 'plan-1',
      metadata: expect.objectContaining({ before: expect.objectContaining({ status: 'CONFIRMED' }), after: expect.objectContaining({ status: 'CANCELLED' }) }),
    }) }));
  });

  it('ignores a failed NotificationDelivery read and keeps derived signals available', async () => {
    db.appointment.findMany.mockResolvedValue([]);
    db.visit.findFirst.mockResolvedValue(null);
    db.$queryRaw.mockRejectedValue(new Error('optional delivery relation unavailable'));
    await expect(new PrismaFollowUpRepository().getDerivedSignals('plan-1', 'patient-1', null, null, null)).resolves.toEqual({ notified: false, booked: false, completed: false });
  });
});
