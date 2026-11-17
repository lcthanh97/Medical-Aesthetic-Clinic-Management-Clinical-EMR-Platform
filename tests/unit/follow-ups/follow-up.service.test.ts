import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FollowUpActor } from '@/server/repositories/IFollowUpRepository';
import type { IFollowUpRepository } from '@/server/repositories/IFollowUpRepository';
import { FollowUpService } from '@/server/services/FollowUpService';

const actor: FollowUpActor = { accountId: 'account-1', employeeId: 'employee-1' };

function repository(overrides: Partial<IFollowUpRepository> = {}): IFollowUpRepository {
  return {
    visitExists: vi.fn(async () => true),
    getAssignedVisit: vi.fn(async () => ({ id: 'visit-1', patientId: 'patient-1', visitDate: new Date('2026-11-15T00:00:00Z'), departmentId: 'department-1' })),
    getPlanForVisit: vi.fn(async () => null),
    saveDraft: vi.fn(async () => ({ plan: { id: 'plan-1', status: 'DRAFT' }, wasConfirmed: false, needsRenotify: false })),
    confirm: vi.fn(async () => ({ plan: { id: 'plan-1', status: 'CONFIRMED' }, linkedToExistingSession: false })),
    cancel: vi.fn(async () => ({ id: 'plan-1', status: 'CANCELLED' })),
    hasLinkedNotification: vi.fn(async () => false),
    getDerivedSignals: vi.fn(async () => ({ notified: false, booked: false, completed: false })),
    getTemplateForApply: vi.fn(async () => null),
    getDoctorDepartmentId: vi.fn(async () => 'department-1'),
    listTemplates: vi.fn(async () => []),
    createTemplate: vi.fn(async () => ({ id: 'template-1' })),
    listForDoctor: vi.fn(async () => []),
    countAssignedVisitsWithoutDecision: vi.fn(async () => 0),
    getNextStepInterval: vi.fn(async () => null),
    ...overrides,
  };
}

