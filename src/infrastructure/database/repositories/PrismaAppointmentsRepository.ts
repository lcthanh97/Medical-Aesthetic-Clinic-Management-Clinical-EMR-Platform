import type { DoctorDashboardSnapshot, IAppointmentsRepository } from '@/server/repositories/IAppointmentsRepository';
import { prisma } from '@/infrastructure/database/prisma';
import type { Prisma, Appointment } from '@prisma/client';

export class PrismaAppointmentsRepository implements IAppointmentsRepository {
  async findById(id: string): Promise<Appointment | null> {
    return prisma.appointment.findUnique({
      where: { id },
      include: { patient: true, room: true, employee: true },
    });
  }

  async findMany(): Promise<Appointment[]> {
    return prisma.appointment.findMany({
      include: { patient: true, room: true, employee: true },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async findConflicts(scheduledAt: Date, windowMinutes: number = 30): Promise<Appointment[]> {
    const target = new Date(scheduledAt);
    const start = new Date(target.getTime() - windowMinutes * 60 * 1000);
    const end = new Date(target.getTime() + windowMinutes * 60 * 1000);

    return prisma.appointment.findMany({
      where: {
        scheduledAt: {
          gt: start,
          lt: end,
        },
        status: {
          not: 'CANCELLED',
        },
      },
      include: { patient: true, room: true, employee: true },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async create(input: Prisma.AppointmentUncheckedCreateInput): Promise<Appointment> {
    return prisma.appointment.create({
      data: input,
      include: { patient: true, room: true, employee: true },
    });
  }

  async update(id: string, input: Prisma.AppointmentUpdateInput): Promise<Appointment> {
    return prisma.appointment.update({
      where: { id },
      data: input,
      include: { patient: true, room: true, employee: true },
    });
  }

  async delete(id: string): Promise<Appointment> {
    return prisma.appointment.delete({
      where: { id },
    });
  }

  async findDoctorDashboardSnapshot(employeeId: string, startAt: Date, endAt: Date): Promise<DoctorDashboardSnapshot> {
    const [appointments, visits, treatmentSessions] = await Promise.all([
      prisma.appointment.findMany({
        where: { employeeId, scheduledAt: { gte: startAt, lt: endAt } },
        select: {
          id: true,
          scheduledAt: true,
          status: true,
          patient: { select: { id: true, patientCode: true, fullName: true } },
          room: { select: { name: true } },
        },
        orderBy: { scheduledAt: 'asc' },
      }),
      prisma.visit.findMany({
        where: { employeeId, visitDate: { gte: startAt, lt: endAt } },
        select: {
          id: true,
          patientId: true,
          visitDate: true,
          status: true,
          patient: { select: { id: true, patientCode: true, fullName: true } },
            room: { select: { id: true, name: true, department: { select: { name: true } } } },
          medicalRecord: { select: { id: true } },
        },
        orderBy: { visitDate: 'asc' },
      }),
      prisma.treatmentSession.findMany({
        where: {
          scheduledAt: { gte: startAt, lt: endAt },
          visit: { employeeId },
        },
        select: { id: true, scheduledAt: true, status: true },
        orderBy: { scheduledAt: 'asc' },
      }),
    ]);

      return {
        appointments,
        visits: visits.map((visit) => ({
          ...visit,
          room: visit.room ? { id: visit.room.id, name: visit.room.name, departmentName: visit.room.department.name } : null,
        })),
        treatmentSessions,
      };
  }
}
