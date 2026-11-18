import type { IAppointmentsRepository } from '@/server/repositories/IAppointmentsRepository';
import { prisma } from '@/infrastructure/database/prisma';
import type { Prisma, Appointment } from '@prisma/client';

export class PrismaAppointmentsRepository implements IAppointmentsRepository {
  constructor(private readonly db: Pick<Prisma.TransactionClient, 'appointment'> = prisma) {}

  async findById(id: string): Promise<Appointment | null> {
    return this.db.appointment.findUnique({
      where: { id },
      include: { patient: true, room: true, employee: true, service: true },
    });
  }

  async findMany(): Promise<Appointment[]> {
    return this.db.appointment.findMany({
      include: { patient: true, room: true, employee: true, service: true },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async findConflicts(scheduledAt: Date, windowMinutes: number = 30): Promise<Appointment[]> {
    const target = new Date(scheduledAt);
    const start = new Date(target.getTime() - windowMinutes * 60 * 1000);
    const end = new Date(target.getTime() + windowMinutes * 60 * 1000);

    return this.db.appointment.findMany({
      where: {
        scheduledAt: {
          gt: start,
          lt: end,
        },
        status: {
          not: 'CANCELLED',
        },
      },
      include: { patient: true, room: true, employee: true, service: true },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async create(input: Prisma.AppointmentUncheckedCreateInput): Promise<Appointment> {
    return this.db.appointment.create({
      data: input,
      include: { patient: true, room: true, employee: true, service: true },
    });
  }

  async update(id: string, input: Prisma.AppointmentUpdateInput): Promise<Appointment> {
    return this.db.appointment.update({
      where: { id },
      data: input,
      include: { patient: true, room: true, employee: true, service: true },
    });
  }

  async delete(id: string): Promise<Appointment> {
    return this.db.appointment.delete({
      where: { id },
    });
  }
}
