import type {
  IReportsRepository,
  ReportsActorScope,
  ReportsFilters,
} from '@/server/repositories/IReportsRepository';
import { prisma } from '@/infrastructure/database/prisma';
import { Prisma } from '@prisma/client';

export class PrismaReportsRepository implements IReportsRepository {
  async getDashboardReport(
    actor: ReportsActorScope,
    filters: ReportsFilters,
    access: { finance: boolean; treatment: boolean },
  ) {
    const visitConditions: Prisma.Sql[] = [
      Prisma.sql`v."employeeId" = ${actor.employeeId}`,
      Prisma.sql`v."visitDate" >= ${filters.startAt}`,
      Prisma.sql`v."visitDate" < ${filters.endExclusive}`,
    ];
    if (filters.visitStatus) visitConditions.push(Prisma.sql`v.status = ${filters.visitStatus}`);
    const visitWhere = Prisma.join(visitConditions, ' AND ');

    const appointmentConditions: Prisma.Sql[] = [
      Prisma.sql`a."employeeId" = ${actor.employeeId}`,
      Prisma.sql`a."scheduledAt" >= ${filters.startAt}`,
      Prisma.sql`a."scheduledAt" < ${filters.endExclusive}`,
    ];
    if (filters.appointmentStatus) appointmentConditions.push(Prisma.sql`a.status = ${filters.appointmentStatus}`);
    const appointmentWhere = Prisma.join(appointmentConditions, ' AND ');

    return prisma.$transaction(async (tx) => {
      const [visitSummary, visitStatuses, visitDates, appointmentSummary, appointmentStatuses, appointmentDates] = await Promise.all([
        tx.$queryRaw<Array<{ count: string }>>(Prisma.sql`SELECT count(*)::text AS count FROM "Visit" v WHERE ${visitWhere}`),
        tx.$queryRaw<Array<{ status: string; count: string }>>(Prisma.sql`SELECT v.status, count(*)::text AS count FROM "Visit" v WHERE ${visitWhere} GROUP BY v.status ORDER BY v.status`),
        tx.$queryRaw<Array<{ date: string; count: string }>>(Prisma.sql`SELECT to_char(v."visitDate"::date, 'YYYY-MM-DD') AS date, count(*)::text AS count FROM "Visit" v WHERE ${visitWhere} GROUP BY v."visitDate"::date ORDER BY v."visitDate"::date`),
        tx.$queryRaw<Array<{ count: string }>>(Prisma.sql`SELECT count(*)::text AS count FROM "Appointment" a WHERE ${appointmentWhere}`),
        tx.$queryRaw<Array<{ status: string; count: string }>>(Prisma.sql`SELECT a.status, count(*)::text AS count FROM "Appointment" a WHERE ${appointmentWhere} GROUP BY a.status ORDER BY a.status`),
        tx.$queryRaw<Array<{ date: string; count: string }>>(Prisma.sql`SELECT to_char(a."scheduledAt"::date, 'YYYY-MM-DD') AS date, count(*)::text AS count FROM "Appointment" a WHERE ${appointmentWhere} GROUP BY a."scheduledAt"::date ORDER BY a."scheduledAt"::date`),
      ]);

      let finance: Awaited<ReturnType<typeof this.getFinancialData>> | null = null;
      if (access.finance) finance = await this.getFinancialData(tx, actor, filters);

      let treatment: Awaited<ReturnType<typeof this.getTreatmentData>> | null = null;
      if (access.treatment) treatment = await this.getTreatmentData(tx, actor, filters);

      return {
        visits: {
          total: Number(visitSummary[0]?.count ?? 0),
          byStatus: visitStatuses.map((row) => ({ status: row.status, count: Number(row.count) })),
          byDate: visitDates.map((row) => ({ date: row.date, count: Number(row.count) })),
        },
        appointments: {
          total: Number(appointmentSummary[0]?.count ?? 0),
          byStatus: appointmentStatuses.map((row) => ({ status: row.status, count: Number(row.count) })),
          byDate: appointmentDates.map((row) => ({ date: row.date, count: Number(row.count) })),
        },
        finance,
        treatment,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  private async getFinancialData(
    tx: Prisma.TransactionClient,
    actor: { employeeId: string },
    filters: import('@/server/repositories/IReportsRepository').ReportsFilters,
  ) {
    const conditions = Prisma.sql`v."employeeId" = ${actor.employeeId}
      AND p."paidAt" >= ${filters.startAt}
      AND p."paidAt" < ${filters.endExclusive}`;
    const fromAndJoins = Prisma.sql`FROM "Payment" p
      JOIN "Invoice" i ON i.id = p."invoiceId"
      JOIN "Visit" v ON v.id = i."visitId"`;
    const [summary, byMethod, byDate] = await Promise.all([
      tx.$queryRaw<Array<{ count: string; amount: string }>>(Prisma.sql`SELECT count(*)::text AS count, COALESCE(sum(p.amount), 0)::text AS amount ${fromAndJoins} WHERE ${conditions}`),
      tx.$queryRaw<Array<{ method: string; count: string; amount: string }>>(Prisma.sql`SELECT p.method, count(*)::text AS count, sum(p.amount)::text AS amount ${fromAndJoins} WHERE ${conditions} GROUP BY p.method ORDER BY p.method`),
      tx.$queryRaw<Array<{ date: string; count: string; amount: string }>>(Prisma.sql`SELECT to_char(p."paidAt"::date, 'YYYY-MM-DD') AS date, count(*)::text AS count, sum(p.amount)::text AS amount ${fromAndJoins} WHERE ${conditions} GROUP BY p."paidAt"::date ORDER BY p."paidAt"::date`),
    ]);
    return {
      paymentCount: Number(summary[0]?.count ?? 0),
      paymentAmount: summary[0]?.amount ?? '0',
      byMethod: byMethod.map((row) => ({ method: row.method, count: Number(row.count), amount: row.amount })),
      byDate: byDate.map((row) => ({ date: row.date, count: Number(row.count), amount: row.amount })),
    };
  }

  private async getTreatmentData(
    tx: Prisma.TransactionClient,
    actor: { employeeId: string },
    filters: import('@/server/repositories/IReportsRepository').ReportsFilters,
  ) {
    const sessionConditions: Prisma.Sql[] = [
      Prisma.sql`v."employeeId" = ${actor.employeeId}`,
      Prisma.sql`ts."createdAt" >= ${filters.startAt}`,
      Prisma.sql`ts."createdAt" < ${filters.endExclusive}`,
    ];
    if (filters.treatmentSessionStatus) sessionConditions.push(Prisma.sql`ts.status = ${filters.treatmentSessionStatus}`);
    const sessionWhere = Prisma.join(sessionConditions, ' AND ');
    const consumptionConditions: Prisma.Sql[] = [
      Prisma.sql`v."employeeId" = ${actor.employeeId}`,
      Prisma.sql`tc."createdAt" >= ${filters.startAt}`,
      Prisma.sql`tc."createdAt" < ${filters.endExclusive}`,
    ];
    if (filters.treatmentSessionStatus) consumptionConditions.push(Prisma.sql`ts.status = ${filters.treatmentSessionStatus}`);
    const consumptionWhere = Prisma.join(consumptionConditions, ' AND ');
    const sessionJoin = Prisma.sql`FROM "TreatmentSession" ts JOIN "Visit" v ON v.id = ts."visitId"`;
    const consumptionJoin = Prisma.sql`FROM "TreatmentConsumption" tc
      JOIN "TreatmentSession" ts ON ts.id = tc."sessionId"
      JOIN "Visit" v ON v.id = ts."visitId"`;
    const [sessionSummary, sessionStatuses, costSummary, costDates, quantities] = await Promise.all([
      tx.$queryRaw<Array<{ count: string }>>(Prisma.sql`SELECT count(*)::text AS count ${sessionJoin} WHERE ${sessionWhere}`),
      tx.$queryRaw<Array<{ status: string; count: string }>>(Prisma.sql`SELECT ts.status, count(*)::text AS count ${sessionJoin} WHERE ${sessionWhere} GROUP BY ts.status ORDER BY ts.status`),
      tx.$queryRaw<Array<{ cost: string }>>(Prisma.sql`SELECT COALESCE(sum(tc."totalCost"), 0)::text AS cost ${consumptionJoin} WHERE ${consumptionWhere}`),
      tx.$queryRaw<Array<{ date: string; count: string; amount: string }>>(Prisma.sql`SELECT to_char(tc."createdAt"::date, 'YYYY-MM-DD') AS date, count(*)::text AS count, sum(tc."totalCost")::text AS amount ${consumptionJoin} WHERE ${consumptionWhere} GROUP BY tc."createdAt"::date ORDER BY tc."createdAt"::date`),
      tx.$queryRaw<Array<{ unit: string; quantity: string; lineCount: string }>>(Prisma.sql`SELECT tc.unit, sum(tc."actualQuantity")::text AS quantity, count(*)::text AS "lineCount" ${consumptionJoin} WHERE ${consumptionWhere} GROUP BY tc.unit ORDER BY tc.unit`),
    ]);
    return {
      sessionCount: Number(sessionSummary[0]?.count ?? 0),
      sessionsByStatus: sessionStatuses.map((row) => ({ status: row.status, count: Number(row.count) })),
      consumptionTotalCost: costSummary[0]?.cost ?? '0',
      consumptionByDate: costDates.map((row) => ({ date: row.date, count: Number(row.count), amount: row.amount })),
      quantityByUnit: quantities.map((row) => ({ unit: row.unit, quantity: row.quantity, lineCount: Number(row.lineCount) })),
    };
  }
}
