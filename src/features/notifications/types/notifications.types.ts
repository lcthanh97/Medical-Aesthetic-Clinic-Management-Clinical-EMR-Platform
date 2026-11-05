export interface NotificationDeliveryViewModel {
  id: string;
  channel: string;
  status: string;
  attemptedAt: string;
  deliveredAt: string | null;
}

export interface NotificationViewModel {
  id: string;
  type: string;
  content: string;
  status: string;
  scheduledAt: string | null;
  deliveryHistory: NotificationDeliveryViewModel[] | null;
  readReceiptSupported: false;
}

export interface NotificationsPageViewModel {
  rows: NotificationViewModel[];
  totalRows: number;
  page: number;
  pageSize: number;
}

export interface NotificationsFilters {
  type?: string;
  status?: string;
  page: number;
}
