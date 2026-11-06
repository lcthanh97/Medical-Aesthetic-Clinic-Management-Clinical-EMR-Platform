export type ReportsFilters = {
  startDate: string;
  endDate: string;
  startAt: Date;
  endExclusive: Date;
  visitStatus?: string;
  appointmentStatus?: string;
  treatmentSessionStatus?: string;
  itemSearch?: string;
};

export type ReportsActorScope = { accountId: string; employeeId: string };

export type CountByStatus = { status: string; count: number };
export type CountByDate = { date: string; count: number };
export type AmountByDate = { date: string; amount: string; count: number };

export type ReportRepositoryData = {
  patients: { totalInScope: number; uniqueWithVisits: number; newInPeriod: null };
  visits: { total: number; byStatus: CountByStatus[]; byDate: CountByDate[] };
  appointments: { total: number; byStatus: CountByStatus[]; byDate: CountByDate[] };
  finance: null | {
    paymentCount: number;
    paymentAmount: string;
    allocatedAmount: string;
    unallocatedBalance: string;
    invoicesByStatus: Array<{ status: string; count: number; invoiceAmount: string; paymentAmount: string; balance: string }>;
    byMethod: Array<{ method: string; amount: string; count: number }>;
    byDate: AmountByDate[];
  };
  treatment: null | {
    planCount: number;
    plansByStatus: CountByStatus[];
    sessionCount: number;
    sessionsByStatus: CountByStatus[];
    plansByDate: CountByDate[];
    sessionsByDate: CountByDate[];
    consumptionTotalCost: string;
    consumptionByDate: AmountByDate[];
    quantityByUnit: Array<{ unit: string; quantity: string; lineCount: number }>;
  };
  inventory: null | {
    medicineCount: number;
    supplyCount: number;
    lowStockCount: number;
    stockItems: Array<{ kind: 'medicine' | 'supply'; id: string; name: string; unit: string; stock: string; minStock: string; status: string; low: boolean }>;
    lowStockItems: Array<{ kind: 'medicine' | 'supply'; id: string; name: string; unit: string; stock: string; minStock: string; status: string }>;
    transactionsByTypeAndUnit: Array<{ transactionType: string; unit: string; quantity: string; count: number }>;
    transactionsByDate: Array<{ date: string; transactionType: string; unit: string; quantity: string; count: number }>;
  };
};

export interface IReportsRepository {
  getDashboardReport(
    actor: ReportsActorScope,
    filters: ReportsFilters,
    access: { finance: boolean; treatment: boolean; inventory: boolean },
  ): Promise<ReportRepositoryData>;
}
