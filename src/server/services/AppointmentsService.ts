import type { IAppointmentsRepository } from '@/server/repositories/IAppointmentsRepository';
import type { IAppointmentsService } from './IAppointmentsService';
import type { Prisma } from '@prisma/client';
import { AppointmentsValidator } from '../validators/AppointmentsValidator';

export class AppointmentsService implements IAppointmentsService {
  constructor(private readonly repository: IAppointmentsRepository) {}

  getById(id: string) {
    return this.repository.findById(id);
  }

  getList() {
    return this.repository.findMany();
  }

  async create(input: Prisma.AppointmentUncheckedCreateInput) {
    const scheduledAt = new Date(input.scheduledAt);
    if (isNaN(scheduledAt.getTime())) {
      throw new Error('Thời gian hẹn không hợp lệ.');
    }

    if (input.status !== 'CANCELLED') {
      const conflicts = await this.repository.findConflicts(
        scheduledAt,
        AppointmentsValidator.MIN_GAP_MINUTES
      );
      const conflictError = AppointmentsValidator.checkConflict(
        {
          scheduledAt,
          patientId: input.patientId,
          employeeId: input.employeeId || null,
          roomId: input.roomId || null,
        },
        conflicts
      );

      if (conflictError) {
        throw new Error(conflictError);
      }
    }

    return this.repository.create(input);
  }

  async update(id: string, input: Prisma.AppointmentUpdateInput) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error(`Không tìm thấy lịch hẹn với mã: ${id}`);
    }

    const scheduledAt = input.scheduledAt
      ? new Date(input.scheduledAt as any)
      : existing.scheduledAt;

    if (isNaN(scheduledAt.getTime())) {
      throw new Error('Thời gian hẹn không hợp lệ.');
    }

    const patientId = (
      input.patient?.connect?.id ||
      (input.patient as any)?.id ||
      existing.patientId
    ) as string;

    const employeeId =
      input.employee !== undefined
        ? (input.employee?.connect?.id || null)
        : existing.employeeId;

    const roomId =
      input.room !== undefined
        ? (input.room?.connect?.id || null)
        : existing.roomId;

    const status = (input.status as string) || existing.status;

    if (status !== 'CANCELLED') {
      const conflicts = await this.repository.findConflicts(
        scheduledAt,
        AppointmentsValidator.MIN_GAP_MINUTES
      );
      const conflictError = AppointmentsValidator.checkConflict(
        {
          id,
          scheduledAt,
          patientId,
          employeeId,
          roomId,
        },
        conflicts,
        id
      );

      if (conflictError) {
        throw new Error(conflictError);
      }
    }

    return this.repository.update(id, input);
  }

  delete(id: string) {
    return this.repository.delete(id);
  }

  getLatestDoctorActivityDate(employeeId: string) {
    if (!employeeId) throw new Error('Employee is required.');
    return this.repository.findLatestDoctorActivityDate(employeeId);
  }

  async getDoctorDashboardSnapshot(employeeId: string, startAt: Date, endAt: Date) {
    if (!employeeId || !Number.isFinite(startAt.getTime()) || !Number.isFinite(endAt.getTime()) || startAt >= endAt) {
      throw new Error('Phạm vi lịch bác sĩ không hợp lệ.');
    }
    return this.repository.findDoctorDashboardSnapshot(employeeId, startAt, endAt);
  }
}
