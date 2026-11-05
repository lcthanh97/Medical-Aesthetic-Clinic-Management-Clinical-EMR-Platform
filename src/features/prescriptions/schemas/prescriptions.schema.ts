import { z } from 'zod';

export const PrescriptionSearchSchema = z.object({
  q: z.string().trim().max(100).optional(),
});

export const PrescriptionItemInputSchema = z.object({
  medicineId: z.string().trim().min(1).max(100),
  quantity: z.number().finite().gt(0).max(1_000_000),
  dosage: z.string().trim().min(1).max(2_000),
}).strict();

export const PrescriptionItemsSchema = z.array(PrescriptionItemInputSchema).min(1).max(50);

export const PrescriptionCreateSchema = z.object({
  visitId: z.string().trim().min(1).max(100),
  items: PrescriptionItemsSchema,
}).strict();

export const PrescriptionUpdateSchema = z.object({
  items: PrescriptionItemsSchema,
}).strict();

export type PrescriptionItemInput = z.infer<typeof PrescriptionItemInputSchema>;
export type PrescriptionCreateInput = z.infer<typeof PrescriptionCreateSchema>;
export type PrescriptionUpdateInput = z.infer<typeof PrescriptionUpdateSchema>;

export type {
  PrescriptionItemView,
  PrescriptionListView,
  PrescriptionMedicineView,
  PrescriptionView,
  PrescriptionVisitView,
} from '../types/prescriptions.types';
