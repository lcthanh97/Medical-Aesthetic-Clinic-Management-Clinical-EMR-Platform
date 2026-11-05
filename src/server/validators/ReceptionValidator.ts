import { z } from 'zod';

const allergyInputSchema = z.object({
  substance: z.string().trim().min(1, 'Tên dị nguyên không được để trống'),
  reaction: z.string().optional().nullable(),
  severity: z.string().optional().nullable(),
});

const historyInputSchema = z.object({
  type: z.string().trim().min(1, 'Loại tiền sử không được để trống'),
  content: z.string().trim().min(1, 'Nội dung tiền sử không được để trống'),
});

const createPatientBodySchema = z.object({
  fullName: z.string().trim().min(2, 'Họ và tên bệnh nhân phải có tối thiểu 2 ký tự'),
  dateOfBirth: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().nullable(),
  phone: z.string().trim().min(8, 'Số điện thoại không hợp lệ').max(15).optional().nullable(),
  allergies: z.array(allergyInputSchema).optional(),
  histories: z.array(historyInputSchema).optional(),
});

const updatePatientBodySchema = createPatientBodySchema.partial();

const listQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

const duplicateCheckSchema = z.object({
  phone: z.string().optional(),
  fullName: z.string().optional(),
  dateOfBirth: z.string().optional(),
});

export class ReceptionValidator {
  static validateCreate(data: unknown) {
    return createPatientBodySchema.parse(data);
  }

  static validateUpdate(data: unknown) {
    return updatePatientBodySchema.parse(data);
  }

  static validateListQuery(data: unknown) {
    return listQuerySchema.parse(data);
  }

  static validateDuplicateQuery(data: unknown) {
    return duplicateCheckSchema.parse(data);
  }
}
