'use client';

import { useCallback, useEffect, useState } from 'react';
import { prescriptionsApi } from '@/features/prescriptions/api/prescriptionsApi';
import type {
  PrescriptionListView,
  PrescriptionMedicineView,
  PrescriptionView,
  PrescriptionVisitView,
} from '@/features/prescriptions/schemas/prescriptions.schema';

export function usePrescriptions() {
  const [data, setData] = useState<PrescriptionListView | null>(null);
  const [visits, setVisits] = useState<PrescriptionVisitView[]>([]);
  const [medicines, setMedicines] = useState<PrescriptionMedicineView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (search?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await prescriptionsApi.list(search));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể tải danh sách đơn thuốc.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadVisits = useCallback(async (search?: string) => {
    try {
      const result = await prescriptionsApi.assignedVisits(search);
      setVisits(result);
      return result;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Không thể tải lượt khám được phân công.';
      setError(message);
      return [];
    }
  }, []);

  const loadMedicines = useCallback(async (search?: string) => {
    try {
      const result = await prescriptionsApi.medicines(search);
      setMedicines(result);
      return result;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Không thể tải danh mục thuốc.';
      setError(message);
      return [];
    }
  }, []);

  const getById = useCallback(async (id: string): Promise<PrescriptionView | null> => {
    try {
      setError(null);
      return await prescriptionsApi.getById(id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể tải chi tiết đơn thuốc.');
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;
    prescriptionsApi.list().then((result) => {
      if (active) setData(result);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Không thể tải danh sách đơn thuốc.');
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, []);

  return { data, visits, medicines, isLoading, error, setError, load, loadVisits, loadMedicines, getById };
}
