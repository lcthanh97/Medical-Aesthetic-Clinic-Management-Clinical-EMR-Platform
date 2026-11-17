import 'server-only';

import { Prisma } from '@prisma/client';
import prisma from '@/infrastructure/database/prisma';
import { bucket, ledger, localDate, serviceRevenue } from './queries';
import { CSV_LIMIT, PAGE_SIZE, TIME_ZONE, type DetailKind, type Filters, type Period } from './rules';

const { sql, empty } = Prisma;

export type InvoiceRow = {
  id: string; patientCode: string; date: string; status: string; age: number;
  overdueDays: null; total: string; paid: string | null; remaining: string | null;
};
type InvoiceExportRow = InvoiceRow & { totalVnd: string; paidVnd: string | null; remainingVnd: string | null };
export type PaymentRow = { id: string; date: string; method: string; amount: string; refund: string; unallocated: string };
export type ServiceRow = { id: string | null; code: string | null; name: string; revenue: string };
type ServiceExportRow = ServiceRow & { revenue_vnd: string };
export type RecordPage<T> = { rows: T[]; page: number; pageSize: number; hasMore: boolean };
export type Summary = {
  period: Period;
  timeZone: string;
  totals: { revenue: string; paid: string; debt: string; refund: string; unallocated: string; invoiceCount: number; paymentCount: number; unresolved: number };
  lowStock: { medicines: number; supplies: number };
  trend: Array<{ date: string; revenue: string; paid: string }>;
  distribution: Array<{ key: 'unpaid' | 'partial' | 'paid' | 'unknown'; count: number }>;
  aging: Array<{ key: '0-7' | '8-30' | '30+'; count: number; amount: string }>;
  services: RecordPage<ServiceRow>;
  options: { facilities: Array<{ id: string; name: string }>; services: Array<{ id: string; name: string }>; methods: string[] };
};

function pageOf<T>(rows: T[], page: number): RecordPage<T> {
  return { rows: rows.slice(0, PAGE_SIZE), page, pageSize: PAGE_SIZE, hasMore: rows.length > PAGE_SIZE };
}

export async function areKnownFilters(filters: Filters) {
  const checks = await Promise.all([
    filters.facility ? prisma.clinicFacility.count({ where: { id: filters.facility } }) : 1,
    filters.service ? prisma.serviceCatalog.count({ where: { id: filters.service } }) : 1,
    filters.method ? prisma.payment.count({ where: { method: filters.method } }) : 1,
  ]);
  return checks.every((check) => check > 0);
}

export function summaryQuery(filters: Filters, period: Period, now: Date) {
  const localBucket = bucket(sql`occurred_at`, period);
  return sql`
    ${ledger(filters, period, now)}
    , totals AS (
      SELECT coalesce(sum(total), 0)::text AS revenue, coalesce(sum(remaining), 0)::text AS debt,
        count(*)::int AS "invoiceCount", count(*) FILTER (WHERE remaining IS NULL)::int AS unresolved
      FROM invoice_balances
    ), receipts AS (
      SELECT coalesce(sum(amount), 0)::text AS paid, coalesce(sum(refund), 0)::text AS refund,
        coalesce(sum(unallocated), 0)::text AS unallocated, count(*)::int AS "paymentCount"
      FROM payment_period
    ), series_totals AS (
      SELECT day, sum(revenue) AS revenue, sum(paid) AS paid
      FROM (
        SELECT ${localBucket} AS day, total AS revenue, 0::numeric AS paid FROM period_invoices
        UNION ALL
        SELECT ${localBucket} AS day, 0::numeric, amount FROM payment_period
      ) series_entries GROUP BY day
    ), series AS (
      SELECT to_char(bins.day, 'YYYY-MM-DD') AS date, coalesce(t.revenue, 0)::text AS revenue, coalesce(t.paid, 0)::text AS paid
      FROM generate_series(
        date_trunc(${period.grain}::text, ${period.from}::timestamp),
        date_trunc(${period.grain}::text, ${period.to}::timestamp),
        ${`1 ${period.grain}`}::interval
      ) bins(day)
      LEFT JOIN series_totals t ON t.day = bins.day::date
      WHERE EXISTS (SELECT 1 FROM series_totals)
    ), distribution AS (
      SELECT CASE WHEN remaining IS NULL THEN 'unknown' WHEN remaining = 0 THEN 'paid'
        WHEN paid > 0 THEN 'partial' ELSE 'unpaid' END AS key,
        count(*)::int AS count
      FROM invoice_balances GROUP BY 1
    ), aging AS (
      SELECT CASE WHEN age <= 7 THEN '0-7' WHEN age <= 30 THEN '8-30' ELSE '30+' END AS key,
        count(*)::int AS count, sum(remaining)::text AS amount
      FROM invoice_balances WHERE remaining > 0 GROUP BY 1
    )
    SELECT to_jsonb(totals) || to_jsonb(receipts) AS totals,
      coalesce((SELECT jsonb_agg(series ORDER BY date) FROM series), '[]'::jsonb) AS trend,
      coalesce((SELECT jsonb_agg(distribution) FROM distribution), '[]'::jsonb) AS distribution,
      coalesce((SELECT jsonb_agg(aging) FROM aging), '[]'::jsonb) AS aging,
      jsonb_build_object(
        'medicines', (SELECT count(*)::int FROM "Medicine" WHERE stock <= "minStock"),
        'supplies', (SELECT count(*)::int FROM "Supply" WHERE stock <= "minStock")
      ) AS "lowStock"
    FROM totals CROSS JOIN receipts
  `;
}

