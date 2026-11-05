import type { AuthActor } from './AuthService';
import type {
  ReportRepositoryData,
  ReportsFilters,
} from '@/server/repositories/IReportsRepository';

export type ReportsQueryInput = {
  startDate: string;
  endDate: string;
  visitStatus?: string;
  appointmentStatus?: string;
  treatmentSessionStatus?: string;
};

export type ReportsDashboardViewModel = ReportRepositoryData & {
  period: { startDate: string; endDate: string };
  capabilities: { finance: boolean; treatment: boolean; export: boolean };
};

export interface IReportsService {
  getDashboardReport(actor: AuthActor, input: ReportsQueryInput, exportRequested?: boolean): Promise<ReportsDashboardViewModel>;
}
