'use client';

import { useCallback, useEffect, useState } from 'react';
import { clinicalServicesApi } from '../api/clinical-servicesApi';
import type { ImagingOrderView } from '../schemas/clinical-services.schema';

export function useClinicalServices() {
  const [data, setData] = useState<ImagingOrderView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (search = '') => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await clinicalServicesApi.list(search));
    } catch (cause) {
      setData([]);
      setError(cause instanceof Error ? cause.message : 'Không thể tải dữ liệu hình ảnh cận lâm sàng.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(() => reload()); }, [reload]);

  return { data, isLoading, error, reload };
}
