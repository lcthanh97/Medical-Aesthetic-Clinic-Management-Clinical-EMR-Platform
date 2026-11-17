import { Prisma } from '@prisma/client';
import { invoiceLabels, type Filters, type Period } from './rules';

const { sql, join, empty } = Prisma;
const validStatuses = Object.keys(invoiceLabels);

export function ledger(filters: Filters, period: Period, now: Date) {
  // The stored timestamp columns contain UTC wall times. Bind UTC ISO strings explicitly.
  const start = sql`${period.start}::timestamp`;
  const end = sql`${period.end}::timestamp`;
  const asOf = sql`${now.toISOString()}::timestamp`;
  const facility = filters.facility;
  const service = filters.service;
  const method = filters.method;

  return sql`
    WITH invoice_base AS (
      SELECT i.id, i.total, upper(i.status) AS status, v."visitDate" AS occurred_at, v."patientId"
      FROM "Invoice" i
      JOIN "Visit" v ON v.id = i."visitId"
      ${facility ? sql`JOIN "Room" room ON room.id = v."roomId"
        JOIN "Department" dept ON dept.id = room."departmentId" AND dept."facilityId" = ${facility}` : empty}
      WHERE upper(i.status) IN (${join(validStatuses)}) AND v."visitDate" >= ${start} AND v."visitDate" < ${end}
    ),
    invoice_lines AS (
      SELECT li."invoiceId" AS invoice_id, coalesce(li."serviceId", co."serviceId") AS service_id, li.total
      FROM invoice_base b
      JOIN "InvoiceItem" li ON li."invoiceId" = b.id
      LEFT JOIN "ClinicalOrder" co ON co.id = li."clinicalOrderId"
    ),
    period_invoices AS (
      ${service
        ? sql`SELECT b.id, b.status, b.occurred_at, b."patientId", lines.total
            FROM invoice_base b JOIN (
              SELECT invoice_id, sum(total) AS total FROM invoice_lines WHERE service_id = ${service} GROUP BY invoice_id
            ) lines ON lines.invoice_id = b.id`
        : sql`SELECT * FROM invoice_base`}
    ),
    relevant_payments AS (
      SELECT p.id, p."invoiceId", p.amount, p.method, p."paidAt"
      FROM "Payment" p
      WHERE p."paidAt" <= ${asOf} AND (
        (p."paidAt" >= ${start} AND p."paidAt" < ${end})
        OR p."invoiceId" IN (SELECT id FROM period_invoices)
        OR EXISTS (
          SELECT 1 FROM "PaymentAllocation" a
          JOIN "InvoiceItem" li ON li.id = a."invoiceItemId"
          JOIN period_invoices i ON i.id = li."invoiceId"
          WHERE a."paymentId" = p.id
        )
      )
    ),
    allocation_rows AS (
      SELECT p.id AS payment_id, li."invoiceId" AS invoice_id,
        coalesce(li."serviceId", co."serviceId") AS service_id,
        CASE WHEN p.amount < 0 THEN -abs(a.amount) ELSE a.amount END AS amount
      FROM relevant_payments p
      JOIN "PaymentAllocation" a ON a."paymentId" = p.id
      JOIN "InvoiceItem" li ON li.id = a."invoiceItemId"
      LEFT JOIN "ClinicalOrder" co ON co.id = li."clinicalOrderId"
    ),
    allocation_totals AS (
      SELECT payment_id, sum(amount) AS amount FROM allocation_rows GROUP BY payment_id
    ),
    directly_linked AS (
      SELECT p.* FROM relevant_payments p LEFT JOIN allocation_totals a ON a.payment_id = p.id WHERE a.payment_id IS NULL
    ),
    single_service AS (
      SELECT li."invoiceId" AS invoice_id, min(coalesce(li."serviceId", co."serviceId")) AS service_id
      FROM (SELECT DISTINCT "invoiceId" FROM directly_linked) d
      JOIN "Invoice" i ON i.id = d."invoiceId"
      JOIN "InvoiceItem" li ON li."invoiceId" = i.id
      LEFT JOIN "ClinicalOrder" co ON co.id = li."clinicalOrderId"
      GROUP BY li."invoiceId", i.total
      HAVING count(DISTINCT coalesce(li."serviceId", co."serviceId")) = 1
        AND count(*) = count(coalesce(li."serviceId", co."serviceId"))
        AND sum(li.total) = i.total
    ),
    payment_parts AS (
      SELECT payment_id, invoice_id, service_id, amount, 'allocation' AS kind FROM allocation_rows
      UNION ALL
      SELECT p.id, p."invoiceId", s.service_id, p.amount, 'direct'
      FROM directly_linked p LEFT JOIN single_service s ON s.invoice_id = p."invoiceId"
      UNION ALL
      SELECT p.id, p."invoiceId", NULL, p.amount - a.amount, 'unallocated'
      FROM relevant_payments p JOIN allocation_totals a ON a.payment_id = p.id WHERE p.amount <> a.amount
    ),
    invoice_receipts AS (
      SELECT pp.invoice_id,
        coalesce(sum(pp.amount) FILTER (WHERE true ${service ? sql`AND pp.service_id = ${service}` : empty}), 0) AS paid,
        ${service ? sql`bool_or(pp.kind = 'direct' AND pp.service_id IS NULL AND pp.amount <> 0)` : sql`false`} AS uncertain
      FROM payment_parts pp
      JOIN period_invoices i ON i.id = pp.invoice_id
      WHERE pp.kind <> 'unallocated'
      GROUP BY pp.invoice_id
    ),
    invoice_balances AS (
      SELECT i.*,
        CASE WHEN r.uncertain THEN NULL ELSE coalesce(r.paid, 0) END AS paid,
        CASE WHEN r.uncertain THEN NULL ELSE greatest(i.total - coalesce(r.paid, 0), 0) END AS remaining,
        greatest(0, (${asOf} + interval '7 hours')::date - (i.occurred_at + interval '7 hours')::date) AS age
      FROM period_invoices i LEFT JOIN invoice_receipts r ON r.invoice_id = i.id
    ),
    payment_period AS (
      SELECT p.id, p.method, p."paidAt" AS occurred_at, sum(pp.amount) AS amount,
        sum(CASE WHEN p.amount < 0 THEN -pp.amount ELSE 0 END) AS refund,
        sum(CASE WHEN pp.kind = 'unallocated' THEN greatest(pp.amount, 0) ELSE 0 END) AS unallocated
      FROM relevant_payments p
      JOIN payment_parts pp ON pp.payment_id = p.id
      ${facility ? sql`JOIN "Invoice" payment_invoice ON payment_invoice.id = pp.invoice_id
        JOIN "Visit" payment_visit ON payment_visit.id = payment_invoice."visitId"
        JOIN "Room" payment_room ON payment_room.id = payment_visit."roomId"
        JOIN "Department" payment_dept ON payment_dept.id = payment_room."departmentId" AND payment_dept."facilityId" = ${facility}` : empty}
      WHERE p."paidAt" >= ${start} AND p."paidAt" < ${end}
        ${service ? sql`AND pp.service_id = ${service}` : empty}
        ${method ? sql`AND p.method = ${method}` : empty}
      GROUP BY p.id, p.method, p."paidAt"
    )
  `;
}

