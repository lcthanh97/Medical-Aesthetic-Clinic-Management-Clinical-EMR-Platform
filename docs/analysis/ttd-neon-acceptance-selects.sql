-- RPT01_RPT02_FINANCE
-- Supply the signed-in Employee.id for manual reconciliation. NULL chooses an active
-- REPORT_READ employee with the most visits in the period without returning their ID.
WITH params AS (
  SELECT NULL::text AS employee_id, DATE '2026-01-01' AS from_day, DATE '2026-12-31' AS to_day,
         NULL::text AS visit_status, NULL::text AS appointment_status, NULL::text AS session_status
), scope AS (
  SELECT p.*, COALESCE(employee_id, (
    SELECT e.id FROM "Employee" e JOIN "Account" a ON a.id=e."accountId"
    WHERE a.status='ACTIVE' AND EXISTS (
      SELECT 1 FROM "AccountRole" ar JOIN "RolePermission" rp ON rp."roleId"=ar."roleId"
      JOIN "Permission" pm ON pm.id=rp."permissionId"
      WHERE ar."accountId"=a.id AND pm.code='REPORT_READ'
    )
    ORDER BY (SELECT count(*) FROM "Visit" v WHERE v."employeeId"=e.id
      AND v."visitDate">=p.from_day AND v."visitDate"<p.to_day+1) DESC, e.id LIMIT 1
  )) AS actor FROM params p
), visits AS (
  SELECT v.* FROM "Visit" v CROSS JOIN scope s WHERE v."employeeId"=s.actor
    AND v."visitDate">=s.from_day AND v."visitDate"<s.to_day+1
    AND (s.visit_status IS NULL OR v.status=s.visit_status)
), appointments AS (
  SELECT a.* FROM "Appointment" a CROSS JOIN scope s WHERE a."employeeId"=s.actor
    AND a."scheduledAt">=s.from_day AND a."scheduledAt"<s.to_day+1
    AND (s.appointment_status IS NULL OR a.status=s.appointment_status)
), assigned AS (
  SELECT "patientId" FROM "Visit" v, scope s WHERE v."employeeId"=s.actor
  UNION SELECT "patientId" FROM "Appointment" a, scope s WHERE a."employeeId"=s.actor
), plans AS (
  SELECT t.status,t."createdAt" FROM "TreatmentPlan" t JOIN "Visit" v ON v.id=t."visitId"
  CROSS JOIN scope s WHERE v."employeeId"=s.actor AND t."createdAt">=s.from_day AND t."createdAt"<s.to_day+1
), sessions AS (
  SELECT t.status,t."createdAt" FROM "TreatmentSession" t JOIN "Visit" v ON v.id=t."visitId"
  CROSS JOIN scope s WHERE v."employeeId"=s.actor AND t."createdAt">=s.from_day AND t."createdAt"<s.to_day+1
    AND (s.session_status IS NULL OR t.status=s.session_status)
), usage AS (
  SELECT c."createdAt",c.unit,c."actualQuantity",c."totalCost" FROM "TreatmentConsumption" c
  JOIN "TreatmentSession" t ON t.id=c."sessionId" JOIN "Visit" v ON v.id=t."visitId"
  CROSS JOIN scope s WHERE v."employeeId"=s.actor AND c."createdAt">=s.from_day AND c."createdAt"<s.to_day+1
    AND (s.session_status IS NULL OR t.status=s.session_status)
), payments AS (
  SELECT p.* FROM "Payment" p JOIN "Invoice" i ON i.id=p."invoiceId" JOIN "Visit" v ON v.id=i."visitId"
  CROSS JOIN scope s WHERE v."employeeId"=s.actor AND p."paidAt">=s.from_day AND p."paidAt"<s.to_day+1
), allocated AS (
  SELECT COALESCE(sum(a.amount),0) amount FROM payments p JOIN "PaymentAllocation" a ON a."paymentId"=p.id
  JOIN "InvoiceItem" i ON i.id=a."invoiceItemId" AND i."invoiceId"=p."invoiceId"
), invoice_totals AS (
  SELECT i.status,count(*) count,sum(i.total) invoice_amount,sum(p.amount) payment_amount,sum(i.total-p.amount) balance
  FROM "Invoice" i JOIN "Visit" v ON v.id=i."visitId"
  CROSS JOIN LATERAL (SELECT COALESCE(sum(amount),0) amount FROM "Payment" WHERE "invoiceId"=i.id) p
  CROSS JOIN scope s WHERE v."employeeId"=s.actor AND v."visitDate">=s.from_day AND v."visitDate"<s.to_day+1
  GROUP BY i.status
), trend AS (
  SELECT 'visit' kind,"visitDate" AS moment FROM visits UNION ALL
  SELECT 'appointment',"scheduledAt" FROM appointments UNION ALL
  SELECT 'plan',"createdAt" FROM plans UNION ALL SELECT 'session',"createdAt" FROM sessions
), statuses AS (
  SELECT 'visit' kind,status FROM visits UNION ALL SELECT 'appointment',status FROM appointments UNION ALL
  SELECT 'plan',status FROM plans UNION ALL SELECT 'session',status FROM sessions
)
SELECT (SELECT count(*) FROM assigned) patients_all_time, (SELECT count(DISTINCT "patientId") FROM visits) patients_in_period,
  (SELECT count(*) FROM visits) visits, (SELECT count(*) FROM appointments) appointments,
  (SELECT count(*) FROM plans) plans, (SELECT count(*) FROM sessions) sessions,
  (SELECT COALESCE(sum("totalCost"),0) FROM usage) recorded_cost,
  (SELECT count(*) FROM payments) payment_count, (SELECT COALESCE(sum(amount),0) FROM payments) payment_amount,
  allocated.amount allocated_amount, (SELECT COALESCE(sum(amount),0) FROM payments)-allocated.amount payment_minus_allocations,
  (SELECT jsonb_agg(t ORDER BY status) FROM invoice_totals t) invoices,
  (SELECT jsonb_agg(q ORDER BY q.kind,q.status) FROM (SELECT kind,status,count(*) FROM statuses GROUP BY 1,2) q) statuses,
  (SELECT jsonb_agg(q ORDER BY q.kind,q.bucket,q.day) FROM (
    SELECT kind,bucket,date_trunc(bucket,moment)::date AS day,count(*) FROM trend
    CROSS JOIN (VALUES ('day'),('week'),('month')) b(bucket) GROUP BY 1,2,3
  ) q) trend,
  (SELECT jsonb_agg(q ORDER BY q.unit) FROM (SELECT unit,count(*),sum("actualQuantity") quantity FROM usage GROUP BY 1) q) usage_by_unit,
  (SELECT jsonb_agg(q ORDER BY q.day) FROM (SELECT "createdAt"::date AS day,count(*),sum("totalCost") amount FROM usage GROUP BY 1) q) usage_by_day,
  (SELECT jsonb_agg(q ORDER BY q.method) FROM (SELECT method,count(*),sum(amount) amount FROM payments GROUP BY 1) q) payments_by_method,
  (SELECT jsonb_agg(q ORDER BY q.day) FROM (SELECT "paidAt"::date AS day,count(*),sum(amount) amount FROM payments GROUP BY 1) q) payments_by_day
