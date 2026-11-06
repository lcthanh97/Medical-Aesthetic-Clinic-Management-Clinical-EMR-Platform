import { createHash } from 'node:crypto';

export interface NotificationDeliveryAdapter {
  // An accepted request can be marked SENT. Delivery requires a verified receipt.
  send(input: {
    idempotencyKey: string;
    verifiedRecipient: string;
    body: string;
  }): Promise<
    | { kind: 'accepted'; providerMessageId: string }
    | { kind: 'rejected'; retryable: boolean; errorCode: string }
  >;
}

type DeliveryPrerequisites = {
  templateApproved: boolean;
  channel: string;
  hasVerifiedConsent: boolean;
  providerConfigured: boolean;
};

function validVersion(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function eventKey(parts: Array<string | number>) {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}

export function planFollowUpReminder(input: DeliveryPrerequisites & {
  appointmentId: string;
  appointmentRevision: number;
  scheduledAt: Date;
  now: Date;
  followUpEvidence: {
    appointmentId: string;
    appointmentPatientId: string;
    sourceVisitId: string;
    sourceVisitPatientId: string;
    confirmedByEmployeeId: string;
    confirmedAt: Date;
  } | null;
  appointmentEligible: boolean;
  templateCode: string;
  templateVersion: number;
  rule: {
    code: string;
    enabled: boolean;
    approved: boolean;
    offsetMinutes: number;
    timezone: 'Asia/Ho_Chi_Minh';
    quietHours: { startMinute: number; endMinute: number } | null;
  };
}) {
  const { rule, now, scheduledAt } = input;
  const evidence = input.followUpEvidence;
  if (!rule.approved || !rule.enabled || !input.appointmentEligible
    || !evidence || evidence.appointmentId !== input.appointmentId || !evidence.sourceVisitId.trim()
    || !evidence.appointmentPatientId.trim() || evidence.appointmentPatientId !== evidence.sourceVisitPatientId
    || !evidence.confirmedByEmployeeId.trim() || !Number.isFinite(evidence.confirmedAt.getTime())
    || evidence.confirmedAt > now
    || !input.templateApproved || !input.hasVerifiedConsent || !input.providerConfigured
    || !input.appointmentId.trim() || !input.channel.trim() || !rule.code.trim()
    || !input.templateCode.trim() || !validVersion(input.appointmentRevision) || !validVersion(input.templateVersion)
    || !Number.isInteger(rule.offsetMinutes) || rule.offsetMinutes >= 0
    || !Number.isFinite(now.getTime()) || !Number.isFinite(scheduledAt.getTime())) return null;

  let dueAt = new Date(scheduledAt.getTime() + rule.offsetMinutes * 60_000);
  if (!Number.isFinite(dueAt.getTime()) || dueAt < now) return null;

  if (rule.quietHours) {
    const { startMinute, endMinute } = rule.quietHours;
    if (![startMinute, endMinute].every((minute) => Number.isInteger(minute) && minute >= 0 && minute < 1440)
      || startMinute === endMinute) return null;

    const localClock = new Intl.DateTimeFormat('en-GB', {
      timeZone: rule.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(dueAt);
    const hour = Number(localClock.find((part) => part.type === 'hour')?.value);
    const minute = Number(localClock.find((part) => part.type === 'minute')?.value);
    const localMinute = hour * 60 + minute;
    const isQuiet = startMinute < endMinute
      ? localMinute >= startMinute && localMinute < endMinute
      : localMinute >= startMinute || localMinute < endMinute;
    if (isQuiet) {
      const remainingMinutes = (endMinute - localMinute + 1440) % 1440;
      dueAt = new Date(Math.floor(dueAt.getTime() / 60_000) * 60_000 + remainingMinutes * 60_000);
    }
  }

  if (dueAt >= scheduledAt) return null;
  return {
    dueAt,
    idempotencyKey: eventKey(['follow-up', input.appointmentId, input.appointmentRevision, scheduledAt.toISOString(),
      rule.code, rule.offsetMinutes, input.channel, input.templateCode, input.templateVersion]),
  };
}

export function planAftercareNotice(input: Omit<DeliveryPrerequisites, 'templateApproved'> & {
  sessionId: string;
  completionConfirmed: boolean;
  completedAt: Date | null;
  source: {
    visitPatientId: string;
    planPatientId: string;
    planVisitPatientId: string;
    sessionStageId: string;
    stepStageId: string;
    procedureId: string;
    procedureCategory: string;
    instructionProcedureId: string;
    instructionPatientId: string;
    instructionSessionId: string;
    instructionTemplateId: string;
    instructionTemplateVersion: number;
  } | null;
  template: {
    id: string;
    version: number;
    status: 'DRAFT' | 'APPROVED' | 'RETIRED';
    procedureCategory: string;
    channel: string;
    approvedByEmployeeId: string | null;
    approvedAt: Date | null;
  } | null;
  instructionApproved: boolean;
  instructionVersion: number;
  hasAdverseReaction: boolean;
}) {
  const { source, template } = input;
  if (!input.completionConfirmed || !input.completedAt || !Number.isFinite(input.completedAt.getTime())
    || !source || !source.visitPatientId.trim() || source.planPatientId !== source.visitPatientId
    || source.planVisitPatientId !== source.visitPatientId || source.instructionPatientId !== source.visitPatientId
    || !source.sessionStageId.trim() || source.sessionStageId !== source.stepStageId
    || !source.procedureId.trim() || source.procedureId !== source.instructionProcedureId
    || source.instructionSessionId !== input.sessionId
    || !template || !template.id.trim() || template.id !== source.instructionTemplateId
    || !validVersion(template.version) || template.version !== source.instructionTemplateVersion
    || template.status !== 'APPROVED' || !template.approvedByEmployeeId?.trim()
    || !template.approvedAt || !Number.isFinite(template.approvedAt.getTime())
    || !source.procedureCategory.trim() || template.procedureCategory !== source.procedureCategory
    || template.channel !== input.channel || input.hasAdverseReaction || !input.instructionApproved
    || !input.hasVerifiedConsent || !input.providerConfigured
    || !input.sessionId.trim() || !input.channel.trim() || !validVersion(input.instructionVersion)) return null;

  return {
    templateId: template.id,
    templateVersion: template.version,
    idempotencyKey: eventKey(['aftercare', input.sessionId, input.instructionVersion, input.channel]),
  };
}

export function findObsoleteFollowUpReminders(
  appointment: { id: string; revision: number; eligible: boolean },
  reminders: Array<{ id: string; appointmentId: string; revision: number; pending: boolean }>,
): string[] {
  return reminders
    .filter((reminder) => reminder.pending && reminder.appointmentId === appointment.id
      && (!appointment.eligible || reminder.revision !== appointment.revision))
    .map((reminder) => reminder.id);
}
