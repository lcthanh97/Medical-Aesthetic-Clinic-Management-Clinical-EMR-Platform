import { z } from 'zod';

const id = z.string().min(1).max(100);
const optionalId = id.nullable().optional();
const futureDate = z.string().refine((value) => Number.isFinite(new Date(value).getTime()), 'Thời gian hẹn không hợp lệ.');

export const contactSchema = z.object({
  outcome: z.enum(['BN_XAC_NHAN', 'XIN_DOI_LICH', 'TU_CHOI', 'KHONG_LIEN_LAC_DUOC', 'HEN_GOI_LAI']),
  note: z.string().max(500, 'Ghi chú tối đa 500 ký tự.').optional(),
  callbackAt: futureDate.optional(),
}).refine((value) => value.outcome !== 'HEN_GOI_LAI' || Boolean(value.callbackAt), {
  path: ['callbackAt'], message: 'Vui lòng chọn thời điểm gọi lại.',
});

export const bookingSchema = z.object({
  scheduledAt: futureDate,
  employeeId: id,
  serviceId: optionalId,
  roomId: optionalId,
});

export const rescheduleSchema = bookingSchema.pick({ scheduledAt: true, employeeId: true }).extend({
  reason: z.enum(['BN_YEU_CAU', 'PHONG_KHAM_DOI', 'KHAC']),
  note: z.string().max(500, 'Ghi chú tối đa 500 ký tự.').optional(),
});

export const listSchema = z.object({
  tab: z.enum(['todo', 'booked', 'all']).default('todo'),
  from: z.iso.date().optional(), to: z.iso.date().optional(),
  priority: z.enum(['NORMAL', 'IMPORTANT', 'URGENT']).optional(),
  doctorId: id.optional(), search: z.string().max(100).optional(),
  quick: z.enum(['overdue', 'next7']).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
});

export type ContactInput = z.infer<typeof contactSchema>;
export type BookingInput = z.infer<typeof bookingSchema>;
export type RescheduleInput = z.infer<typeof rescheduleSchema>;
export type ListInput = z.infer<typeof listSchema>;