FROM allocated;

-- RPT03_STOCK
WITH params AS (
  SELECT DATE '2026-01-01' AS from_day, DATE '2026-12-31' AS to_day, NULL::text AS item_search
), catalog AS (
  SELECT 'medicine' kind,id,name,unit,stock,"minStock",status FROM "Medicine" UNION ALL
  SELECT 'supply',id,name,unit,stock,"minStock",status FROM "Supply"
), matching AS (
  SELECT * FROM catalog,params WHERE item_search IS NULL OR strpos(lower(name),lower(item_search))>0
), movements AS (
  SELECT it."transactionType",it.unit,it.quantity,it."createdAt"::date AS day FROM "InventoryTransaction" it
  CROSS JOIN params p WHERE it."createdAt">=p.from_day AND it."createdAt"<p.to_day+1
  AND (p.item_search IS NULL OR EXISTS (SELECT 1 FROM matching m WHERE
    (m.kind='medicine' AND m.id=it."medicineId") OR (m.kind='supply' AND m.id=it."supplyId")))
)
SELECT (SELECT count(*) FROM catalog WHERE kind='medicine') medicines,
  (SELECT count(*) FROM catalog WHERE kind='supply') supplies,
  (SELECT count(*) FROM catalog WHERE stock<="minStock") low_stock,
  (SELECT count(*) FROM matching) matching_items_before_limit,
  (SELECT jsonb_agg(q ORDER BY q."transactionType",q.unit) FROM (
    SELECT "transactionType",unit,count(*),sum(quantity) quantity FROM movements GROUP BY 1,2) q) movements,
  (SELECT jsonb_agg(q ORDER BY q.day,q."transactionType",q.unit) FROM (
    SELECT day,"transactionType",unit,count(*),sum(quantity) quantity FROM movements GROUP BY 1,2,3) q) movements_by_day;

-- NTF01_NTF02
SELECT (SELECT count(*) FROM "Appointment") appointments,
  (SELECT count(*) FROM "Appointment" WHERE "treatmentSessionId" IS NOT NULL) linked_appointments,
  (SELECT jsonb_agg(n ORDER BY type,status) FROM (SELECT type,status,count(*) FROM "Notification"
    WHERE type IN ('APPOINTMENT_REMINDER','TREATMENT_SESSION_REMINDER') GROUP BY 1,2) n) legacy_reminders,
  (SELECT count(*) FROM "NotificationDelivery") deliveries,
  (SELECT jsonb_agg(s ORDER BY status) FROM (
    SELECT ts.status,count(*) sessions,count(ts."completedAt") completed_at_present,
      count(*) FILTER (WHERE NULLIF(btrim(ts."adverseReaction"),'') IS NOT NULL) reaction_present,
      count(*) FILTER (WHERE pc.id IS NOT NULL AND v."patientId"=tp."patientId"
        AND pv."patientId"=v."patientId") matching_procedure_patient
    FROM "TreatmentSession" ts JOIN "Visit" v ON v.id=ts."visitId"
    LEFT JOIN "TreatmentStage" tg ON tg.id=ts."stageId"
    LEFT JOIN "TreatmentPlan" tp ON tp.id=tg."planId" LEFT JOIN "Visit" pv ON pv.id=tp."visitId"
    LEFT JOIN "TreatmentStep" st ON st.id=ts."stepId" AND st."stageId"=tg.id
    LEFT JOIN "ProcedureCatalog" pc ON pc.id=st."procedureId" GROUP BY ts.status
  ) s) session_evidence;
