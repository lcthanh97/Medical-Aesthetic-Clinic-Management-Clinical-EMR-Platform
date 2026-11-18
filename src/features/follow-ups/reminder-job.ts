import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/infrastructure/database/prisma';
import { deriveFollowUpStatus } from '@/server/services/FollowUpService';
import { planFollowUpReminders, type ReminderAction, type ReminderKind } from './reminder-planning';

type ReminderRecord = {
  id: string; patientId: string; patientCode: string; version: number; status: string; decision: string;
  targetDate: Date | null; confirmedAt: Date | null; windowDays: number | null;
  appointments: Array<{ scheduledAt: Date; status: string }>;
  existingKeys: Set<string>;
};

export type ReminderCounts = {
  scanned: number; planned: number; created: Record<ReminderKind, number>;
  skippedAlreadySent: number; skippedQuietHours: number; cancelledStale: number;
  errors: number; dryRun: boolean;
};

export interface ReminderTransaction {
  loadBatch(afterId: string | null): Promise<ReminderRecord[]>;
  signals(record: ReminderRecord): Promise<{ completed: boolean; patientConfirmed: boolean }>;
  create(record: ReminderRecord, action: Extract<ReminderAction, { action: 'CREATE' }>, now: Date): Promise<boolean>;
  savepoint(): Promise<void>;
  rollbackRecord(): Promise<void>;
  releaseRecord(): Promise<void>;
  audit(counts: ReminderCounts): Promise<void>;
}

export interface ReminderStore {
  withLock<T>(work: (transaction: ReminderTransaction) => Promise<T>): Promise<T | null>;
}

function counters(dryRun: boolean): ReminderCounts {
  return { scanned: 0, planned: 0, created: { REMIND_3D: 0, REMIND_1D: 0 }, skippedAlreadySent: 0,
    skippedQuietHours: 0, cancelledStale: 0, errors: 0, dryRun };
}

export async function runFollowUpReminderJob(store: ReminderStore, options: { dryRun: boolean; asOf?: Date; now?: () => Date }) {
  const now = options.asOf ?? options.now?.() ?? new Date();
  if (!Number.isFinite(now.getTime())) throw new Error('FOLLOWUP_INVALID_TIME');
  return store.withLock(async (transaction) => {
    const counts = counters(options.dryRun);
    let afterId: string | null = null;
    while (true) {
      const batch = await transaction.loadBatch(afterId);
      if (!batch.length) break;
      for (const record of batch) {
        afterId = record.id;
        counts.scanned += 1;
        if (!options.dryRun) await transaction.savepoint();
        try {
          const signals = await transaction.signals(record);
          const derivedStatus = deriveFollowUpStatus(
            { notified: false, booked: false, completed: signals.completed },
            { status: record.status, targetDate: record.targetDate, windowDays: record.windowDays }, now,
          );
          const action = planFollowUpReminders({ ...record, completed: derivedStatus === 'COMPLETED',
            patientConfirmed: signals.patientConfirmed, now });
          if (action.action === 'SKIP') {
            if (action.reason === 'ALREADY_SENT') counts.skippedAlreadySent += 1;
            if (action.reason === 'QUIET_HOURS') counts.skippedQuietHours += 1;
          } else {
            counts.planned += 1;
            if (!options.dryRun) {
              if (await transaction.create(record, action, now)) counts.created[action.kind] += 1;
              else counts.skippedAlreadySent += 1;
            }
          }
          if (!options.dryRun) await transaction.releaseRecord();
        } catch {
          if (!options.dryRun) await transaction.rollbackRecord();
          counts.errors += 1;
          if (process.env.FOLLOWUP_DEBUG_LOG === 'true') console.error('[follow-up-reminder] RECORD_ERROR');
        }
      }
      if (batch.length < 200) break;
    }
    if (!options.dryRun && counts.created.REMIND_3D + counts.created.REMIND_1D + counts.cancelledStale > 0) {
      await transaction.audit(counts);
    }
    if (process.env.FOLLOWUP_DEBUG_LOG === 'true') console.info('[follow-up-reminder]', counts);
    return counts;
  });
}

function localDate(date: Date, withTime: boolean) {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' as const } : {}),
  }).format(date);
}

export interface InAppReminderChannel {
  create(transaction: Prisma.TransactionClient, record: ReminderRecord,
    action: Extract<ReminderAction, { action: 'CREATE' }>, now: Date): Promise<boolean>;
}

