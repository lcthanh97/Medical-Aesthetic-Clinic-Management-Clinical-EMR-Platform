import { describe, expect, it } from 'vitest';
import { findObsoleteFollowUpReminders, planAftercareNotice, planFollowUpReminder } from '@/server/policies/NotificationPlanning';

const delivery = { templateApproved: true, channel: 'SMS', hasVerifiedConsent: true, providerConfigured: true };
const reminder = {
  ...delivery,
  appointmentId: 'a1', appointmentEligible: true,
  followUpEvidence: {
    appointmentId: 'a1', appointmentPatientId: 'p1', sourceVisitId: 'v1',
    sourceVisitPatientId: 'p1', confirmedByEmployeeId: 'e1', confirmedAt: new Date('2026-11-04T00:00:00Z'),
  },
  appointmentRevision: 1,
  now: new Date('2026-11-05T00:00:00Z'), scheduledAt: new Date('2026-11-07T15:00:00Z'),
  templateCode: 'reminder', templateVersion: 1,
  rule: {
    code: 'REMINDER_A',
    enabled: true, approved: true, offsetMinutes: -1440, timezone: 'Asia/Ho_Chi_Minh' as const,
    quietHours: { startMinute: 20 * 60, endMinute: 7 * 60 },
  },
};

describe('notification planning guards', () => {
  it('requires an approved rule, valid follow-up, consent, and a configured provider', () => {
    expect(planFollowUpReminder({ ...reminder, rule: { ...reminder.rule, approved: false } })).toBeNull();
    expect(planFollowUpReminder({ ...reminder, followUpEvidence: null })).toBeNull();
    expect(planFollowUpReminder({ ...reminder, followUpEvidence: { ...reminder.followUpEvidence, sourceVisitPatientId: 'p2' } })).toBeNull();
    expect(planFollowUpReminder({ ...reminder, appointmentEligible: false })).toBeNull();
    expect(planFollowUpReminder({ ...reminder, hasVerifiedConsent: false })).toBeNull();
    expect(planFollowUpReminder({ ...reminder, providerConfigured: false })).toBeNull();
  });

  it('cancels only pending reminders of the obsolete revision, or all pending when ineligible', () => {
    const queued = [
      { id: 'old', appointmentId: 'a1', revision: 1, pending: true },
      { id: 'sent', appointmentId: 'a1', revision: 1, pending: false },
      { id: 'current', appointmentId: 'a1', revision: 2, pending: true },
      { id: 'other', appointmentId: 'a2', revision: 1, pending: true },
    ];
    expect(findObsoleteFollowUpReminders({ id: 'a1', revision: 2, eligible: true }, queued)).toEqual(['old']);
    expect(findObsoleteFollowUpReminders({ id: 'a1', revision: 2, eligible: false }, queued)).toEqual(['old', 'current']);
  });

  it('handles quiet hours in Vietnam and keys reminders by schedule revision', () => {
    const planned = planFollowUpReminder(reminder);
    expect(planned?.dueAt.toISOString()).toBe('2026-11-07T00:00:00.000Z');
    expect(planFollowUpReminder(reminder)?.idempotencyKey).toBe(planned?.idempotencyKey);
    expect(planFollowUpReminder({ ...reminder, scheduledAt: new Date('2026-11-08T15:00:00Z') })?.idempotencyKey)
      .not.toBe(planned?.idempotencyKey);
    // Rescheduling back to the same timestamp still has a new revision.
    expect(planFollowUpReminder({ ...reminder, appointmentRevision: 3 })?.idempotencyKey)
      .not.toBe(planned?.idempotencyKey);
    expect(planFollowUpReminder({ ...reminder, rule: { ...reminder.rule, code: 'REMINDER_B' } })?.idempotencyKey)
      .not.toBe(planned?.idempotencyKey);
    expect(planFollowUpReminder({ ...reminder, now: new Date('2026-11-06T20:00:00Z') })).toBeNull();
    expect(planFollowUpReminder({ ...reminder, rule: { ...reminder.rule, offsetMinutes: -120 } })).toBeNull();
  });

  it('blocks unapproved or clinically exceptional aftercare and keys by instruction version', () => {
    const session = {
      ...delivery, sessionId: 's1', completionConfirmed: true, completedAt: new Date(),
      source: {
        visitPatientId: 'p1', planPatientId: 'p1', planVisitPatientId: 'p1',
        sessionStageId: 'g1', stepStageId: 'g1', procedureId: 'pc1', procedureCategory: 'LASER',
        instructionProcedureId: 'pc1', instructionPatientId: 'p1', instructionSessionId: 's1',
        instructionTemplateId: 'tpl1', instructionTemplateVersion: 1,
      },
      template: { id: 'tpl1', version: 1, status: 'APPROVED' as const, channel: 'SMS', procedureCategory: 'LASER',
        approvedByEmployeeId: 'e1', approvedAt: new Date('2026-11-04T00:00:00Z') },
      instructionApproved: true, instructionVersion: 1, hasAdverseReaction: false,
    };
    expect(planAftercareNotice({ ...session, template: { ...session.template, status: 'DRAFT' } })).toBeNull();
    expect(planAftercareNotice({ ...session, template: { ...session.template, procedureCategory: 'PEEL' } })).toBeNull();
    expect(planAftercareNotice({ ...session, template: { ...session.template, version: 2 } })).toBeNull();
    expect(planAftercareNotice({ ...session, completedAt: null })).toBeNull();
    expect(planAftercareNotice({ ...session, instructionVersion: 0 })).toBeNull();
    expect(planAftercareNotice({ ...session, hasAdverseReaction: true })).toBeNull();
    expect(planAftercareNotice({ ...session, source: { ...session.source, instructionProcedureId: 'pc2' } })).toBeNull();
    const plan = planAftercareNotice(session);
    expect(plan).not.toBeNull();
    expect(planAftercareNotice(session)).toEqual(plan);
    expect(planAftercareNotice({ ...session, instructionVersion: 2 })).not.toEqual(plan);
  });
});
