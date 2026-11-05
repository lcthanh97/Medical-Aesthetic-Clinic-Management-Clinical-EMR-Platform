import { useCallback, useEffect, useState } from 'react';
import { reportsApi } from '../api/reportsApi';
import type { ReportsFilters, ReportsViewModel } from '../types/reports.types';

export function useReports(filters: ReportsFilters) {
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [result, setResult] = useState<{ key: string; data: ReportsViewModel | null; error: string }>({ key: '', data: null, error: '' });
  const key = JSON.stringify([filters, refreshVersion]);

  useEffect(() => {
    let active = true;
    void reportsApi.getDashboard(filters)
      .then((data) => { if (active) setResult({ key, data, error: '' }); })
      .catch((cause: unknown) => {
        if (active) setResult({ key, data: null, error: cause instanceof Error ? cause.message : 'Không thể tải báo cáo.' });
      });
    return () => { active = false; };
  }, [filters, refreshVersion, key]);

  const refresh = useCallback(() => setRefreshVersion((current) => current + 1), []);
  return {
    data: result.key === key ? result.data : null,
    error: result.key === key ? result.error : '',
    isLoading: result.key !== key,
    refresh,
  };
}