export const inAppReminderChannel: InAppReminderChannel = {
  async create(tx, record, action, now) {
    const content = action.appointment
      ? `Bạn có lịch tái khám vào ${localDate(action.at, true)}. Xem chi tiết trong cổng bệnh nhân.`
      : `Bác sĩ dặn tái khám vào khoảng ${localDate(action.at, false)}. Nếu cần đổi ngày, vui lòng liên hệ phòng khám.`;
    const rows = await tx.$queryRaw<Array<{ created: bigint }>>`
      WITH inserted AS (
        INSERT INTO "Notification" ("id", "recipient", "type", "content", "status", "scheduledAt", "followUpPlanId", "dedupeKey")
        VALUES (${randomUUID()}, ${record.patientCode}, 'APPOINTMENT_REMINDER', ${content}, 'DELIVERED', ${now}, ${record.id}, ${action.key})
        ON CONFLICT ("dedupeKey") DO NOTHING RETURNING "id"
      ), delivered AS (
        INSERT INTO "NotificationDelivery" ("id", "notificationId", "channel", "status", "attemptedAt", "deliveredAt")
        SELECT ${randomUUID()}, "id", 'IN_APP', 'DELIVERED', ${now}, ${now} FROM inserted
        RETURNING "id"
      ) SELECT COUNT(*)::bigint AS created FROM delivered
    `;
    return rows[0]?.created === 1n;
  },
};

export const prismaReminderStore: ReminderStore = {
  withLock(work) {
    return prisma.$transaction(async (tx) => {
      const lock = await tx.$queryRaw<Array<{ acquired: boolean }>>`SELECT pg_try_advisory_xact_lock(1200501, 1) AS acquired`;
      if (!lock[0]?.acquired) return null;
      const transaction: ReminderTransaction = {
        async loadBatch(afterId) {
          const rows = await tx.followUpPlan.findMany({
            where: afterId ? { id: { gt: afterId } } : {}, orderBy: { id: 'asc' }, take: 200,
            select: { id: true, patientId: true, version: true, status: true, decision: true, targetDate: true,
              confirmedAt: true, windowDays: true, patient: { select: { patientCode: true } },
              appointments: { select: { scheduledAt: true, status: true } },
              notifications: { select: { dedupeKey: true } },
            },
          });
          return rows.map((row) => ({ id: row.id, patientId: row.patientId, patientCode: row.patient.patientCode,
            version: row.version, status: row.status, decision: row.decision, targetDate: row.targetDate,
            confirmedAt: row.confirmedAt, windowDays: row.windowDays, appointments: row.appointments,
            existingKeys: new Set(row.notifications.map((item) => item.dedupeKey).filter((key): key is string => Boolean(key))) }));
        },
        async signals(record) {
          const completedAppointment = record.appointments.some((item) => ['COMPLETED', 'DONE'].includes(item.status.toUpperCase()));
          let completed = completedAppointment;
          if (!completed && record.targetDate && record.confirmedAt) {
            const window = Math.max(0, record.windowDays ?? 0);
            const lower = new Date(record.targetDate.getTime() - window * 86_400_000);
            const upper = new Date(record.targetDate.getTime() + (window + 1) * 86_400_000 - 1);
            const visit = await tx.visit.findFirst({ where: { patientId: record.patientId,
              visitDate: { gte: record.confirmedAt > lower ? record.confirmedAt : lower, lte: upper } }, select: { id: true } });
            completed = Boolean(visit);
          }
          const logs = await tx.auditLog.findMany({ where: { action: 'PATIENT_CONFIRMED_FOLLOWUP', entity: 'FollowUpPlan', entityId: record.id, accountId: null },
            orderBy: { createdAt: 'desc' }, take: 10, select: { metadata: true } });
          const patientConfirmed = logs.some((log) => {
            const data = log.metadata;
            return data && typeof data === 'object' && !Array.isArray(data)
              && data.actorType === 'PATIENT' && data.patientId === record.patientId && data.planId === record.id;
          });
          return { completed, patientConfirmed };
        },
        create(record, action, now) { return inAppReminderChannel.create(tx, record, action, now); },
        async savepoint() { await tx.$executeRawUnsafe('SAVEPOINT followup_reminder_record'); },
        async rollbackRecord() { await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT followup_reminder_record'); await tx.$executeRawUnsafe('RELEASE SAVEPOINT followup_reminder_record'); },
        async releaseRecord() { await tx.$executeRawUnsafe('RELEASE SAVEPOINT followup_reminder_record'); },
        async audit(counts) { await tx.auditLog.create({ data: { accountId: null, action: 'FOLLOWUP_REMINDER_RUN', entity: 'FollowUpReminderJob', metadata: { actorType: 'SYSTEM', counts } } }); },
      };
      return work(transaction);
    }, { maxWait: 10_000, timeout: 120_000 });
  },
};
