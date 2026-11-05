import type { Appointment, Prisma } from '@prisma/client';
import type { DoctorDashboardSnapshot } from '@/server/repositories/IAppointmentsRepository';

export interface IAppointmentsService {
  getById(id: string): Promise<Appointment | null>;
  getList(): Promise<Appointment[]>;
  create(input: Prisma.AppointmentUncheckedCreateInput): Promise<Appointment>;
  update(id: string, input: Prisma.AppointmentUpdateInput): Promise<Appointment>;
  delete(id: string): Promise<Appointment>;
  getDoctorDashboardSnapshot(employeeId: string, startAt: Date, endAt: Date): Promise<DoctorDashboardSnapshot>;
}
