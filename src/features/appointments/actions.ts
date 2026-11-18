'use server';

import { PrismaAppointmentsRepository } from '@/infrastructure/database/repositories/PrismaAppointmentsRepository';
import { AppointmentsService } from '@/server/services/AppointmentsService';
import { revalidatePath } from 'next/cache';
import type { Prisma } from '@prisma/client';
import { getPatientSession } from '@/server/auth/patient-session';
import { getStaffSession } from '@/server/auth/staff-session';
import { AppointmentsValidator } from '@/server/validators/AppointmentsValidator';
import { clinicSlotDate, clinicTimes, isFutureClinicSlot, slotDurationMs } from './utils/timeSlots';

const repository = new PrismaAppointmentsRepository();
const service = new AppointmentsService(repository);

async function canManageAppointments() {
  return Boolean(await getStaffSession('letan') || await getStaffSession('admin'));
}

export async function getAppointments() {
  if (!await canManageAppointments()) return { success: false, error: 'Vui lòng đăng nhập tài khoản nhân viên.' };
  try {
    const appointments = await service.getList();
    return { success: true, data: appointments };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAppointmentById(id: string) {
  if (!await canManageAppointments()) return { success: false, error: 'Vui lòng đăng nhập tài khoản nhân viên.' };
  try {
    const appointment = await service.getById(id);
    return { success: true, data: appointment };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createAppointment(input: Prisma.AppointmentUncheckedCreateInput) {
  if (!await canManageAppointments()) return { success: false, error: 'Vui lòng đăng nhập tài khoản nhân viên.' };
  try {
    const appointment = await service.create(input);
    revalidatePath('/appointments');
    revalidatePath('/khachhang/appointments');
    revalidatePath('/letan/appointments');
    return { success: true, data: appointment };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateAppointment(id: string, input: Prisma.AppointmentUpdateInput) {
  if (!await canManageAppointments()) return { success: false, error: 'Vui lòng đăng nhập tài khoản nhân viên.' };
  try {
    const appointment = await service.update(id, input);
    revalidatePath('/appointments');
    return { success: true, data: appointment };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteAppointment(id: string) {
  if (!await canManageAppointments()) return { success: false, error: 'Vui lòng đăng nhập tài khoản nhân viên.' };
  try {
    await service.delete(id);
    revalidatePath('/appointments');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAppointmentsMetadata() {
  if (!await canManageAppointments()) return { success: false, error: 'Vui lòng đăng nhập tài khoản nhân viên.' };
  try {
    const { prisma } = await import('@/infrastructure/database/prisma');
    const [rooms, employees, patients] = await Promise.all([
      prisma.room.findMany({ include: { department: true }, orderBy: { name: 'asc' } }),
      prisma.employee.findMany({
        where: { department: { name: { contains: 'Da', mode: 'insensitive' } } },
        include: { department: true },
        orderBy: { fullName: 'asc' },
      }),
      prisma.patient.findMany({ select: { id: true }, take: 1 }),
    ]);
    return { success: true, data: { rooms, employees, patients } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getCustomerAppointmentSlots(date: string, employeeId?: string, roomId?: string) {
  const first = clinicSlotDate(date, clinicTimes[0]);
  const last = clinicSlotDate(date, clinicTimes[clinicTimes.length - 1]);
  if (!first || !last) return { success: false as const, error: 'Ngày hẹn không hợp lệ.' };

  try {
    const { prisma } = await import('@/infrastructure/database/prisma');
    const appointments = await prisma.appointment.findMany({
      where: {
        scheduledAt: { gt: new Date(first.getTime() - slotDurationMs), lt: new Date(last.getTime() + slotDurationMs) },
        status: { not: 'CANCELLED' },
        ...(employeeId || roomId ? {
          OR: [...(employeeId ? [{ employeeId }] : []), ...(roomId ? [{ roomId }] : [])],
        } : { employeeId: null, roomId: null }),
      },
      select: { id: true, scheduledAt: true, status: true, patientId: true, employeeId: true, roomId: true },
    });
    const now = new Date();
    const data = clinicTimes.map((time) => {
      const scheduledAt = clinicSlotDate(date, time)!;
      const status = scheduledAt <= now ? 'past' as const
        : AppointmentsValidator.checkConflict({ scheduledAt, employeeId, roomId }, appointments)
          ? 'booked' as const : 'available' as const;
      return { time, status };
    });
    return { success: true as const, data };
  } catch {
    return { success: false as const, error: 'Không thể tải khung giờ. Vui lòng thử lại.' };
  }
}

type BookingInput = {
  scheduledAt: string;
  roomId?: string;
  employeeId?: string;
  serviceId?: string;
};

type WalkInPatient = { fullName: string; phone: string; dateOfBirth?: string };

export async function createCustomerAppointment(input: BookingInput) {
  const session = await getPatientSession();
  if (!session) return { success: false, authRequired: true, error: 'Vui lòng đăng nhập trước khi đặt lịch.' };
  if (!input?.serviceId) return { success: false, error: 'Vui lòng chọn dịch vụ khám.' };
  return createBooking(input, { patientId: session.patientId });
}

export async function createReceptionAppointment(input: BookingInput & WalkInPatient) {
  if (!await getStaffSession('letan')) return { success: false, error: 'Vui lòng đăng nhập tài khoản lễ tân.' };
  const fullName = typeof input.fullName === 'string' ? input.fullName.trim() : '';
  const phone = typeof input.phone === 'string' ? input.phone.replace(/\D/g, '') : '';
  if (!fullName || !phone) return { success: false, error: 'Vui lòng nhập họ tên và số điện thoại.' };
  return createBooking(input, { fullName, phone, dateOfBirth: input.dateOfBirth });
}

async function createBooking(input: BookingInput, identity: { patientId: string } | WalkInPatient) {
  const scheduledAt = new Date(typeof input?.scheduledAt === 'string' ? input.scheduledAt : '');
  if (!isFutureClinicSlot(scheduledAt)) {
    return { success: false, error: 'Vui lòng chọn khung giờ còn hiệu lực trong giờ làm việc.' };
  }
  try {
    const { prisma } = await import('@/infrastructure/database/prisma');
    const create = () => prisma.$transaction(async (tx) => {
      if (!isFutureClinicSlot(scheduledAt)) {
        throw new Error('Khung giờ đã qua. Vui lòng chọn giờ khác.');
      }

      let patientId: string;
      if ('patientId' in identity) {
        const serviceActive = await tx.serviceCatalog.findFirst({
          where: { id: input.serviceId, active: true },
          select: { id: true },
        });
        if (!serviceActive) throw new Error('Dịch vụ đã chọn hiện không còn nhận đặt lịch.');
        patientId = identity.patientId;
      } else {
        let patient = await tx.patient.findFirst({ where: { phone: identity.phone } });
        if (!patient) {
          let sequence = await tx.patient.count() + 1;
          let patientCode = `BN${String(sequence).padStart(4, '0')}`;
          while (await tx.patient.findUnique({ where: { patientCode }, select: { id: true } })) {
            sequence++;
            patientCode = `BN${String(sequence).padStart(4, '0')}`;
          }
          patient = await tx.patient.create({
            data: {
              patientCode,
              fullName: identity.fullName,
              phone: identity.phone,
              dateOfBirth: identity.dateOfBirth ? new Date(identity.dateOfBirth) : null,
            },
          });
        }
        patientId = patient.id;
      }

      return new AppointmentsService(new PrismaAppointmentsRepository(tx)).create({
        patientId,
        roomId: input.roomId || null,
        employeeId: input.employeeId || null,
        serviceId: input.serviceId || null,
        scheduledAt,
        status: 'SCHEDULED',
      });
    }, { isolationLevel: 'Serializable' });

    let appointment;
    for (let attempt = 0; ; attempt++) {
      try {
        appointment = await create();
        break;
      } catch (error) {
        const retryable = error instanceof Error && 'code' in error &&
          (error.code === 'P2034' || error.code === 'P2002');
        if (attempt === 2 || !retryable) {
          throw error;
        }
      }
    }

    revalidatePath('/appointments');
    revalidatePath('/khachhang/appointments');
    revalidatePath('/letan/appointments');
    revalidatePath('/letan/reception');
    return { success: true, data: appointment };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

