import {
  PrescriptionCreateSchema,
  PrescriptionSearchSchema,
  PrescriptionUpdateSchema,
  type PrescriptionCreateInput,
  type PrescriptionUpdateInput,
} from '@/features/prescriptions/schemas/prescriptions.schema';

export class PrescriptionsValidator {
  parseSearch(value: unknown): string | undefined {
    const parsed = PrescriptionSearchSchema.parse(value);
    return parsed.q || undefined;
  }

  parseCreate(value: unknown): PrescriptionCreateInput {
    return PrescriptionCreateSchema.parse(value);
  }

  parseUpdate(value: unknown): PrescriptionUpdateInput {
    return PrescriptionUpdateSchema.parse(value);
  }
}