describe('FollowUpService', () => {
  beforeEach(() => {
    vi.stubEnv('FOLLOWUP_GATE_ENABLED', 'false');
  });

  it('rejects scheduled drafts missing a date or reason and rejects dates before today in Ho Chi Minh time', async () => {
    const service = new FollowUpService(repository(), () => new Date('2026-11-15T17:30:00.000Z'));
    await expect(service.saveDraft(actor, 'visit-1', { decision: 'SCHEDULED' })).rejects.toThrow('FOLLOWUP_TARGET_DATE_REQUIRED');
    await expect(service.saveDraft(actor, 'visit-1', { decision: 'SCHEDULED', targetDate: '2026-11-16' })).rejects.toThrow('FOLLOWUP_REASON_REQUIRED');
    await expect(service.saveDraft(actor, 'visit-1', { decision: 'SCHEDULED', targetDate: '2026-11-15', reason: 'reason' })).rejects.toThrow('FOLLOWUP_TARGET_DATE_PAST');
  });

  it('accepts today according to Asia/Ho_Chi_Minh calendar date', async () => {
    const repo = repository();
    const service = new FollowUpService(repo, () => new Date('2026-11-15T17:30:00.000Z'));
    await expect(service.saveDraft(actor, 'visit-1', { decision: 'SCHEDULED', targetDate: '2026-11-16', reason: 'reason' })).resolves.toMatchObject({ status: 'DRAFT' });
    expect(repo.saveDraft).toHaveBeenCalledOnce();
  });

  it('requires confirmed plan at completion only while the gate is enabled', async () => {
    const repo = repository({ getPlanForVisit: vi.fn(async () => null) });
    const service = new FollowUpService(repo);
    vi.stubEnv('FOLLOWUP_GATE_ENABLED', 'true');
    await expect(service.assertVisitMayComplete(actor, 'visit-1')).rejects.toThrow('FOLLOWUP_DECISION_REQUIRED');
    expect(repo.getAssignedVisit).toHaveBeenCalledOnce();

    const confirmed = new FollowUpService(repository({ getPlanForVisit: vi.fn(async () => ({ status: 'CONFIRMED' })) }));
    await expect(confirmed.assertVisitMayComplete(actor, 'visit-1')).resolves.toBeUndefined();

    vi.stubEnv('FOLLOWUP_GATE_ENABLED', 'false');
    const disabledRepo = repository();
    await expect(new FollowUpService(disabledRepo).assertVisitMayComplete(actor, 'visit-1')).resolves.toBeUndefined();
    expect(disabledRepo.getAssignedVisit).not.toHaveBeenCalled();
  });

  it('returns 403 when the Visit is not assigned to this doctor', async () => {
    const service = new FollowUpService(repository({ getAssignedVisit: vi.fn(async () => null) }));
    await expect(service.getForVisit(actor, 'visit-foreign')).rejects.toThrow('FOLLOWUP_VISIT_FORBIDDEN');
  });

  it('returns a distinct not-found error when the Visit does not exist', async () => {
    const service = new FollowUpService(repository({ getAssignedVisit: vi.fn(async () => null), visitExists: vi.fn(async () => false) }));
    await expect(service.getForVisit(actor, 'missing-visit')).rejects.toThrow('FOLLOWUP_VISIT_NOT_FOUND');
  });

  it('derives NOTIFIED, BOOKED, COMPLETED, OVERDUE and empty state for the doctor dashboard', async () => {
    const plans = [
      { id: 'notified', patientId: 'patient-1', status: 'CONFIRMED', targetDate: new Date('2026-11-20'), windowDays: 2, confirmedAt: new Date('2026-11-01') },
      { id: 'booked', patientId: 'patient-2', status: 'CONFIRMED', targetDate: new Date('2026-11-20'), windowDays: 0, confirmedAt: new Date('2026-11-01') },
      { id: 'completed', patientId: 'patient-3', status: 'CONFIRMED', targetDate: new Date('2026-11-20'), windowDays: 0, confirmedAt: new Date('2026-11-01') },
      { id: 'overdue', patientId: 'patient-4', status: 'CONFIRMED', targetDate: new Date('2026-11-10'), windowDays: 1, confirmedAt: new Date('2026-11-01') },
      { id: 'empty', patientId: 'patient-5', status: 'CONFIRMED', targetDate: new Date('2026-11-20'), windowDays: 0, confirmedAt: new Date('2026-11-01') },
    ];
    const signals: Record<string, { notified: boolean; booked: boolean; completed: boolean }> = {
      notified: { notified: true, booked: false, completed: false },
      booked: { notified: true, booked: true, completed: false },
      completed: { notified: true, booked: true, completed: true },
      overdue: { notified: true, booked: false, completed: false },
      empty: { notified: false, booked: false, completed: false },
    };
    const repo = repository({
      listForDoctor: vi.fn(async () => plans),
      getDerivedSignals: vi.fn(async (id) => signals[id]),
      countAssignedVisitsWithoutDecision: vi.fn(async () => 4),
    });
    const result = await new FollowUpService(repo, () => new Date('2026-11-16T05:00:00.000Z')).listForDoctor(actor);
    expect(result.pendingDecisionCount).toBe(4);
    expect(result.overdue).toMatchObject([{ id: 'overdue', derivedStatus: 'OVERDUE' }]);
    expect(result.upcoming.map((plan) => [plan.id, plan.derivedStatus])).toEqual([
      ['notified', 'NOTIFIED'], ['booked', 'BOOKED'], ['empty', null],
    ]);
  });

  it('requires aftercare content or a reasoned NOT_NEEDED decision before confirmation', async () => {
    const repo = repository({ getPlanForVisit: vi.fn(async () => ({ status: 'DRAFT', decision: 'ON_SYMPTOMS', homeCare: null, warningSigns: null })) });
    const service = new FollowUpService(repo);
    await expect(service.confirm(actor, 'visit-1')).rejects.toThrow('FOLLOWUP_CONFIRM_CONTENT_REQUIRED');
  });
});
