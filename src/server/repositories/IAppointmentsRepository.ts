import type { Appointment, Prisma } from '@prisma/client';

export interface DoctorDashboardSnapshot {
  appointments: Array<{
    id: string;
    scheduledAt: Date;
    status: string;
    patient: { id: string; patientCode: string; fullName: string };
    room: { name: string } | null;
  }>;
  visits: Array<{
    id: string;
    patientId: string;
    visitDate: Date;
    status: string;
    patient: { id: string; patientCode: string; fullName: string };
    room: { id: string; name: string; departmentName: string } | null;
    medicalRecord: { id: string } | null;
  }>;
  treatmentSessions: Array<{
    id: string;
    scheduledAt: Date | null;
    status: string;
  }>;
}

export interface IAppointmentsRepository {
  findById(id: string): Promise<Appointment | null>;
  findMany(): Promise<Appointment[]>;
  findConflicts(scheduledAt: Date, windowMinutes?: number): Promise<Appointment[]>;
  create(input: Prisma.AppointmentUncheckedCreateInput): Promise<Appointment>;
  update(id: string, input: Prisma.AppointmentUpdateInput): Promise<Appointment>;
  delete(id: string): Promise<Appointment>;
  findDoctorDashboardSnapshot(employeeId: string, startAt: Date, endAt: Date): Promise<DoctorDashboardSnapshot>;
}