export function bucket(column: Prisma.Sql, period: Period) {
  return sql`date_trunc(${period.grain}::text, ${column} + interval '7 hours')::date`;
}

export function serviceRevenue(filters: Filters) {
  return sql`
    SELECT s.id, s.code, coalesce(s.name, 'Chưa gắn dịch vụ') AS name, sum(lines.total)::text AS revenue,
      round(sum(lines.total))::text AS revenue_vnd
    FROM (
      SELECT service_id, total FROM invoice_lines ${filters.service ? sql`WHERE service_id = ${filters.service}` : empty}
      ${filters.service ? empty : sql`
        UNION ALL
        SELECT NULL, b.total - coalesce(l.total, 0)
        FROM invoice_base b
        LEFT JOIN (SELECT invoice_id, sum(total) AS total FROM invoice_lines GROUP BY invoice_id) l ON l.invoice_id = b.id
        WHERE b.total <> coalesce(l.total, 0) OR l.invoice_id IS NULL`}
    ) lines LEFT JOIN "ServiceCatalog" s ON s.id = lines.service_id
    GROUP BY s.id, s.code, s.name
    ORDER BY sum(lines.total) DESC, s.name NULLS LAST, s.id
  `;
}

export const localDate = (column: Prisma.Sql) =>
  sql`to_char((${column} + interval '7 hours')::date, 'YYYY-MM-DD')`;
