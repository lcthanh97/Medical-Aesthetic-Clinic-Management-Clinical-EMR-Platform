import { Prisma } from '@prisma/client';
import { prisma } from '@/infrastructure/database/prisma';
import { grainForRange, progress, vnDateRange, vnDay, weightedProgress } from './treatment-report.metrics';
import type { ReportFilters, ReportQuery } from './treatment-report.schema';

type Range = ReturnType<typeof vnDateRange>;
type Row = Record<string, unknown>;
const number = (value: unknown) => Number(value ?? 0);
const date = (value: unknown) => value instanceof Date ? value.toISOString() : value == null ? null : String(value);

function filtersSql(filters: ReportFilters, range: Range, includePlanDate: boolean) {
  return Prisma.sql`
    ${includePlanDate ? Prisma.sql`AND COALESCE(p."startDate", p."createdAt") >= ${range.from}
      AND COALESCE(p."startDate", p."createdAt") < ${range.to}` : Prisma.empty}
    ${filters.doctorId ? Prisma.sql`AND p."createdById" = ${filters.doctorId}` : Prisma.empty}
    ${filters.planStatus ? Prisma.sql`AND p.status = ${filters.planStatus}` : Prisma.empty}
    ${filters.procedureId ? Prisma.sql`AND EXISTS (
      SELECT 1 FROM "TreatmentStage" ps JOIN "TreatmentStep" pt ON pt."stageId" = ps.id
      WHERE ps."planId" = p.id AND pt."procedureId" = ${filters.procedureId}
    )` : Prisma.empty}`;
}

function planCte(filters: ReportFilters, range: Range) {
  return Prisma.sql`WITH selected_plans AS (
    SELECT p.id, p."patientId", p."createdById", p.name, p.status,
      COALESCE(p."startDate", p."createdAt") AS "reportDate"
    FROM "TreatmentPlan" p WHERE TRUE ${filtersSql(filters, range, true)}
  ), step_capacity AS (
    SELECT st."planId", COALESCE(SUM(GREATEST(step."repeatCount", 0)), 0)::int AS total
    FROM "TreatmentStage" st JOIN "TreatmentStep" step ON step."stageId" = st.id
    JOIN selected_plans p ON p.id = st."planId" GROUP BY st."planId"
  ), completed_by_step AS (
    SELECT s."stepId", COUNT(*)::int AS done FROM "TreatmentSession" s
    JOIN "TreatmentStage" st ON st.id = s."stageId" JOIN selected_plans p ON p.id = st."planId"
    WHERE s.status = 'COMPLETED' AND s."stepId" IS NOT NULL GROUP BY s."stepId"
  ), linked_done AS (
    SELECT st."planId", COALESCE(SUM(LEAST(GREATEST(step."repeatCount", 0), COALESCE(done.done, 0))), 0)::int AS done
    FROM "TreatmentStage" st JOIN "TreatmentStep" step ON step."stageId" = st.id
    JOIN selected_plans p ON p.id = st."planId"
    LEFT JOIN completed_by_step done ON done."stepId" = step.id GROUP BY st."planId"
  ), unlinked_done AS (
    SELECT st."planId", COUNT(*)::int AS done FROM "TreatmentSession" s
    JOIN "TreatmentStage" st ON st.id = s."stageId" JOIN selected_plans p ON p.id = st."planId"
    WHERE s.status = 'COMPLETED' AND s."stepId" IS NULL GROUP BY st."planId"
  ), plan_progress AS (
    SELECT p.*, COALESCE(cap.total, 0) AS capacity,
      COALESCE(linked.done, 0) AS linked_done,
      COALESCE(unlinked.done, 0) AS unlinked_done,
      CASE WHEN COALESCE(cap.total, 0) > 0 THEN LEAST(cap.total, COALESCE(linked.done, 0) + COALESCE(unlinked.done, 0)) ELSE 0 END AS effective_done
    FROM selected_plans p LEFT JOIN step_capacity cap ON cap."planId" = p.id
    LEFT JOIN linked_done linked ON linked."planId" = p.id
    LEFT JOIN unlinked_done unlinked ON unlinked."planId" = p.id
  )`;
}

