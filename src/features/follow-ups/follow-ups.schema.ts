import { z } from 'zod';

const optionalText = (max: number) => z.string().trim().max(max).optional().nullable();
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
});

export const FollowUpDecisionSchema = z.enum(['SCHEDULED', 'NOT_NEEDED', 'ON_SYMPTOMS']);
export const FollowUpPrioritySchema = z.enum(['NORMAL', 'IMPORTANT', 'URGENT']);

export const FollowUpDraftSchema = z.object({
  decision: FollowUpDecisionSchema,
  targetDate: dateOnly.optional().nullable(),
  windowDays: z.number().int().min(0).max(90).optional().nullable(),
  priority: FollowUpPrioritySchema.optional(),
  reason: optionalText(2000),
  preparation: optionalText(2000),
  homeCare: optionalText(5000),
  avoid: optionalText(5000),
  warningSigns: optionalText(5000),
  patientMessage: optionalText(5000),
  hideDiagnosis: z.boolean().optional(),
  templateId: z.string().trim().min(1).max(100).optional().nullable(),
  appliesTo: z.string().trim().min(1).max(120).optional(),
  treatmentSessionId: z.string().trim().min(1).max(100).optional().nullable(),
}).strict();

export const FollowUpCancelSchema = z.object({
  cancelReason: z.string().trim().min(1).max(2000),
}).strict();

export const AftercareTemplateCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  appliesTo: z.string().trim().max(120).optional().nullable(),
  homeCare: optionalText(5000),
  avoid: optionalText(5000),
  warningSigns: optionalText(5000),
}).strict();

export type FollowUpDraftInput = z.infer<typeof FollowUpDraftSchema>;
export type FollowUpCancelInput = z.infer<typeof FollowUpCancelSchema>;
export type AftercareTemplateCreateInput = z.infer<typeof AftercareTemplateCreateSchema>;
