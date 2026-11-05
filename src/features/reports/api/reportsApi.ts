import type { ReportsFilters, ReportsViewModel } from '../types/reports.types';

type ApiResult<T> = { success: true; data: T } | { success: false; error: string };

function urlFor(filters: ReportsFilters, format?: 'csv') {
  const query = new URLSearchParams({ startDate: filters.startDate, endDate: filters.endDate });
  if (filters.visitStatus) query.set('visitStatus', filters.visitStatus);
  if (filters.appointmentStatus) query.set('appointmentStatus', filters.appointmentStatus);
  if (filters.treatmentSessionStatus) query.set('treatmentSessionStatus', filters.treatmentSessionStatus);
  if (format) query.set('format', format);
  return `/api/reports?${query.toString()}`;
}

export const reportsApi = {
  async getDashboard(filters: ReportsFilters): Promise<ReportsViewModel> {
    const response = await fetch(urlFor(filters), { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } });
    const result = await response.json() as ApiResult<ReportsViewModel>;
    if (!response.ok || !result.success) throw new Error(result.success ? 'Không thể tải báo cáo.' : result.error);
    return result.data;
  },

  async exportCsv(filters: ReportsFilters): Promise<Blob> {
    const response = await fetch(urlFor(filters, 'csv'), { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'text/csv' } });
    if (!response.ok) {
      const result = await response.json() as ApiResult<never>;
      throw new Error(result.success ? 'Không thể xuất báo cáo.' : result.error);
    }
    return response.blob();
  },
};
