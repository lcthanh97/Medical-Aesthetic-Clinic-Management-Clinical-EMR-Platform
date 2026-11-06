import type { IReportsRepository } from '@/server/repositories/IReportsRepository';
import type { IReportsService } from './IReportsService';

export class ReportsService implements IReportsService {
  constructor(private readonly repository: IReportsRepository) {}

  private hasSameRolePermissions(actor: import('./AuthService').AuthActor, required: string[]) {
    return actor.rolePermissions.some((role) => required.every((permission) => role.permissionCodes.includes(permission)));
  }

  async getDashboardReport(actor: import('./AuthService').AuthActor, input: import('./IReportsService').ReportsQueryInput, exportRequested = false) {
    if (!actor.accountId || !actor.employeeId || !this.hasSameRolePermissions(actor, ['REPORT_READ'])) {
      throw new Error('REPORT_ACCESS_DENIED');
    }
    if (exportRequested && !this.hasSameRolePermissions(actor, ['REPORT_READ', 'REPORT_EXPORT'])) {
      throw new Error('REPORT_EXPORT_DENIED');
    }

    const startAt = new Date(`${input.startDate}T00:00:00.000Z`);
    const endExclusive = new Date(`${input.endDate}T00:00:00.000Z`);
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
    const filters: import('@/server/repositories/IReportsRepository').ReportsFilters = {
      startDate: input.startDate,
      endDate: input.endDate,
      startAt,
      endExclusive,
      ...(input.visitStatus ? { visitStatus: input.visitStatus } : {}),
      ...(input.appointmentStatus ? { appointmentStatus: input.appointmentStatus } : {}),
      ...(input.treatmentSessionStatus ? { treatmentSessionStatus: input.treatmentSessionStatus } : {}),
      ...(input.itemSearch ? { itemSearch: input.itemSearch } : {}),
    };
    const finance = this.hasSameRolePermissions(actor, ['REPORT_READ', 'BILLING_READ']);
    const treatment = this.hasSameRolePermissions(actor, ['REPORT_READ', 'INVENTORY_READ', 'TREATMENT_READ']);
    const inventory = this.hasSameRolePermissions(actor, ['REPORT_READ', 'INVENTORY_READ']);
    const data = await this.repository.getDashboardReport(
      { accountId: actor.accountId, employeeId: actor.employeeId },
      filters,
      { finance, treatment, inventory },
    );

    const dayAxis = this.makeDayAxis(startAt, endExclusive);
    const addZeros = (entries: Array<{ date: string; count: number }>) => {
      const counts = new Map(entries.map(({ date, count }) => [date, count]));
      return dayAxis.map((date) => ({ date, count: counts.get(date) ?? 0 }));
    };
    const addAmountZeros = (entries: Array<{ date: string; amount: string; count: number }>) => {
      const values = new Map(entries.map(({ date, amount, count }) => [date, { amount, count }]));
      return dayAxis.map((date) => ({ date, ...(values.get(date) ?? { amount: '0', count: 0 }) }));
    };

    return {
      ...data,
      visits: { ...data.visits, byDate: addZeros(data.visits.byDate) },
      appointments: { ...data.appointments, byDate: addZeros(data.appointments.byDate) },
      finance: data.finance ? { ...data.finance, byDate: addAmountZeros(data.finance.byDate) } : null,
      treatment: data.treatment ? { ...data.treatment, consumptionByDate: addAmountZeros(data.treatment.consumptionByDate) } : null,
      period: { startDate: input.startDate, endDate: input.endDate },
      capabilities: {
        finance,
        treatment,
        inventory,
        export: this.hasSameRolePermissions(actor, ['REPORT_READ', 'REPORT_EXPORT']),
      },
    };
  }

  private makeDayAxis(startAt: Date, endExclusive: Date): string[] {
    const days: string[] = [];
    for (const day = new Date(startAt); day < endExclusive; day.setUTCDate(day.getUTCDate() + 1)) {
      days.push(day.toISOString().slice(0, 10));
    }
    return days;
  }
}
