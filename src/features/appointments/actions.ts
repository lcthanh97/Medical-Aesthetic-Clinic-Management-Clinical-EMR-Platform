'use server';

import { PrismaAppointmentsRepository } from '@/infrastructure/database/repositories/PrismaAppointmentsRepository';
import { PrismaAuthRepository } from '@/infrastructure/database/repositories/PrismaAuthRepository';
import { AppointmentsService } from '@/server/services/AppointmentsService';
import { AuthService } from '@/server/services/AuthService';
import { AuthorizationService } from '@/server/policies/AuthorizationService';
import { isDoctorReadEnvironment } from '@/server/policies/DoctorDatabaseAccess';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type { Prisma } from '@prisma/client';

const repository = new PrismaAppointmentsRepository();
const service = new AppointmentsService(repository);
const dashboardAuth = new AuthService(new PrismaAuthRepository());
const dashboardAuthorization = new AuthorizationService();

function isLocalDashboardTestEnvironment(): boolean {
  return isDoctorReadEnvironment();
}

function localDateBounds(dateValue?: string) {
  const formatDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const value = dateValue?.trim() || formatDate(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const startAt = new Date(`${value}T00:00:00`);
  if (Number.isNaN(startAt.getTime()) || formatDate(startAt) !== value) return null;
  const endAt = new Date(startAt);
  endAt.setDate(endAt.getDate() + 1);
  return { date: value, startAt, endAt };
}

export async function getDoctorDashboard(input: { date?: string } = {}) {
  if (!isLocalDashboardTestEnvironment()) {
    return { success: false as const, code: 'UNAVAILABLE' as const, error: 'Dashboard chưa được bật cho môi trường dữ liệu hiện tại.' };
  }

  const dateBounds = localDateBounds(input.date);
  if (!dateBounds) {
    return { success: false as const, code: 'INVALID_DATE' as const, error: 'Ngày lọc không hợp lệ.' };
  }

  try {
    const actor = await dashboardAuth.getSession((await cookies()).get('clinic_session')?.value);
    if (!actor) {
      return { success: false as const, code: 'AUTH_REQUIRED' as const, error: 'Vui lòng đăng nhập để xem dữ liệu lịch khám.' };
    }
    if (!actor.employeeId || !dashboardAuthorization.hasPermission(actor, 'EMR_READ')) {
      return { success: false as const, code: 'ACCESS_DENIED' as const, error: 'Tài khoản không có quyền xem dashboard bác sĩ.' };
    }

    const data = await service.getDoctorDashboardSnapshot(actor.employeeId, dateBounds.startAt, dateBounds.endAt);
    return { success: true as const, data, selectedDate: dateBounds.date, employeeName: actor.employeeName, asOf: new Date().toISOString() };
  } catch {
    return { success: false as const, code: 'LOAD_FAILED' as const, error: 'Không thể tải dashboard từ dữ liệu được phân công.' };
  }
}

export async function getAppointments() {
  try {
    const appointments = await service.getList();
    return { success: true, data: appointments };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAppointmentById(id: string) {
  try {
    const appointment = await service.getById(id);
    return { success: true, data: appointment };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createAppointment(input: Prisma.AppointmentUncheckedCreateInput) {
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
  try {
    const appointment = await service.update(id, input);
    revalidatePath('/appointments');
    return { success: true, data: appointment };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteAppointment(id: string) {
  try {
    await service.delete(id);
    revalidatePath('/appointments');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAppointmentsMetadata() {
  try {
    const { prisma } = await import('@/infrastructure/database/prisma');
    const [rooms, employees, patients] = await Promise.all([
      prisma.room.findMany(),
      prisma.employee.findMany(),
      prisma.patient.findMany(),
    ]);
    return { success: true, data: { rooms, employees, patients } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createCustomerAppointment(input: {
  fullName: string;
  phone: string;
  dateOfBirth?: string;
  scheduledAt: string;
  roomId?: string;
  employeeId?: string;
}) {
  try {
    const { prisma } = await import('@/infrastructure/database/prisma');
    let patient = await prisma.patient.findFirst({
      where: { phone: input.phone }
    });

    if (!patient) {
      const count = await prisma.patient.count();
      const patientCode = `BN${String(count + 1).padStart(4, '0')}`;
      patient = await prisma.patient.create({
        data: {
          patientCode,
          fullName: input.fullName,
          phone: input.phone,
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
        }
      });
    }

    const appointment = await service.create({
      patientId: patient.id,
      roomId: input.roomId || null,
      employeeId: input.employeeId || null,
      scheduledAt: new Date(input.scheduledAt),
      status: 'SCHEDULED'
    });
    
    revalidatePath('/appointments');
    revalidatePath('/khachhang/appointments');
    revalidatePath('/letan/appointments');
    revalidatePath('/letan/reception');
    return { success: true, data: appointment };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

