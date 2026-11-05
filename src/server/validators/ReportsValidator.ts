import { z } from 'zod';
import type { ReportsQueryInput } from '@/server/services/IReportsService';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const filterSchema = z.object({
  startDate: z.string().regex(datePattern),
  endDate: z.string().regex(datePattern),
  visitStatus: z.string().trim().min(1).max(64).optional(),
  appointmentStatus: z.string().trim().min(1).max(64).optional(),
  treatmentSessionStatus: z.string().trim().min(1).max(64).optional(),
}).strict();

export class ReportsValidator {
  parseFilters(input: unknown): ReportsQueryInput {
    const filters = filterSchema.parse(input);
    const start = new Date(`${filters.startDate}T00:00:00.000Z`);
    const end = new Date(`${filters.endDate}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())
      || start.toISOString().slice(0, 10) !== filters.startDate
      || end.toISOString().slice(0, 10) !== filters.endDate) {
      throw new Error('REPORT_INVALID_DATE');
    }
    if (start > end) throw new Error('REPORT_INVALID_RANGE');
    const inclusiveDays = (end.getTime() - start.getTime()) / 86_400_000 + 1;
    if (inclusiveDays > 366) throw new Error('REPORT_RANGE_TOO_LARGE');
    return filters;
  }
}
