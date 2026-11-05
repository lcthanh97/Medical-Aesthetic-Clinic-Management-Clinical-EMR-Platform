import type { NotificationPage, NotificationRecord } from '@/server/repositories/INotificationsRepository';

export class NotificationsMapper {
  static toView(record: NotificationRecord) {
    return {
      id: record.id,
      type: record.type,
      content: record.content,
      status: record.status,
      scheduledAt: record.scheduledAt?.toISOString() ?? null,
      deliveryHistory: record.deliveries?.map((delivery) => ({
        id: delivery.id,
        channel: delivery.channel,
        status: delivery.status,
        attemptedAt: delivery.attemptedAt.toISOString(),
        deliveredAt: delivery.deliveredAt?.toISOString() ?? null,
      })) ?? null,
      readReceiptSupported: false as const,
    };
  }

  static toPage(page: NotificationPage) {
    return {
      rows: page.rows.map((record) => this.toView(record)),
      totalRows: page.totalRows,
      page: page.page,
      pageSize: page.pageSize,
    };
  }
}
