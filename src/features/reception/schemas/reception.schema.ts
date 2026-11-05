import { z } from 'zod';

export const allergySchema = z.object({
  id: z.string().optional(),
  substance: z.string().min(1, 'Vui lòng nhập tên dị nguyên/chất gây dị ứng'),
  reaction: z.string().optional().nullable(),
  severity: z.string().optional().nullable(),
});

export const medicalHistorySchema = z.object({
  id: z.string().optional(),
  type: z.string().min(1, 'Vui lòng chọn hoặc nhập loại tiền sử'),
  content: z.string().min(1, 'Vui lòng nhập nội dung tiền sử'),
});

export const createPatientSchema = z.object({
  fullName: z.string().trim().min(2, 'Họ và tên bệnh nhân phải có tối thiểu 2 ký tự'),
  dateOfBirth: z.string().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  allergies: z.array(allergySchema).optional().default([]),
  histories: z.array(medicalHistorySchema).optional().default([]),
});

export const updatePatientSchema = createPatientSchema.partial();

export const duplicateCheckQuerySchema = z.object({
  phone: z.string().optional(),
  fullName: z.string().optional(),
  dateOfBirth: z.string().optional(),
});
