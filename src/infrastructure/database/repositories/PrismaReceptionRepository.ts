import type { IReceptionRepository } from '@/server/repositories/IReceptionRepository';
import { prisma } from '@/infrastructure/database/prisma';
import type { Prisma } from '@prisma/client';

export class PrismaReceptionRepository implements IReceptionRepository {
  async findById(_id: string) { return null; }
  async findMany() { return []; }
  
  async getAppointmentsByDate(dateStr: string) {
    const targetDate = new Date(dateStr);
    
    // Get target date's start and end
    const start = new Date(targetDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(targetDate);
    end.setHours(23, 59, 59, 999);
    
    return prisma.appointment.findMany({
      where: {
        scheduledAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        patient: true,
        room: true,
        employee: true,
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async createVisit(patientId: string, employeeId?: string, roomId?: string) {
    return prisma.visit.create({
      data: {
        patientId,
        employeeId: employeeId || undefined,
        roomId: roomId || undefined,
        status: 'IN_PROGRESS',
        visitDate: new Date(),
      }
    });
  }

  async create(_input: unknown) { throw new Error('Not implemented'); }
  async update(_id: string, _input: unknown) { throw new Error('Not implemented'); }

  // Allergies
  async getAllergiesByPatientId(patientId: string) {
    return prisma.allergy.findMany({
      where: { patientId },
      orderBy: { id: 'desc' },
    });
  }

  async createAllergy(patientId: string, input: Prisma.AllergyUncheckedCreateWithoutPatientInput) {
    return prisma.allergy.create({
      data: {
        ...input,
        patientId,
      },
    });
  }

  async updateAllergy(id: string, input: Prisma.AllergyUpdateInput) {
    return prisma.allergy.update({
      where: { id },
      data: input,
    });
  }

  async deleteAllergy(id: string) {
    await prisma.allergy.delete({
      where: { id },
    });
    return true;
  }

  // Medical History
  async getMedicalHistoriesByPatientId(patientId: string) {
    return prisma.medicalHistory.findMany({
      where: { patientId },
      orderBy: { id: 'desc' },
    });
  }

  async createMedicalHistory(patientId: string, input: Prisma.MedicalHistoryUncheckedCreateWithoutPatientInput) {
    return prisma.medicalHistory.create({
      data: {
        ...input,
        patientId,
      },
    });
  }

  async updateMedicalHistory(id: string, input: Prisma.MedicalHistoryUpdateInput) {
    return prisma.medicalHistory.update({
      where: { id },
      data: input,
    });
  }

  async deleteMedicalHistory(id: string) {
    await prisma.medicalHistory.delete({
      where: { id },
    });
    return true;
  }
}

