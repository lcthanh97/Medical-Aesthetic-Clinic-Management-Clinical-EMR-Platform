import { z } from 'zod';
export class ClinicalServicesValidator {
  static validateCreateOrder(input: unknown) { return z.object({visitId:z.string().min(1),type:z.enum(['LABORATORY','IMAGING','DERMATOLOGY_PROCEDURE']),services:z.array(z.object({serviceCode:z.string().min(1),notes:z.string().max(500).optional()})).min(1)}).parse(input); }
  static validateResults(input: unknown) { return z.object({labResults:z.array(z.object({testName:z.string().min(1),result:z.string().min(1),unit:z.string().optional()})).optional(),imagingResults:z.array(z.object({imagingType:z.string().min(1),conclusion:z.string().min(1),fileUrl:z.string().url().optional()})).optional(),notes:z.string().max(1000).optional()}).refine(v=>Boolean(v.labResults?.length||v.imagingResults?.length),{message:'Cần ít nhất một kết quả.'}).parse(input); }
}
