import { z } from 'zod';
export const ReportsSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  visitStatus: z.string().trim().max(64).optional(),
  appointmentStatus: z.string().trim().max(64).optional(),
  treatmentSessionStatus: z.string().trim().max(64).optional(),
}).strict().refine((filters) => filters.startDate <= filters.endDate, {
  message: 'Start date must not be later than end date.',
  path: ['endDate'],
});