function sessionCte(filters: ReportFilters, range: Range, now: Date) {
  return Prisma.sql`WITH selected_plans AS (
    SELECT p.id, p."patientId", p."createdById", p.status FROM "TreatmentPlan" p
    WHERE TRUE ${filtersSql(filters, range, false)}
  ), session_rows AS (
    SELECT s.id, s."stageId", s."stepId", s."visitId", s."sessionNo", s.status,
      s."scheduledAt", s."startedAt", s."completedAt", s."performedById", p.id AS "planId",
      p."patientId", p."createdById", p.status AS "planStatus",
      CASE WHEN s.status = 'COMPLETED' THEN COALESCE(s."completedAt", s."startedAt") ELSE s."scheduledAt" END AS "reportDate",
      CASE WHEN s.status = 'COMPLETED' THEN 'completed'
        WHEN s.status = 'CANCELLED' THEN 'cancelled'
        WHEN s."scheduledAt" >= ${now} THEN 'upcoming'
        WHEN s."scheduledAt" < ${now} THEN 'overdue' ELSE NULL END AS "reportGroup"
    FROM "TreatmentSession" s JOIN "TreatmentStage" st ON st.id = s."stageId"
    JOIN selected_plans p ON p.id = st."planId"
  )`;
}

const inPeriod = (range: Range) => Prisma.sql`"reportDate" >= ${range.from} AND "reportDate" < ${range.to}`;

export class TreatmentReportService {
  constructor(private readonly db = prisma, private readonly now: () => Date = () => new Date()) {}

  private range(filters: ReportFilters) { return vnDateRange(filters.period, this.now(), filters.from, filters.to); }

