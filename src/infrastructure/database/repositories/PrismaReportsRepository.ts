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
    access: { finance: boolean; treatment: boolean; inventory: boolean },
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
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const [patientSummary, visitSummary, visitStatuses, visitDates, appointmentSummary, appointmentStatuses, appointmentDates] = await Promise.all([
        tx.$queryRaw<Array<{ count: string; total: string }>>(Prisma.sql`
          SELECT count(DISTINCT v."patientId")::text AS count,
            (SELECT count(*)::text FROM (
              SELECT "patientId" FROM "Visit" WHERE "employeeId" = ${actor.employeeId}
              UNION
              SELECT "patientId" FROM "Appointment" WHERE "employeeId" = ${actor.employeeId}
            ) scoped_patients) AS total
          FROM "Visit" v WHERE ${visitWhere}`),
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
      let inventory: Awaited<ReturnType<typeof this.getInventoryData>> | null = null;
      if (access.inventory) inventory = await this.getInventoryData(tx, filters);

      return {
        patients: {
          totalInScope: Number(patientSummary[0]?.total ?? 0),
          uniqueWithVisits: Number(patientSummary[0]?.count ?? 0),
          newInPeriod: null,
        },
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
        inventory,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 15_000 });
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
    const [summary, byMethod, byDate, allocations, invoices] = await Promise.all([
      tx.$queryRaw<Array<{ count: string; amount: string }>>(Prisma.sql`SELECT count(*)::text AS count, COALESCE(sum(p.amount), 0)::text AS amount ${fromAndJoins} WHERE ${conditions}`),
      tx.$queryRaw<Array<{ method: string; count: string; amount: string }>>(Prisma.sql`SELECT p.method, count(*)::text AS count, sum(p.amount)::text AS amount ${fromAndJoins} WHERE ${conditions} GROUP BY p.method ORDER BY p.method`),
      tx.$queryRaw<Array<{ date: string; count: string; amount: string }>>(Prisma.sql`SELECT to_char(p."paidAt"::date, 'YYYY-MM-DD') AS date, count(*)::text AS count, sum(p.amount)::text AS amount ${fromAndJoins} WHERE ${conditions} GROUP BY p."paidAt"::date ORDER BY p."paidAt"::date`),
      tx.$queryRaw<Array<{ allocated: string; balance: string }>>(Prisma.sql`
        WITH period_payments AS (SELECT p.id, p.amount, p."invoiceId" ${fromAndJoins} WHERE ${conditions}),
        totals AS (
          SELECT COALESCE(sum(a.amount), 0) AS allocated
          FROM period_payments p JOIN "PaymentAllocation" a ON a."paymentId" = p.id
          JOIN "InvoiceItem" item ON item.id = a."invoiceItemId" AND item."invoiceId" = p."invoiceId"
        )
        SELECT allocated::text, (COALESCE((SELECT sum(amount) FROM period_payments), 0) - allocated)::text AS balance
        FROM totals`),
      tx.$queryRaw<Array<{ status: string; count: string; invoiceAmount: string; paymentAmount: string; balance: string }>>(Prisma.sql`
        WITH scoped_invoices AS (
          SELECT i.id, i.status, i.total FROM "Invoice" i JOIN "Visit" v ON v.id = i."visitId"
          WHERE v."employeeId" = ${actor.employeeId}
            AND v."visitDate" >= ${filters.startAt} AND v."visitDate" < ${filters.endExclusive}
        ), paid AS (
          SELECT p."invoiceId", sum(p.amount) AS amount FROM "Payment" p
          JOIN scoped_invoices i ON i.id = p."invoiceId" GROUP BY p."invoiceId"
        )
        SELECT i.status, count(*)::text AS count, sum(i.total)::text AS "invoiceAmount",
          COALESCE(sum(paid.amount), 0)::text AS "paymentAmount",
          (sum(i.total) - COALESCE(sum(paid.amount), 0))::text AS balance
        FROM scoped_invoices i LEFT JOIN paid ON paid."invoiceId" = i.id GROUP BY i.status ORDER BY i.status`),
    ]);
    return {
      paymentCount: Number(summary[0]?.count ?? 0),
      paymentAmount: summary[0]?.amount ?? '0',
      allocatedAmount: allocations[0]?.allocated ?? '0',
      unallocatedBalance: allocations[0]?.balance ?? '0',
      invoicesByStatus: invoices.map((row) => ({ ...row, count: Number(row.count) })),
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
    const planConditions: Prisma.Sql[] = [
      Prisma.sql`v."employeeId" = ${actor.employeeId}`,
      Prisma.sql`tp."createdAt" >= ${filters.startAt}`,
      Prisma.sql`tp."createdAt" < ${filters.endExclusive}`,
    ];
    const planWhere = Prisma.join(planConditions, ' AND ');
    const planJoin = Prisma.sql`FROM "TreatmentPlan" tp JOIN "Visit" v ON v.id = tp."visitId"`;
    const sessionJoin = Prisma.sql`FROM "TreatmentSession" ts JOIN "Visit" v ON v.id = ts."visitId"`;
    const consumptionJoin = Prisma.sql`FROM "TreatmentConsumption" tc
      JOIN "TreatmentSession" ts ON ts.id = tc."sessionId"
      JOIN "Visit" v ON v.id = ts."visitId"`;
    const [planSummary, planStatuses, sessionSummary, sessionStatuses, costSummary, costDates, quantities, planDates, sessionDates] = await Promise.all([
      tx.$queryRaw<Array<{ count: string }>>(Prisma.sql`SELECT count(*)::text AS count FROM "TreatmentPlan" tp JOIN "Visit" v ON v.id = tp."visitId" WHERE ${planWhere}`),
      tx.$queryRaw<Array<{ status: string; count: string }>>(Prisma.sql`SELECT tp.status, count(*)::text AS count FROM "TreatmentPlan" tp JOIN "Visit" v ON v.id = tp."visitId" WHERE ${planWhere} GROUP BY tp.status ORDER BY tp.status`),
      tx.$queryRaw<Array<{ count: string }>>(Prisma.sql`SELECT count(*)::text AS count ${sessionJoin} WHERE ${sessionWhere}`),
      tx.$queryRaw<Array<{ status: string; count: string }>>(Prisma.sql`SELECT ts.status, count(*)::text AS count ${sessionJoin} WHERE ${sessionWhere} GROUP BY ts.status ORDER BY ts.status`),
      tx.$queryRaw<Array<{ cost: string }>>(Prisma.sql`SELECT COALESCE(sum(tc."totalCost"), 0)::text AS cost ${consumptionJoin} WHERE ${consumptionWhere}`),
      tx.$queryRaw<Array<{ date: string; count: string; amount: string }>>(Prisma.sql`SELECT to_char(tc."createdAt"::date, 'YYYY-MM-DD') AS date, count(*)::text AS count, sum(tc."totalCost")::text AS amount ${consumptionJoin} WHERE ${consumptionWhere} GROUP BY tc."createdAt"::date ORDER BY tc."createdAt"::date`),
      tx.$queryRaw<Array<{ unit: string; quantity: string; lineCount: string }>>(Prisma.sql`SELECT tc.unit, sum(tc."actualQuantity")::text AS quantity, count(*)::text AS "lineCount" ${consumptionJoin} WHERE ${consumptionWhere} GROUP BY tc.unit ORDER BY tc.unit`),
      tx.$queryRaw<Array<{ date: string; count: string }>>(Prisma.sql`SELECT to_char(tp."createdAt"::date,'YYYY-MM-DD') AS date, count(*)::text AS count ${planJoin} WHERE ${planWhere} GROUP BY tp."createdAt"::date ORDER BY date`),
      tx.$queryRaw<Array<{ date: string; count: string }>>(Prisma.sql`SELECT to_char(ts."createdAt"::date,'YYYY-MM-DD') AS date, count(*)::text AS count ${sessionJoin} WHERE ${sessionWhere} GROUP BY ts."createdAt"::date ORDER BY date`),
    ]);
    return {
      planCount: Number(planSummary[0]?.count ?? 0),
      plansByStatus: planStatuses.map((row) => ({ status: row.status, count: Number(row.count) })),
      sessionCount: Number(sessionSummary[0]?.count ?? 0),
      sessionsByStatus: sessionStatuses.map((row) => ({ status: row.status, count: Number(row.count) })),
      plansByDate: planDates.map((row) => ({ date: row.date, count: Number(row.count) })),
      sessionsByDate: sessionDates.map((row) => ({ date: row.date, count: Number(row.count) })),
      consumptionTotalCost: costSummary[0]?.cost ?? '0',
      consumptionByDate: costDates.map((row) => ({ date: row.date, count: Number(row.count), amount: row.amount })),
      quantityByUnit: quantities.map((row) => ({ unit: row.unit, quantity: row.quantity, lineCount: Number(row.lineCount) })),
    };
  }

  private async getInventoryData(tx: Prisma.TransactionClient, filters: ReportsFilters) {
    const movementItemFilter = filters.itemSearch ? Prisma.sql`
      AND (
        EXISTS (SELECT 1 FROM "Medicine" m WHERE m.id = it."medicineId" AND strpos(lower(m.name), lower(${filters.itemSearch})) > 0)
        OR EXISTS (SELECT 1 FROM "Supply" s WHERE s.id = it."supplyId" AND strpos(lower(s.name), lower(${filters.itemSearch})) > 0)
      )` : Prisma.empty;
    const catalogItemFilter = filters.itemSearch
      ? Prisma.sql`WHERE strpos(lower(name), lower(${filters.itemSearch})) > 0`
      : Prisma.empty;
    const [medicineCount, supplyCount, lowStockItems, lowStockSummary, transactionsByTypeAndUnit, transactionsByDate, stockItems] = await Promise.all([
      tx.medicine.count(),
      tx.supply.count(),
      tx.$queryRaw<Array<{ kind: 'medicine' | 'supply'; id: string; name: string; unit: string; stock: string; minStock: string; status: string }>>(Prisma.sql`
        SELECT kind, id, name, unit, stock::text AS stock, "minStock"::text AS "minStock", status FROM (
          SELECT 'medicine'::text AS kind, id, name, unit, stock, "minStock", status FROM "Medicine" WHERE stock <= "minStock"
          UNION ALL
          SELECT 'supply'::text AS kind, id, name, unit, stock, "minStock", status FROM "Supply" WHERE stock <= "minStock"
        ) low_stock ORDER BY stock::numeric ASC, name ASC LIMIT 200`),
      tx.$queryRaw<Array<{ count: string }>>(Prisma.sql`
        SELECT ((SELECT count(*) FROM "Medicine" WHERE stock <= "minStock") +
                (SELECT count(*) FROM "Supply" WHERE stock <= "minStock"))::text AS count`),
      tx.$queryRaw<Array<{ transactionType: string; unit: string; quantity: string; count: string }>>(Prisma.sql`
        SELECT it."transactionType", it.unit, COALESCE(sum(it.quantity), 0)::text AS quantity, count(*)::text AS count
        FROM "InventoryTransaction" it
        WHERE it."createdAt" >= ${filters.startAt} AND it."createdAt" < ${filters.endExclusive} ${movementItemFilter}
        GROUP BY it."transactionType", it.unit ORDER BY it."transactionType", it.unit`),
      tx.$queryRaw<Array<{ date: string; transactionType: string; unit: string; quantity: string; count: string }>>(Prisma.sql`
        SELECT to_char(it."createdAt"::date, 'YYYY-MM-DD') AS date, it."transactionType", it.unit,
          COALESCE(sum(it.quantity), 0)::text AS quantity, count(*)::text AS count
        FROM "InventoryTransaction" it
        WHERE it."createdAt" >= ${filters.startAt} AND it."createdAt" < ${filters.endExclusive} ${movementItemFilter}
        GROUP BY it."createdAt"::date, it."transactionType", it.unit
        ORDER BY it."createdAt"::date, it."transactionType", it.unit`),
      tx.$queryRaw<Array<{ kind: 'medicine' | 'supply'; id: string; name: string; unit: string; stock: string; minStock: string; status: string; low: boolean }>>(Prisma.sql`
        SELECT kind, id, name, unit, stock::text AS stock, "minStock"::text AS "minStock", status, stock <= "minStock" AS low
        FROM (
          SELECT 'medicine'::text AS kind, id, name, unit, stock, "minStock", status FROM "Medicine"
          UNION ALL
          SELECT 'supply'::text AS kind, id, name, unit, stock, "minStock", status FROM "Supply"
        ) catalog ${catalogItemFilter} ORDER BY kind, name, id LIMIT 200`),
    ]);
    return {
      medicineCount,
      supplyCount,
      lowStockCount: Number(lowStockSummary[0]?.count ?? 0),
      lowStockItems,
      stockItems,
      transactionsByTypeAndUnit: transactionsByTypeAndUnit.map((row) => ({ ...row, count: Number(row.count) })),
      transactionsByDate: transactionsByDate.map((row) => ({ ...row, count: Number(row.count) })),
    };
  }

}
