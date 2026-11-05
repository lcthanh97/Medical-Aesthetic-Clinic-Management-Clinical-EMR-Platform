import { z } from 'zod';

export const CreateConsentTemplateSchema = z.object({
  name: z.string().min(3, 'Tên biểu mẫu cam kết phải có ít nhất 3 ký tự'),
  content: z.string().min(10, 'Nội dung biểu mẫu cam kết phải có ít nhất 10 ký tự'),
  procedureType: z.string().optional(),
});

export const UpdateConsentTemplateSchema = z.object({
  name: z.string().min(3, 'Tên biểu mẫu cam kết phải có ít nhất 3 ký tự').optional(),
  content: z.string().min(10, 'Nội dung biểu mẫu cam kết phải có ít nhất 10 ký tự'),
  procedureType: z.string().optional(),
});

export const CreateTemplateVersionSchema = z.object({
  content: z.string().min(10, 'Nội dung phiên bản mới phải có ít nhất 10 ký tự'),
  name: z.string().optional(),
  procedureType: z.string().optional(),
});

export const SignConsentSchema = z.object({
  templateId: z.string().min(1, 'Vui lòng chọn biểu mẫu cam kết'),
  visitId: z.string().min(1, 'Vui lòng cung cấp mã lượt khám (visitId)'),
  signerName: z.string().min(2, 'Họ tên người ký phải có ít nhất 2 ký tự'),
  signerType: z.enum(['PATIENT', 'REPRESENTATIVE']).default('PATIENT'),
  relationship: z.string().optional(),
  signatureDataUrl: z.string().min(100, 'Chữ ký điện tử không được để trống'),
  notes: z.string().optional(),
});

export const ConsentsSchema = z.object({
  id: z.string().optional(),
});
