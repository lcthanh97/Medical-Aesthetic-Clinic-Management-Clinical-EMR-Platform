import { z } from 'zod';
export const NotificationsSchema = z.object({
  type: z.string().trim().max(64).optional(),
  status: z.string().trim().max(64).optional(),
  page: z.number().int().min(0).max(200).default(0),
}).strict();
