export interface ReportsFilters {
  startDate: string;
  endDate: string;
  visitStatus?: string;
  appointmentStatus?: string;
  treatmentSessionStatus?: string;
}

export interface ReportsViewModel {
  period: { startDate: string; endDate: string };
  capabilities: { finance: boolean; treatment: boolean; export: boolean };
  visits: { total: number; byStatus: Array<{ status: string; count: number }>; byDate: Array<{ date: string; count: number }> };
  appointments: { total: number; byStatus: Array<{ status: string; count: number }>; byDate: Array<{ date: string; count: number }> };
  finance: null | {
    paymentCount: number;
    paymentAmount: string;
    byMethod: Array<{ method: string; amount: string; count: number }>;
    byDate: Array<{ date: string; amount: string; count: number }>;
  };
  treatment: null | {
    sessionCount: number;
    sessionsByStatus: Array<{ status: string; count: number }>;
    consumptionTotalCost: string;
    consumptionByDate: Array<{ date: string; amount: string; count: number }>;
    quantityByUnit: Array<{ unit: string; quantity: string; lineCount: number }>;
  };
}
