import { z } from 'zod';

export const ConsentsSchema = z.object({ id: z.string().optional() });

const utcDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
});

export const DoctorConsentFiltersSchema = z.object({
  q: z.string().trim().max(100).optional().default(''),
  patientId: z.string().trim().min(1).max(100).optional(),
  visitId: z.string().trim().min(1).max(100).optional(),
  planId: z.string().trim().min(1).max(100).optional(),
  templateId: z.string().trim().min(1).max(100).optional(),
  from: utcDate.optional(),
  to: utcDate.optional(),
  page: z.number().int().min(1).max(1000).optional().default(1),
}).refine((value) => !value.from || !value.to || value.from <= value.to, {
  message: 'Khoảng ngày không hợp lệ.',
  path: ['to'],
});

export type DoctorConsentFilters = z.infer<typeof DoctorConsentFiltersSchema>;
