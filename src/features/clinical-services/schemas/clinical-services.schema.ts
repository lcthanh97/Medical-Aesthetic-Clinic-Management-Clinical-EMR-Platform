import { z } from 'zod';

export const ImagingSearchSchema = z.object({
  q: z.string().trim().max(120).optional(),
});

export const ImagingOrderIdSchema = z.string().trim().min(1).max(100);

export const ImagingResultInputSchema = z.object({
  orderId: z.string().trim().min(1).max(100),
  imagingType: z.string().trim().min(1).max(120),
  conclusion: z.string().trim().min(1).max(10000),
});

export const ImagingResultUpdateSchema = z.object({
  resultId: z.string().trim().min(1).max(100),
  imagingType: z.string().trim().min(1).max(120),
  conclusion: z.string().trim().min(1).max(10000),
});

export type ImagingSearchInput = z.infer<typeof ImagingSearchSchema>;
export type ImagingResultInput = z.infer<typeof ImagingResultInputSchema>;
export type ImagingResultUpdateInput = z.infer<typeof ImagingResultUpdateSchema>;

export interface ImagingResultView {
  id: string;
  imagingType: string;
  conclusion: string;
  fileUrl: string | null;
}

export interface ImagingOrderView {
  id: string;
  type: string;
  status: string;
  orderedAt: string;
  orderedByName: string | null;
  service: { code: string; name: string } | null;
  visit: {
    id: string;
    visitDate: string;
    status: string;
    patient: { patientCode: string; fullName: string };
  };
  imagingResults: ImagingResultView[];
  canWrite: boolean;
  writeBlockedReason: 'ORDER_TYPE_STATUS_UNVERIFIED' | null;
}
