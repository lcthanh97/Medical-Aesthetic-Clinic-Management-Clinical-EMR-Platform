import type { ReportsDashboardViewModel } from '@/server/services/IReportsService';

export class ReportsMapper {
  static toCsv(report: ReportsDashboardViewModel): string {
    const rows: Array<Array<string | number>> = [['period_start', 'period_end', 'metric', 'date_or_group', 'value', 'unit']];
    const appendCounts = (metric: string, records: Array<{ date: string; count: number }>) => {
      records.forEach(({ date, count }) => rows.push([report.period.startDate, report.period.endDate, metric, date, count, 'count']));
    };
    const appendStatuses = (metric: string, records: Array<{ status: string; count: number }>) => {
      records.forEach(({ status, count }) => rows.push([report.period.startDate, report.period.endDate, metric, status, count, 'count']));
    };
    rows.push([report.period.startDate, report.period.endDate, 'unique_patients_with_assigned_visits', 'period', report.patients.uniqueWithVisits, 'count']);
    rows.push([report.period.startDate, report.period.endDate, 'unique_patients_with_assignment', 'all_dates', report.patients.totalInScope, 'count']);
    rows.push([report.period.startDate, report.period.endDate, 'new_patients', 'unavailable_no_createdAt', '', 'unavailable']);
    appendCounts('visits_by_day', report.visits.byDate);
    appendStatuses('visits_by_status', report.visits.byStatus);
    appendCounts('appointments_by_day', report.appointments.byDate);
    appendStatuses('appointments_by_status', report.appointments.byStatus);
    if (report.finance) {
      rows.push([report.period.startDate, report.period.endDate, 'allocated_payment_amount', 'paidAt_period', report.finance.allocatedAmount, 'VND']);
      rows.push([report.period.startDate, report.period.endDate, 'payment_minus_allocations', 'paidAt_period', report.finance.unallocatedBalance, 'VND']);
      for (const row of report.finance.invoicesByStatus) {
        rows.push([report.period.startDate, report.period.endDate, 'invoices_by_visit_date_status', row.status, row.count, 'count']);
        rows.push([report.period.startDate, report.period.endDate, 'invoice_value_by_visit_date_status', row.status, row.invoiceAmount, 'VND']);
        rows.push([report.period.startDate, report.period.endDate, 'invoice_payments_all_dates_by_status', row.status, row.paymentAmount, 'VND']);
        rows.push([report.period.startDate, report.period.endDate, 'invoice_minus_payments_by_status', row.status, row.balance, 'VND']);
      }
      report.finance.byDate.forEach(({ date, amount, count }) => {
        rows.push([report.period.startDate, report.period.endDate, 'payment_amount_by_paidAt', date, amount, 'VND']);
        rows.push([report.period.startDate, report.period.endDate, 'payments_by_paidAt', date, count, 'count']);
      });
      report.finance.byMethod.forEach(({ method, amount, count }) => {
        rows.push([report.period.startDate, report.period.endDate, 'payment_amount_by_method', method, amount, 'VND']);
        rows.push([report.period.startDate, report.period.endDate, 'payments_by_method', method, count, 'count']);
      });
    }
    if (report.treatment) {
      rows.push([report.period.startDate, report.period.endDate, 'treatment_plans_created_in_period', 'period', report.treatment.planCount, 'count']);
      appendStatuses('treatment_plans_by_stored_status', report.treatment.plansByStatus);
      appendStatuses('treatment_sessions_by_status', report.treatment.sessionsByStatus);
      appendCounts('treatment_plans_created_by_day', report.treatment.plansByDate);
      appendCounts('treatment_sessions_created_by_day', report.treatment.sessionsByDate);
      report.treatment.consumptionByDate.forEach(({ date, amount, count }) => {
        rows.push([report.period.startDate, report.period.endDate, 'stored_treatment_cost_by_recorded_day', date, amount, 'VND']);
        rows.push([report.period.startDate, report.period.endDate, 'consumption_lines_by_recorded_day', date, count, 'count']);
      });
      report.treatment.quantityByUnit.forEach(({ unit, quantity, lineCount }) => {
        rows.push([report.period.startDate, report.period.endDate, 'actual_consumption_by_unit', unit, quantity, unit]);
        rows.push([report.period.startDate, report.period.endDate, 'consumption_lines_by_unit', unit, lineCount, 'count']);
      });
    }
    if (report.inventory) {
      rows.push([report.period.startDate, report.period.endDate, 'medicine_catalog_items', 'current', report.inventory.medicineCount, 'count']);
      rows.push([report.period.startDate, report.period.endDate, 'supply_catalog_items', 'current', report.inventory.supplyCount, 'count']);
      rows.push([report.period.startDate, report.period.endDate, 'items_at_or_below_configured_minStock', 'current', report.inventory.lowStockCount, 'count']);
      rows.push([report.period.startDate, report.period.endDate, 'inventory_valuation', 'unavailable_no_approved_method', '', 'unavailable']);
      report.inventory.transactionsByTypeAndUnit.forEach(({ transactionType, unit, quantity, count }) => {
        rows.push([report.period.startDate, report.period.endDate, 'inventory_quantity_by_stored_transactionType', `${transactionType}:${unit}`, quantity, unit]);
        rows.push([report.period.startDate, report.period.endDate, 'inventory_rows_by_stored_transactionType', `${transactionType}:${unit}`, count, 'count']);
      });
      report.inventory.transactionsByDate.forEach(({ date, transactionType, unit, quantity, count }) => {
        rows.push([report.period.startDate, report.period.endDate, 'inventory_quantity_by_stored_transactionType_day', `${date}:${transactionType}:${unit}`, quantity, unit]);
        rows.push([report.period.startDate, report.period.endDate, 'inventory_rows_by_stored_transactionType_day', `${date}:${transactionType}:${unit}`, count, 'count']);
      });
    }

    const csvCell = (input: string | number) => {
      let value = String(input);
      if (/^[\s]*[=+\-@]/.test(value)) value = `'${value}`;
      return `"${value.replaceAll('"', '""')}"`;
    };
    return `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
  }
}
