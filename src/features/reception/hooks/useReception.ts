'use client';

import { useState, useEffect, useCallback } from 'react';
import { receptionApi } from '../api/receptionApi';
import type { PatientItem, ReceptionStats } from '../types/reception.types';

export function useReception() {
  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [stats, setStats] = useState<ReceptionStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [res, statsRes] = await Promise.all([
        receptionApi.getPatients({ search: search.trim() || undefined, page, limit }),
        receptionApi.getStats(),
      ]);

      if (res.success && res.data) {
        setPatients(res.data.items);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      } else {
        setError(res.message || 'Không thể tải danh sách bệnh nhân');
      }

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi kết nối máy chủ');
    } finally {
      setIsLoading(false);
    }
  }, [search, page, limit]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  return {
    patients,
    stats,
    total,
    page,
    limit,
    totalPages,
    search,
    setSearch,
    setPage,
    isLoading,
    error,
    refresh: fetchPatients,
  };
}