export async function reportSummary(filters: Filters, period: Period, now: Date): Promise<Summary> {
  const [summary, services, facilities, catalog, methods] = await Promise.all([
    prisma.$queryRaw<Array<Pick<Summary, 'totals' | 'trend' | 'distribution' | 'aging' | 'lowStock'>>>(summaryQuery(filters, period, now)),
    prisma.$queryRaw<ServiceRow[]>(sql`${ledger(filters, period, now)} ${serviceRevenue(filters)} LIMIT ${PAGE_SIZE + 1}`),
    prisma.clinicFacility.findMany({ select: { id: true, name: true }, orderBy: [{ name: 'asc' }, { id: 'asc' }], take: 1000 }),
    prisma.serviceCatalog.findMany({ select: { id: true, name: true }, orderBy: [{ name: 'asc' }, { id: 'asc' }], take: 1000 }),
    prisma.$queryRaw<Array<{ method: string }>>(sql`SELECT method FROM "Payment" GROUP BY method ORDER BY method LIMIT 250`),
  ]);
  if (!summary[0]) throw new Error('Missing financial summary');
  return {
    ...summary[0], period, timeZone: TIME_ZONE, services: pageOf(services, 1),
    options: { facilities, services: catalog, methods: methods.map(({ method }) => method) },
  };
}

async function invoiceRows(filters: Filters, period: Period, now: Date, limit: number, offset: number, debtOnly: boolean) {
  return prisma.$queryRaw<InvoiceExportRow[]>(sql`
    ${ledger(filters, period, now)}
    SELECT b.id, p."patientCode", ${localDate(sql`b.occurred_at`)} AS date, b.status, b.age, NULL AS "overdueDays",
      b.total::text, b.paid::text, b.remaining::text,
      round(b.total)::text AS "totalVnd", round(b.paid)::text AS "paidVnd", round(b.remaining)::text AS "remainingVnd"
    FROM invoice_balances b
    JOIN "Patient" p ON p.id = b."patientId"
    ${debtOnly ? sql`WHERE b.remaining > 0` : empty}
    ORDER BY b.remaining DESC NULLS LAST, b.occurred_at DESC, b.id
    LIMIT ${limit} OFFSET ${offset}
  `);
}

export async function reportInvoices(filters: Filters, period: Period, now: Date, page: number, debtOnly = false) {
  return pageOf<InvoiceRow>(await invoiceRows(filters, period, now, PAGE_SIZE + 1, (page - 1) * PAGE_SIZE, debtOnly), page);
}

export async function reportServices(filters: Filters, period: Period, now: Date, page: number) {
  return pageOf(await prisma.$queryRaw<ServiceRow[]>(sql`
    ${ledger(filters, period, now)} ${serviceRevenue(filters)}
    LIMIT ${PAGE_SIZE + 1} OFFSET ${(page - 1) * PAGE_SIZE}
  `), page);
}

export async function reportDetails(filters: Filters, period: Period, now: Date, page: number, metric: DetailKind) {
  if (metric === 'revenue' || metric === 'debt') return reportInvoices(filters, period, now, page, metric === 'debt');
  const rows = await prisma.$queryRaw<PaymentRow[]>(sql`
    ${ledger(filters, period, now)}
    SELECT id, ${localDate(sql`occurred_at`)} AS date, method, amount::text, refund::text, unallocated::text
    FROM payment_period
    ${metric === 'refund' ? sql`WHERE refund > 0` : metric === 'unallocated' ? sql`WHERE unallocated > 0` : empty}
    ORDER BY occurred_at DESC, id
    LIMIT ${PAGE_SIZE + 1} OFFSET ${(page - 1) * PAGE_SIZE}
  `);
  return pageOf(rows, page);
}

export function exportInvoices(filters: Filters, period: Period, now: Date) {
  return invoiceRows(filters, period, now, CSV_LIMIT + 1, 0, false);
}

export async function exportServices(filters: Filters, period: Period, now: Date) {
  return prisma.$queryRaw<ServiceExportRow[]>(sql`
    ${ledger(filters, period, now)} ${serviceRevenue(filters)} LIMIT ${CSV_LIMIT + 1}
  `);
}
