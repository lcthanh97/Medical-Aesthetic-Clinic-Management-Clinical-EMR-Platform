import type { INotificationsRepository } from '@/server/repositories/INotificationsRepository';
import type {
  NotificationActorScope,
  NotificationFilters,
  NotificationPage,
  NotificationRecord,
} from '@/server/repositories/INotificationsRepository';
import { prisma } from '@/infrastructure/database/prisma';

const PAGE_SIZE = 25;

function toNotificationRecord(record: {
  id: string;
  type: string;
  content: string;
  status: string;
  scheduledAt: Date | null;
  deliveries?: Array<{
    id: string;
    channel: string;
    status: string;
    attemptedAt: Date;
    deliveredAt: Date | null;
  }>;
}): NotificationRecord {
  return {
    id: record.id,
    type: record.type,
    content: record.content,
    status: record.status,
    scheduledAt: record.scheduledAt,
    ...(record.deliveries ? { deliveries: record.deliveries } : {}),
  };
}

export class PrismaNotificationsRepository implements INotificationsRepository {
  async findForRecipient(
    actor: NotificationActorScope,
    filters: NotificationFilters,
    includeDeliveries: boolean,
  ): Promise<NotificationPage> {
    const where = {
      recipient: actor.accountId,
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    };
    const skip = filters.page * PAGE_SIZE;
    const [records, totalRows] = await prisma.$transaction([
      includeDeliveries
        ? prisma.notification.findMany({
            where,
            orderBy: [{ scheduledAt: 'desc' }, { id: 'desc' }],
            skip,
            take: PAGE_SIZE,
            select: {
              id: true, type: true, content: true, status: true, scheduledAt: true,
              deliveries: {
                orderBy: { attemptedAt: 'desc' },
                select: { id: true, channel: true, status: true, attemptedAt: true, deliveredAt: true },
              },
            },
          })
        : prisma.notification.findMany({
            where,
            orderBy: [{ scheduledAt: 'desc' }, { id: 'desc' }],
            skip,
            take: PAGE_SIZE,
            select: { id: true, type: true, content: true, status: true, scheduledAt: true },
          }),
      prisma.notification.count({ where }),
    ]);

    return {
      rows: records.map((record) => toNotificationRecord(record)),
      totalRows,
      page: filters.page,
      pageSize: PAGE_SIZE,
    };
  }

  async findByIdForRecipient(
    actor: NotificationActorScope,
    id: string,
    includeDeliveries: boolean,
  ): Promise<NotificationRecord | null> {
    const record = includeDeliveries
      ? await prisma.notification.findFirst({
          where: { id, recipient: actor.accountId },
          select: {
            id: true, type: true, content: true, status: true, scheduledAt: true,
            deliveries: {
              orderBy: { attemptedAt: 'desc' },
              select: { id: true, channel: true, status: true, attemptedAt: true, deliveredAt: true },
            },
          },
        })
      : await prisma.notification.findFirst({
          where: { id, recipient: actor.accountId },
          select: { id: true, type: true, content: true, status: true, scheduledAt: true },
        });
    return record ? toNotificationRecord(record) : null;
  }
}
