'use client';

import { useState, useEffect, useCallback } from 'react';
import { visitsApi } from '../api/visitsApi';
import type { VisitItem, QueueSummary, RoomQueueItem } from '../types/visits.types';

export function useVisitsQueue() {
  const [queue, setQueue] = useState<VisitItem[]>([]);
  const [summary, setSummary] = useState<QueueSummary>({
    totalVisits: 0,
    waitingCount: 0,
    examiningCount: 0,
    completedCount: 0,
  });
  const [rooms, setRooms] = useState<RoomQueueItem[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQueueData = useCallback(async () => {
    try {
      const [queueRes, summaryRes, roomsRes] = await Promise.all([
        visitsApi.getQueue({
          roomId: selectedRoomId || undefined,
          status: selectedStatus || undefined,
        }),
        visitsApi.getQueueSummary(),
        visitsApi.getRooms(),
      ]);

      if (queueRes.success && queueRes.data) {
        let items = queueRes.data;
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          items = items.filter(
            (v) =>
              v.patientName.toLowerCase().includes(q) ||
              v.patientCode.toLowerCase().includes(q) ||
              v.visitCode.toLowerCase().includes(q) ||
              (v.patientPhone && v.patientPhone.includes(q))
          );
        }
        setQueue(items);
      } else {
        setError(queueRes.message || 'Không thể tải danh sách hàng đợi');
      }

      if (summaryRes.success && summaryRes.data) {
        setSummary(summaryRes.data);
      }

      if (roomsRes.success && roomsRes.data) {
        setRooms(roomsRes.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối máy chủ';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedRoomId, selectedStatus, search]);

  useEffect(() => {
    setIsLoading(true);
    fetchQueueData();

    // Auto-polling 10 giây/lần để đồng bộ dữ liệu thời gian thực
    const interval = setInterval(fetchQueueData, 10000);
    return () => clearInterval(interval);
  }, [fetchQueueData]);

  return {
    queue,
    summary,
    rooms,
    selectedRoomId,
    setSelectedRoomId,
    selectedStatus,
    setSelectedStatus,
    search,
    setSearch,
    isLoading,
    error,
    refresh: fetchQueueData,
  };
}

