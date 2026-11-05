export type ReportsFilters = {
  startDate: string;
  endDate: string;
  startAt: Date;
  endExclusive: Date;
  visitStatus?: string;
  appointmentStatus?: string;
  treatmentSessionStatus?: string;
};

export type ReportsActorScope = { accountId: string; employeeId: string };

export type CountByStatus = { status: string; count: number };
export type CountByDate = { date: string; count: number };
export type AmountByDate = { date: string; amount: string; count: number };

export type ReportRepositoryData = {
  visits: { total: number; byStatus: CountByStatus[]; byDate: CountByDate[] };
  appointments: { total: number; byStatus: CountByStatus[]; byDate: CountByDate[] };
  finance: null | {
    paymentCount: number;
    paymentAmount: string;
    byMethod: Array<{ method: string; amount: string; count: number }>;
    byDate: AmountByDate[];
  };
  treatment: null | {
    sessionCount: number;
    sessionsByStatus: CountByStatus[];
    consumptionTotalCost: string;
    consumptionByDate: AmountByDate[];
    quantityByUnit: Array<{ unit: string; quantity: string; lineCount: number }>;
  };
};

export interface IReportsRepository {
  getDashboardReport(
    actor: ReportsActorScope,
    filters: ReportsFilters,
    access: { finance: boolean; treatment: boolean },
  ): Promise<ReportRepositoryData>;
}