  async options() {
    const [doctors, procedures] = await Promise.all([
      this.db.employee.findMany({ where: { treatmentPlansCreated: { some: {} } }, select: { id: true, fullName: true }, orderBy: { fullName: 'asc' } }),
      this.db.procedureCatalog.findMany({ where: { treatmentSteps: { some: {} } }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    ]);
    return { doctors: doctors.map((item) => ({ id: item.id, name: item.fullName })), procedures: procedures.map((item) => ({ id: item.id, name: item.name })) };
  }

  async summary(filters: ReportFilters) {
    const range = this.range(filters);
    const now = this.now();
    const grain = grainForRange(range.from, range.to);
    const plans = planCte(filters, range);
    const sessions = sessionCte(filters, range, now);
    const [planRows, sessionRows, timelineRows, doctorRows, procedureRows] = await Promise.all([
      this.db.$queryRaw<Row[]>(Prisma.sql`${plans} SELECT status, COUNT(*)::int AS count,
        COALESCE(SUM(capacity), 0)::int AS capacity, COALESCE(SUM(effective_done), 0)::int AS completed
        FROM plan_progress GROUP BY status`),
      this.db.$queryRaw<Row[]>(Prisma.sql`${sessions} SELECT "reportGroup" AS group_name, COUNT(*)::int AS count
        FROM session_rows WHERE ${inPeriod(range)} AND "reportGroup" IS NOT NULL GROUP BY "reportGroup"`),
      this.db.$queryRaw<Row[]>(Prisma.sql`${sessions} SELECT to_char(date_trunc(${grain}, "reportDate" AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD') AS bucket,
        COUNT(*) FILTER (WHERE "reportGroup" = 'completed')::int AS completed,
        COUNT(*) FILTER (WHERE "reportGroup" = 'cancelled')::int AS cancelled
        FROM session_rows WHERE ${inPeriod(range)} AND "reportGroup" IN ('completed', 'cancelled')
        GROUP BY 1 ORDER BY 1`),
      this.db.$queryRaw<Row[]>(Prisma.sql`${plans}, session_counts AS (
        SELECT st."planId", COUNT(*) FILTER (WHERE s.status = 'COMPLETED' AND COALESCE(s."completedAt", s."startedAt") >= ${range.from}
          AND COALESCE(s."completedAt", s."startedAt") < ${range.to})::int AS completed,
          COUNT(*) FILTER (WHERE s.status = 'CANCELLED' AND s."scheduledAt" >= ${range.from}
          AND s."scheduledAt" < ${range.to})::int AS cancelled
        FROM "TreatmentSession" s JOIN "TreatmentStage" st ON st.id = s."stageId"
        JOIN selected_plans p ON p.id = st."planId" GROUP BY st."planId"
      ) SELECT e.id, e."fullName" AS name, COUNT(*)::int AS plans,
        COALESCE(SUM(sc.completed), 0)::int AS completed, COALESCE(SUM(sc.cancelled), 0)::int AS cancelled,
        COALESCE(SUM(pp.capacity), 0)::int AS capacity, COALESCE(SUM(pp.effective_done), 0)::int AS progress_done
        FROM plan_progress pp JOIN "Employee" e ON e.id = pp."createdById"
        LEFT JOIN session_counts sc ON sc."planId" = pp.id GROUP BY e.id, e."fullName" ORDER BY plans DESC, name`),
      this.db.$queryRaw<Row[]>(Prisma.sql`${plans}, period_done AS (
        SELECT s."stepId", COUNT(*)::int AS done FROM "TreatmentSession" s
        WHERE s.status = 'COMPLETED' AND COALESCE(s."completedAt", s."startedAt") >= ${range.from}
          AND COALESCE(s."completedAt", s."startedAt") < ${range.to}
        GROUP BY s."stepId"
      ) SELECT proc.id, proc.name, COUNT(DISTINCT pp.id)::int AS plans,
        COALESCE(SUM(period_done.done), 0)::int AS sessions,
        COALESCE(SUM(GREATEST(step."repeatCount", 0)), 0)::int AS capacity,
        COALESCE(SUM(LEAST(GREATEST(step."repeatCount", 0), COALESCE(completed_by_step.done, 0))), 0)::int AS progress_done
        FROM plan_progress pp JOIN "TreatmentStage" st ON st."planId" = pp.id
        JOIN "TreatmentStep" step ON step."stageId" = st.id
        JOIN "ProcedureCatalog" proc ON proc.id = step."procedureId"
        LEFT JOIN completed_by_step ON completed_by_step."stepId" = step.id
        LEFT JOIN period_done ON period_done."stepId" = step.id
        ${filters.procedureId ? Prisma.sql`WHERE proc.id = ${filters.procedureId}` : Prisma.empty}
        GROUP BY proc.id, proc.name ORDER BY plans DESC, proc.name`),
    ]);
    const planCounts = Object.fromEntries(planRows.map((row) => [String(row.status), number(row.count)]));
    const sessionCounts = Object.fromEntries(sessionRows.map((row) => [String(row.group_name), number(row.count)]));
    const overall = weightedProgress(planRows.map((row) => ({ completed: number(row.completed), total: number(row.capacity) })));
    return {
      period: { from: range.fromDay, to: range.toDay, grain, timeZone: 'Asia/Ho_Chi_Minh' },
      plans: { total: planRows.reduce((sum, row) => sum + number(row.count), 0), active: planCounts.ACTIVE ?? 0,
        completed: planCounts.COMPLETED ?? 0, draft: planCounts.DRAFT ?? 0, statuses: planCounts },
      sessions: { total: sessionRows.reduce((sum, row) => sum + number(row.count), 0), completed: sessionCounts.completed ?? 0,
        upcoming: sessionCounts.upcoming ?? 0, cancelled: sessionCounts.cancelled ?? 0, overdue: sessionCounts.overdue ?? 0 },
      progress: overall,
      timeline: timelineRows.map((row) => ({ bucket: String(row.bucket), completed: number(row.completed), cancelled: number(row.cancelled) })),
      doctors: doctorRows.map((row) => ({ id: String(row.id), name: String(row.name), plans: number(row.plans), completed: number(row.completed),
        cancelled: number(row.cancelled), progress: progress(number(row.capacity), number(row.progress_done), 0) })),
      procedures: procedureRows.map((row) => ({ id: String(row.id), name: String(row.name), plans: number(row.plans), sessions: number(row.sessions),
        progress: progress(number(row.capacity), number(row.progress_done), 0) })),
    };
  }

  async plans(query: ReportQuery) {
    const range = this.range(query);
    const rows = await this.db.$queryRaw<Row[]>(Prisma.sql`${planCte(query, range)} SELECT pp.id,
      patient."patientCode", patient."fullName" AS "patientName", pp.name AS "planName", pp.status,
      employee."fullName" AS "doctorName", pp.capacity, pp.linked_done, pp.unlinked_done,
      pp.effective_done, pp."reportDate", COUNT(*) OVER()::int AS total,
      (SELECT string_agg(DISTINCT proc.name, ', ') FROM "TreatmentStage" st
        JOIN "TreatmentStep" step ON step."stageId" = st.id
        JOIN "ProcedureCatalog" proc ON proc.id = step."procedureId" WHERE st."planId" = pp.id) AS procedures,
      (SELECT MIN(s."scheduledAt") FROM "TreatmentSession" s JOIN "TreatmentStage" st ON st.id = s."stageId"
        WHERE st."planId" = pp.id AND s.status NOT IN ('COMPLETED', 'CANCELLED') AND s."scheduledAt" >= ${this.now()}) AS "nextSession",
      (SELECT COUNT(*)::int FROM "TreatmentSession" s JOIN "TreatmentStage" st ON st.id = s."stageId"
        WHERE st."planId" = pp.id AND s.status NOT IN ('COMPLETED', 'CANCELLED') AND s."scheduledAt" < ${this.now()}) AS "overdueSessions"
      FROM plan_progress pp JOIN "Patient" patient ON patient.id = pp."patientId"
      JOIN "Employee" employee ON employee.id = pp."createdById"
      ORDER BY GREATEST(pp.capacity - pp.effective_done, 0) DESC, pp."reportDate" DESC, pp.id
      LIMIT 20 OFFSET ${(query.page - 1) * 20}`);
    return { total: rows.length ? number(rows[0].total) : 0, page: query.page, pageSize: 20,
      items: rows.map((row) => ({ id: String(row.id), patientCode: String(row.patientCode), patientName: String(row.patientName),
        planName: String(row.planName), status: String(row.status), doctorName: String(row.doctorName),
        procedures: row.procedures ? String(row.procedures) : null, reportDate: date(row.reportDate),
        progress: progress(number(row.capacity), number(row.linked_done), number(row.unlinked_done)),
        nextSession: date(row.nextSession), overdueSessions: number(row.overdueSessions) })) };
  }

  async sessions(query: ReportQuery) {
    const range = this.range(query);
    const rows = await this.db.$queryRaw<Row[]>(Prisma.sql`${sessionCte(query, range, this.now())}
      SELECT sr.id, sr."planId", sr."sessionNo", sr.status, sr."reportGroup", sr."scheduledAt",
        sr."startedAt", sr."completedAt", plan.name AS "planName", patient."patientCode",
        patient."fullName" AS "patientName", employee."fullName" AS "doctorName",
        proc.name AS procedure, COUNT(*) OVER()::int AS total
      FROM session_rows sr JOIN "TreatmentPlan" plan ON plan.id = sr."planId"
      JOIN "Patient" patient ON patient.id = sr."patientId"
      LEFT JOIN "Employee" employee ON employee.id = sr."performedById"
      LEFT JOIN "TreatmentStep" step ON step.id = sr."stepId"
      LEFT JOIN "ProcedureCatalog" proc ON proc.id = step."procedureId"
      WHERE ${inPeriod(range)}
        ${query.group !== 'all' ? Prisma.sql`AND sr."reportGroup" = ${query.group}` : Prisma.empty}
        ${query.planId ? Prisma.sql`AND sr."planId" = ${query.planId}` : Prisma.empty}
      ORDER BY sr."reportDate" DESC, sr.id LIMIT 20 OFFSET ${(query.page - 1) * 20}`);
    return { total: rows.length ? number(rows[0].total) : 0, page: query.page, pageSize: 20,
      items: rows.map((row) => ({ id: String(row.id), planId: String(row.planId), sessionNo: number(row.sessionNo),
        status: String(row.status), group: String(row.reportGroup), scheduledAt: date(row.scheduledAt),
        startedAt: date(row.startedAt), completedAt: date(row.completedAt), planName: String(row.planName),
        patientCode: String(row.patientCode), patientName: String(row.patientName),
        doctorName: row.doctorName ? String(row.doctorName) : null, procedure: row.procedure ? String(row.procedure) : null })) };
  }

  async csv(filters: ReportFilters) {
    const range = this.range(filters);
    const rows = await this.db.$queryRaw<Row[]>(Prisma.sql`${planCte(filters, range)} SELECT pp.id,
      patient."patientCode", pp.status, employee."fullName" AS "doctorName",
      pp."reportDate", pp.capacity, pp.linked_done, pp.unlinked_done
      FROM plan_progress pp JOIN "Patient" patient ON patient.id = pp."patientId"
      JOIN "Employee" employee ON employee.id = pp."createdById" ORDER BY pp.id LIMIT 50001`);
    if (rows.length > 50000) throw new Error('REPORT_CSV_TOO_LARGE');
    return rows.map((row) => ({ id: String(row.id), patientCode: String(row.patientCode),
      status: String(row.status), doctorName: String(row.doctorName), reportDate: row.reportDate instanceof Date ? vnDay(row.reportDate) : null,
      progress: progress(number(row.capacity), number(row.linked_done), number(row.unlinked_done)) }));
  }
}
