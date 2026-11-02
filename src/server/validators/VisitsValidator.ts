import { z } from 'zod';

export const createWalkInVisitSchema = z.object({
  patientId: z.string().min(1, 'Mã bệnh nhân không được để trống'),
  roomId: z.string().min(1, 'Phòng khám tiếp nhận không được để trống'),
  visitType: z.string().optional().default('NEW'),
  reason: z.string().min(1, 'Vui lòng nhập lý do khám của bệnh nhân'),
  receptionNote: z.string().optional(),
});

export const transferRoomSchema = z.object({
  targetRoomId: z.string().min(1, 'Phòng khám đích không được để trống'),
  reason: z.string().optional(),
});

export const cancelVisitSchema = z.object({
  reason: z.string().optional(),
});

export const visitListQuerySchema = z.object({
  date: z.string().optional(),
  roomId: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

