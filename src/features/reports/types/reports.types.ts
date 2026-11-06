export interface ReportsFilters {
  startDate: string;
  endDate: string;
  visitStatus?: string;
  appointmentStatus?: string;
  treatmentSessionStatus?: string;
  itemSearch?: string;
}

export type { ReportsDashboardViewModel as ReportsViewModel } from '@/server/services/IReportsService';
