import { z } from 'zod';
export const AuditFiltersSchema = z.object({
  query: z.string().trim().max(120).optional(), entity: z.string().trim().max(80).optional(),
  accountId: z.string().optional(), from: z.string().datetime().optional(), to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
