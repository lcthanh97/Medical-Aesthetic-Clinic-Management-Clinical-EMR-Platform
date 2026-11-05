import { z } from 'zod';
import type { NotificationFilters } from '@/server/repositories/INotificationsRepository';

const optionalFilter = z.string().trim().min(1).max(64).optional();
const listSchema = z.object({
  type: optionalFilter,
  status: optionalFilter,
  page: z.number().int().min(0).max(200).default(0),
}).strict();
const idSchema = z.string().trim().min(1).max(100);

export class NotificationsValidator {
  parseList(input: unknown): NotificationFilters {
    return listSchema.parse(input);
  }

  parseId(input: unknown): string {
    return idSchema.parse(input);
  }
}
