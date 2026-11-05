import type { Appointment, Prisma } from '@prisma/client';

export interface IAppointmentsService {
  getById(id: string): Promise<Appointment | null>;
  getList(): Promise<Appointment[]>;
  create(input: Prisma.AppointmentUncheckedCreateInput): Promise<Appointment>;
  update(id: string, input: Prisma.AppointmentUpdateInput): Promise<Appointment>;
  delete(id: string): Promise<Appointment>;
}
