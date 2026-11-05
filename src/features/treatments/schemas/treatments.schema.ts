import { z } from 'zod';

export const TreatmentsSchema = z.object({ id: z.string().optional() });

export const TreatmentSessionFiltersSchema = z.object({
  q: z.string().trim().max(100).optional().default(''),
  status: z.string().trim().max(60).optional().default(''),
  visitId: z.string().trim().min(1).max(100).optional(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }).optional(),
});

export type TreatmentSessionFilters = z.infer<typeof TreatmentSessionFiltersSchema>;

export const ProtocolTemplateFiltersSchema = z.object({
  q: z.string().trim().max(100).optional().default(''),
  status: z.string().trim().max(60).optional().default(''),
  stageType: z.string().trim().max(60).optional().default(''),
  page: z.number().int().min(1).max(1000).optional().default(1),
});

export type ProtocolTemplateFilters = z.infer<typeof ProtocolTemplateFiltersSchema>;
