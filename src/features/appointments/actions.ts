'use server';

import { PrismaAppointmentsRepository } from '@/infrastructure/database/repositories/PrismaAppointmentsRepository';
import { AppointmentsService } from '@/server/services/AppointmentsService';
import { revalidatePath } from 'next/cache';
import type { Prisma } from '@prisma/client';

const repository = new PrismaAppointmentsRepository();
const service = new AppointmentsService(repository);

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

