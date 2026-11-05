export type NotificationFilters = {
  type?: string;
  status?: string;
  page: number;
};

export type NotificationActorScope = {
  accountId: string;
};

export type NotificationDeliveryRecord = {
  id: string;
  channel: string;
  status: string;
  attemptedAt: Date;
  deliveredAt: Date | null;
};

export type NotificationRecord = {
  id: string;
  type: string;
  content: string;
  status: string;
  scheduledAt: Date | null;
  deliveries?: NotificationDeliveryRecord[];
};

export type NotificationPage = {
  rows: NotificationRecord[];
  totalRows: number;
  page: number;
  pageSize: number;
};

export interface INotificationsRepository {
  findForRecipient(
    actor: NotificationActorScope,
    filters: NotificationFilters,
    includeDeliveries: boolean,
  ): Promise<NotificationPage>;
  findByIdForRecipient(
    actor: NotificationActorScope,
    id: string,
    includeDeliveries: boolean,
  ): Promise<NotificationRecord | null>;
}
