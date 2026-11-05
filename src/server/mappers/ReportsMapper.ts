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
    appendCounts('visits_by_day', report.visits.byDate);
    appendStatuses('visits_by_status', report.visits.byStatus);
    appendCounts('appointments_by_day', report.appointments.byDate);
    appendStatuses('appointments_by_status', report.appointments.byStatus);
    if (report.finance) {
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
      appendStatuses('treatment_sessions_by_status', report.treatment.sessionsByStatus);
      report.treatment.consumptionByDate.forEach(({ date, amount, count }) => {
        rows.push([report.period.startDate, report.period.endDate, 'stored_treatment_cost_by_recorded_day', date, amount, 'VND']);
        rows.push([report.period.startDate, report.period.endDate, 'consumption_lines_by_recorded_day', date, count, 'count']);
      });
      report.treatment.quantityByUnit.forEach(({ unit, quantity, lineCount }) => {
        rows.push([report.period.startDate, report.period.endDate, 'actual_consumption_by_unit', unit, quantity, unit]);
        rows.push([report.period.startDate, report.period.endDate, 'consumption_lines_by_unit', unit, lineCount, 'count']);
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
