import { useCallback, useEffect, useState } from 'react';
import { notificationsApi } from '../api/notificationsApi';
import type {
  NotificationViewModel,
  NotificationsFilters,
  NotificationsPageViewModel,
} from '../types/notifications.types';

export function useNotifications(filters: NotificationsFilters) {
  const { type, status, page } = filters;
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [listResult, setListResult] = useState<{
    key: string;
    data: NotificationsPageViewModel | null;
    error: string;
  }>({ key: '', data: null, error: '' });
  const [selected, setSelected] = useState<NotificationViewModel | null>(null);
  const [detailError, setDetailError] = useState('');
  const queryKey = JSON.stringify([type ?? '', status ?? '', page, refreshVersion]);

  useEffect(() => {
    let active = true;
    void notificationsApi.list({ type, status, page })
      .then((data) => { if (active) setListResult({ key: queryKey, data, error: '' }); })
      .catch((cause: unknown) => {
        if (active) setListResult({
          key: queryKey,
          data: null,
          error: cause instanceof Error ? cause.message : 'Không thể tải thông báo lúc này.',
        });
      });
    return () => { active = false; };
  }, [type, status, page, refreshVersion, queryKey]);

  const refresh = useCallback(() => setRefreshVersion((current) => current + 1), []);

  const loadDetail = useCallback(async (id: string) => {
    setDetailError('');
    try {
      const record = await notificationsApi.getById(id);
      setSelected(record);
      return record;
    } catch (cause) {
      setDetailError(cause instanceof Error ? cause.message : 'Không thể tải chi tiết thông báo.');
      setSelected(null);
      return null;
    }
  }, []);

  return {
    data: listResult.key === queryKey ? listResult.data : null,
    selected,
    isLoading: listResult.key !== queryKey,
    error: detailError || (listResult.key === queryKey ? listResult.error : ''),
    refresh,
    loadDetail,
    clearDetail: () => setSelected(null),
  };
}
