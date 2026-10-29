import type { Appointment, Prisma } from '@prisma/client';

export interface IAppointmentsRepository {
  findById(id: string): Promise<Appointment | null>;
  findMany(): Promise<Appointment[]>;
  findConflicts(scheduledAt: Date, windowMinutes?: number): Promise<Appointment[]>;
  create(input: Prisma.AppointmentUncheckedCreateInput): Promise<Appointment>;
  update(id: string, input: Prisma.AppointmentUpdateInput): Promise<Appointment>;
  delete(id: string): Promise<Appointment>;
}
