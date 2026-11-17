import { z } from 'zod';

const optionalId = z.string().min(1).max(100).optional();
const base = z.object({
  period: z.enum(['week', 'month', 'quarter', 'year', 'custom']).default('month'),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  doctorId: optionalId,
  procedureId: optionalId,
  planStatus: z.enum(['ACTIVE', 'COMPLETED', 'DRAFT']).optional(),
});

export const reportQuerySchema = base.extend({
  view: z.enum(['summary', 'plans', 'sessions', 'options']).default('summary'),
  group: z.enum(['all', 'completed', 'upcoming', 'cancelled', 'overdue']).default('all'),
  planId: optionalId,
  page: z.coerce.number().int().min(1).max(100000).default(1),
});

export const reportCsvSchema = base;
export type ReportFilters = z.infer<typeof reportCsvSchema>;
export type ReportQuery = z.infer<typeof reportQuerySchema>;
