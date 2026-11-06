import type {
  NotificationViewModel,
  NotificationsFilters,
  NotificationsPageViewModel,
} from '../types/notifications.types';

type ApiResult<T> = { success: true; data: T } | { success: false; error: string };

export type NotificationDraft = {
  code: string;
  name: string;
  scope: string;
  body: string;
  notes: string;
  status: 'DRAFT';
  version: null;
};

async function request<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  const result = await response.json() as ApiResult<T>;
  if (!response.ok || !result.success) {
    throw new Error(result.success ? 'Không thể tải thông báo.' : result.error);
  }
  return result.data;
}

export const notificationsApi = {
  getWorkbookDrafts(): Promise<NotificationDraft[]> {
    return request('/api/notifications?view=workbook-drafts');
  },
  list(filters: NotificationsFilters): Promise<NotificationsPageViewModel> {
    const query = new URLSearchParams({ page: String(filters.page) });
    if (filters.type) query.set('type', filters.type);
    if (filters.status) query.set('status', filters.status);
    return request(`/api/notifications?${query.toString()}`);
  },
  getById(id: string): Promise<NotificationViewModel> {
    return request(`/api/notifications?id=${encodeURIComponent(id)}`);
  },
};
