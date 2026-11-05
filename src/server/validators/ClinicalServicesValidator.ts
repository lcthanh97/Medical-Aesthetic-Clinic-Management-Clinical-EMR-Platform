import {
  ImagingOrderIdSchema,
  ImagingResultInputSchema,
  ImagingResultUpdateSchema,
  ImagingSearchSchema,
} from '@/features/clinical-services/schemas/clinical-services.schema';

export class ClinicalServicesValidator {
  parseSearch(value: unknown): string | undefined {
    const parsed = ImagingSearchSchema.parse(value);
    return parsed.q || undefined;
  }

  parseCreateImagingResult(value: unknown) {
    return ImagingResultInputSchema.parse(value);
  }

  parseOrderId(value: unknown): string {
    return ImagingOrderIdSchema.parse(value);
  }

  parseUpdateImagingResult(value: unknown) {
    return ImagingResultUpdateSchema.parse(value);
  }
}
