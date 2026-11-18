import type { Prisma } from '@prisma/client';
import { prisma } from '@/infrastructure/database/prisma';
import type { AftercareTemplateCreateInput, FollowUpDraftInput } from '@/features/follow-ups/follow-ups.schema';
import type { FollowUpActor, FollowUpAppointmentLink, IFollowUpRepository } from '@/server/repositories/IFollowUpRepository';

const cancelled = ['CANCELLED', 'CANCELED'];

function planSnapshot(value: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export class PrismaFollowUpRepository implements IFollowUpRepository {
  async visitExists(visitId: string) {
    return Boolean(await prisma.visit.findUnique({ where: { id: visitId }, select: { id: true } }));
  }

  async getAssignedVisit(visitId: string, actor: FollowUpActor) {
    const visit = await prisma.visit.findFirst({
      where: { id: visitId, employeeId: actor.employeeId, employee: { is: { accountId: actor.accountId } } },
      select: { id: true, patientId: true, visitDate: true, employee: { select: { departmentId: true } } },
    });
    return visit ? { id: visit.id, patientId: visit.patientId, visitDate: visit.visitDate, departmentId: visit.employee?.departmentId ?? null } : null;
  }

  async getPlanForVisit(visitId: string): Promise<Record<string, unknown> | null> {
    return await prisma.followUpPlan.findUnique({ where: { visitId } }) as unknown as Record<string, unknown> | null;
  }

  async saveDraft(
    visitId: string,
    actor: FollowUpActor,
    input: FollowUpDraftInput,
    copiedTemplate?: { id: string; version: number; homeCare: string | null; avoid: string | null; warningSigns: string | null },
  ) {
    return prisma.$transaction(async (tx) => {
      const visit = await tx.visit.findFirst({
        where: { id: visitId, employeeId: actor.employeeId, employee: { is: { accountId: actor.accountId } } },
        select: { id: true, patientId: true },
      });
      if (!visit) throw new Error('FOLLOWUP_VISIT_NOT_FOUND');
      const before = await tx.followUpPlan.findUnique({ where: { visitId } });
      const wasConfirmed = before?.status === 'CONFIRMED';
      const hasNotice = before ? Boolean(await tx.notification.findFirst({ where: { followUpPlanId: before.id }, select: { id: true } })) : false;
      const targetDate = input.targetDate ? new Date(`${input.targetDate}T00:00:00+07:00`) : null;
      const common = {
        patientId: visit.patientId,
        doctorId: actor.employeeId,
        decision: input.decision,
        status: 'DRAFT' as const,
        targetDate,
        windowDays: input.windowDays ?? null,
        priority: input.priority ?? 'NORMAL' as const,
        reason: input.reason?.trim() || null,
        preparation: input.preparation?.trim() || null,
        homeCare: input.homeCare?.trim() ?? copiedTemplate?.homeCare ?? null,
        avoid: input.avoid?.trim() ?? copiedTemplate?.avoid ?? null,
        warningSigns: input.warningSigns?.trim() ?? copiedTemplate?.warningSigns ?? null,
        patientMessage: input.patientMessage?.trim() || null,
        hideDiagnosis: input.hideDiagnosis ?? true,
        templateId: copiedTemplate?.id ?? null,
        templateVersion: copiedTemplate?.version ?? null,
        treatmentSessionId: input.treatmentSessionId ?? null,
        confirmedAt: null,
        ...(wasConfirmed ? { version: before!.version + 1 } : {}),
      };
      const plan = before
        ? await tx.followUpPlan.update({ where: { id: before.id }, data: common })
        : await tx.followUpPlan.create({ data: { ...common, visitId } });
      if (wasConfirmed) {
        await tx.auditLog.create({ data: {
          accountId: actor.accountId,
          action: 'FOLLOWUP_CONFIRMED_PLAN_EDITED',
          entity: 'FollowUpPlan',
          entityId: plan.id,
          metadata: { before: planSnapshot(before as unknown as Record<string, unknown>), after: planSnapshot(plan as unknown as Record<string, unknown>) },
        } });
      }
      return { plan: plan as unknown as Record<string, unknown>, wasConfirmed, needsRenotify: wasConfirmed && hasNotice };
    }, { isolationLevel: 'Serializable', maxWait: 10_000, timeout: 15_000 });
  }

  async confirm(visitId: string, actor: FollowUpActor) {
    return prisma.$transaction(async (tx) => {
      const visit = await tx.visit.findFirst({
        where: { id: visitId, employeeId: actor.employeeId, employee: { is: { accountId: actor.accountId } } },
        select: { id: true, patientId: true },
      });
      if (!visit) throw new Error('FOLLOWUP_VISIT_NOT_FOUND');
      const before = await tx.followUpPlan.findUnique({ where: { visitId } });
      if (!before) throw new Error('FOLLOWUP_PLAN_NOT_FOUND');
      if (before.status === 'CANCELLED') throw new Error('FOLLOWUP_CANCELLED');
      if (before.status === 'CONFIRMED') throw new Error('FOLLOWUP_ALREADY_CONFIRMED');
      let treatmentSessionId = before.treatmentSessionId;
      let linkedToExistingSession = false;
      if (before.targetDate) {
        const window = before.windowDays ?? 0;
        const lower = new Date(before.targetDate.getTime() - window * 86_400_000);
        const upper = new Date(before.targetDate.getTime() + window * 86_400_000 + 86_399_999);
        const existing = await tx.appointment.findFirst({
          where: { patientId: visit.patientId, scheduledAt: { gte: lower, lte: upper }, status: { notIn: cancelled }, treatmentSessionId: { not: null } },
          orderBy: { scheduledAt: 'asc' },
          select: { treatmentSessionId: true },
        });
        if (existing?.treatmentSessionId) {
          treatmentSessionId = existing.treatmentSessionId;
          linkedToExistingSession = true;
        }
      }
      const plan = await tx.followUpPlan.update({
        where: { id: before.id },
        data: { status: 'CONFIRMED', confirmedAt: new Date(), treatmentSessionId },
      });
      await tx.auditLog.create({ data: {
        accountId: actor.accountId,
        action: 'FOLLOWUP_PLAN_CONFIRMED',
        entity: 'FollowUpPlan',
        entityId: plan.id,
        metadata: { before: planSnapshot(before as unknown as Record<string, unknown>), after: planSnapshot(plan as unknown as Record<string, unknown>) },
      } });
      return { plan: plan as unknown as Record<string, unknown>, linkedToExistingSession };
    }, { isolationLevel: 'Serializable', maxWait: 10_000, timeout: 15_000 });
  }

  async cancel(visitId: string, actor: FollowUpActor, cancelReason: string) {
    return prisma.$transaction(async (tx) => {
      const visit = await tx.visit.findFirst({ where: { id: visitId, employeeId: actor.employeeId, employee: { is: { accountId: actor.accountId } } }, select: { id: true } });
      if (!visit) throw new Error('FOLLOWUP_VISIT_NOT_FOUND');
      const before = await tx.followUpPlan.findUnique({ where: { visitId } });
      if (!before) throw new Error('FOLLOWUP_PLAN_NOT_FOUND');
      if (!['DRAFT', 'CONFIRMED'].includes(before.status)) throw new Error('FOLLOWUP_NOT_CANCELLABLE');
      const plan = await tx.followUpPlan.update({ where: { id: before.id }, data: { status: 'CANCELLED', cancelReason, confirmedAt: before.confirmedAt } });
      await tx.auditLog.create({ data: {
        accountId: actor.accountId,
        action: 'FOLLOWUP_PLAN_CANCELLED',
        entity: 'FollowUpPlan',
        entityId: plan.id,
        metadata: { before: planSnapshot(before as unknown as Record<string, unknown>), after: planSnapshot(plan as unknown as Record<string, unknown>) },
      } });
      return plan as unknown as Record<string, unknown>;
    }, { isolationLevel: 'Serializable', maxWait: 10_000, timeout: 15_000 });
  }

  async hasLinkedNotification(planId: string): Promise<boolean> {
    return Boolean(await prisma.notification.findFirst({ where: { followUpPlanId: planId }, select: { id: true } }));
  }

  async getDerivedSignals(planId: string, patientId: string, confirmedAt: Date | null, targetDate: Date | null, windowDays: number | null) {
    const appointments = await prisma.appointment.findMany({
      where: { followUpPlanId: planId, status: { notIn: cancelled } },
      select: { id: true, status: true, scheduledAt: true },
    });
    const booked = appointments.length > 0;
    let completed = appointments.some((appointment) => ['COMPLETED', 'DONE'].includes(appointment.status.toUpperCase()));
    if (!completed && targetDate) {
      const range = windowDays ?? 0;
      const from = new Date(targetDate.getTime() - range * 86_400_000);
      const to = new Date(targetDate.getTime() + range * 86_400_000 + 86_399_999);
      const visitFrom = confirmedAt && confirmedAt > from ? confirmedAt : from;
      const visit = await prisma.visit.findFirst({
        where: { patientId, visitDate: { gte: visitFrom, lte: to } },
        select: { id: true },
      });
      completed = Boolean(visit);
    }
    let notified = false;
    try {
      const rows = await prisma.$queryRaw<Array<{ notified: boolean }>>`
        SELECT EXISTS (
          SELECT 1
          FROM "Notification" n
          JOIN "NotificationDelivery" d ON d."notificationId" = n."id"
          WHERE n."followUpPlanId" = ${planId}
            AND UPPER(d."status") IN ('SENT', 'DELIVERED', 'SUCCESS')
        ) AS notified
      `;
      notified = rows[0]?.notified === true;
    } catch {
      // Optional delivery table query: derived status remains usable if delivery lookup is unavailable.
    }
    return { notified, booked, completed };
  }

  async getDoctorDepartmentId(actor: FollowUpActor): Promise<string | null> {
    const employee = await prisma.employee.findFirst({ where: { id: actor.employeeId, accountId: actor.accountId }, select: { departmentId: true } });
    return employee?.departmentId ?? null;
  }

  async getTemplateForApply(templateId: string, actor: FollowUpActor, departmentId: string | null, appliesTo?: string) {
    return prisma.aftercareTemplate.findFirst({
      where: {
        id: templateId,
        isActive: true,
        ...(appliesTo ? { appliesTo } : {}),
        OR: [
          { scope: 'CLINIC' },
          { scope: 'PERSONAL', ownerId: actor.employeeId },
          ...(departmentId ? [{ scope: 'DEPARTMENT' as const, owner: { is: { departmentId } } }] : []),
        ],
      },
      select: { id: true, name: true, scope: true, version: true, homeCare: true, avoid: true, warningSigns: true },
    });
  }

  async listTemplates(actor: FollowUpActor, filters: { appliesTo?: string; scope?: 'PERSONAL' | 'DEPARTMENT' | 'CLINIC'; departmentId: string | null }) {
    const accessibleScopes = [
      { scope: 'CLINIC' as const },
      { scope: 'PERSONAL' as const, ownerId: actor.employeeId },
      ...(filters.departmentId ? [{ scope: 'DEPARTMENT' as const, owner: { is: { departmentId: filters.departmentId } } }] : []),
    ];
    return await prisma.aftercareTemplate.findMany({
      where: {
        isActive: true,
        ...(filters.appliesTo ? { appliesTo: filters.appliesTo } : {}),
        OR: filters.scope ? accessibleScopes.filter((item) => item.scope === filters.scope) : accessibleScopes,
      },
      orderBy: [{ scope: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, scope: true, appliesTo: true, homeCare: true, avoid: true, warningSigns: true, version: true },
    }) as unknown as Array<Record<string, unknown>>;
  }

  async createTemplate(actor: FollowUpActor, _departmentId: string | null, input: AftercareTemplateCreateInput) {
    return await prisma.aftercareTemplate.create({
      data: {
        name: input.name,
        scope: 'PERSONAL',
        appliesTo: input.appliesTo?.trim() || null,
        homeCare: input.homeCare?.trim() || null,
        avoid: input.avoid?.trim() || null,
        warningSigns: input.warningSigns?.trim() || null,
        ownerId: actor.employeeId,
      },
      select: { id: true, name: true, scope: true, appliesTo: true, homeCare: true, avoid: true, warningSigns: true, version: true, isActive: true },
    }) as unknown as Record<string, unknown>;
  }

  async listForDoctor(actor: FollowUpActor) {
    return await prisma.followUpPlan.findMany({
      where: { doctorId: actor.employeeId, status: 'CONFIRMED', decision: 'SCHEDULED' },
      orderBy: { targetDate: 'asc' },
      select: {
        id: true, visitId: true, patientId: true, decision: true, status: true, targetDate: true,
        windowDays: true, priority: true, reason: true, confirmedAt: true,
        patient: { select: { fullName: true, patientCode: true } },
      },
    }) as unknown as Array<Record<string, unknown>>;
  }

  async countAssignedVisitsWithoutDecision(actor: FollowUpActor): Promise<number> {
    return prisma.visit.count({
      where: {
        employeeId: actor.employeeId,
        status: { in: ['WAITING', 'CHECKED_IN', 'IN_PROGRESS', 'EXAMINING', 'WAITING_RESULT', 'RESULT_READY'] },
        OR: [{ followUpPlan: { is: null } }, { followUpPlan: { isNot: { status: 'CONFIRMED' } } }],
      },
    });
  }

  async getNextStepInterval(visitId: string, actor: FollowUpActor) {
    const rows = await prisma.$queryRaw<Array<{ intervalDays: number | null; baseDate: Date | null; sessionId: string | null }>>`
      WITH active_plan AS (
        SELECT tp."id" AS "planId", tp."patientId", tp."protocolTemplateId", tp."startDate", v."visitDate"
        FROM "TreatmentPlan" tp
        JOIN "Visit" v ON v."patientId" = tp."patientId"
        WHERE v."id" = ${visitId}
          AND v."employeeId" = ${actor.employeeId}
          AND tp."status" IN ('ACTIVE', 'IN_PROGRESS')
        ORDER BY tp."updatedAt" DESC
        LIMIT 1
      ), active_stage AS (
        SELECT st."id", st."planId", st."orderNo", st."actualStartDate"
        FROM "TreatmentStage" st
        JOIN active_plan ap ON ap."planId" = st."planId"
        WHERE st."status" = 'IN_PROGRESS'
        ORDER BY st."orderNo"
        LIMIT 1
      ), next_step AS (
        SELECT step."id", step."stageId", step."orderNo", step."intervalDays",
               ap."patientId", ap."protocolTemplateId", st."actualStartDate", ap."startDate", ap."visitDate"
        FROM "TreatmentStep" step
        JOIN active_stage st ON st."id" = step."stageId"
        JOIN active_plan ap ON ap."planId" = st."planId"
        WHERE step."status" IN ('PENDING', 'SCHEDULED')
        ORDER BY step."orderNo"
        LIMIT 1
      )
      SELECT
        COALESCE(ns."intervalDays", pst."intervalDays") AS "intervalDays",
        COALESCE(
          (SELECT MAX(done."completedAt")
           FROM "TreatmentSession" done
           JOIN "TreatmentStep" prior ON prior."id" = done."stepId"
           WHERE prior."stageId" = ns."stageId"
             AND prior."orderNo" < ns."orderNo"
             AND done."status" = 'COMPLETED'),
          ns."actualStartDate", ns."startDate", ns."visitDate"
        ) AS "baseDate",
        (SELECT upcoming."id"
         FROM "TreatmentSession" upcoming
         WHERE upcoming."stepId" = ns."id"
           AND upcoming."status" NOT IN ('CANCELLED', 'COMPLETED')
         ORDER BY upcoming."sessionNo"
         LIMIT 1) AS "sessionId"
      FROM next_step ns
      LEFT JOIN "ProtocolStageTemplate" pstage
        ON pstage."protocolId" = ns."protocolTemplateId"
       AND pstage."orderNo" = (SELECT st2."orderNo" FROM active_stage st2 LIMIT 1)
      LEFT JOIN "ProtocolStepTemplate" pst
        ON pst."stageTemplateId" = pstage."id"
       AND pst."orderNo" = ns."orderNo"
      WHERE COALESCE(ns."intervalDays", pst."intervalDays") IS NOT NULL
      LIMIT 1
    `;
    const row = rows[0];
    if (!row || row.intervalDays === null || !row.baseDate) return null;
    const suggested = new Date(row.baseDate.getTime() + row.intervalDays * 86_400_000);
    let alreadyScheduled: FollowUpAppointmentLink | null = null;
    if (row.sessionId) {
      const intervalStart = row.baseDate;
      const appointment = await prisma.appointment.findFirst({
        where: {
          treatmentSessionId: row.sessionId,
          status: { notIn: cancelled },
          scheduledAt: { gte: intervalStart, lte: new Date(suggested.getTime() + 86_399_999) },
        },
        orderBy: { scheduledAt: 'asc' },
        select: { id: true, treatmentSessionId: true, scheduledAt: true, status: true },
      });
      alreadyScheduled = appointment as FollowUpAppointmentLink | null;
    }
    return { intervalDays: row.intervalDays, baseDate: row.baseDate, sessionId: row.sessionId, alreadyScheduled };
  }
}
