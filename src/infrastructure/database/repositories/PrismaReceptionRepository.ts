import { prisma } from '@/infrastructure/database/prisma';
import type {
  IReceptionRepository,
  PatientListFilter,
  PatientCreateInput,
  PatientUpdateInput,
  DuplicateCheckQuery,
} from '@/server/repositories/IReceptionRepository';

export class PrismaReceptionRepository implements IReceptionRepository {
  async findById(id: string) {
    return prisma.patient.findUnique({
      where: { id },
      include: {
        allergies: true,
        histories: true,
        visits: {
          orderBy: { visitDate: 'desc' },
        },
      },
    });
  }

  async findByPatientCode(patientCode: string) {
    return prisma.patient.findUnique({
      where: { patientCode },
      include: {
        allergies: true,
        histories: true,
      },
    });
  }

  async findMany(params?: PatientListFilter) {
    const page = params?.page && params.page > 0 ? params.page : 1;
    const limit = params?.limit && params.limit > 0 ? params.limit : 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params?.search && params.search.trim()) {
      const term = params.search.trim();
      where.OR = [
        { patientCode: { contains: term, mode: 'insensitive' } },
        { fullName: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fullName: 'asc' },
        include: {
          allergies: true,
          histories: true,
          visits: {
            take: 1,
            orderBy: { visitDate: 'desc' },
          },
          _count: {
            select: { visits: true },
          },
        },
      }),
      prisma.patient.count({ where }),
    ]);

    return { items, total };
  }

  async create(input: PatientCreateInput) {
    return prisma.patient.create({
      data: {
        patientCode: input.patientCode,
        fullName: input.fullName,
        dateOfBirth: input.dateOfBirth,
        phone: input.phone,
        allergies: input.allergies && input.allergies.length > 0
          ? {
              create: input.allergies.map((a) => ({
                substance: a.substance,
                reaction: a.reaction ?? null,
                severity: a.severity ?? null,
              })),
            }
          : undefined,
        histories: input.histories && input.histories.length > 0
          ? {
              create: input.histories.map((h) => ({
                type: h.type,
                content: h.content,
              })),
            }
          : undefined,
      },
      include: {
        allergies: true,
        histories: true,
      },
    });
  }

  async update(id: string, input: PatientUpdateInput) {
    return prisma.$transaction(async (tx) => {
      // 1. Update basic scalar fields
      const data: any = {};
      if (input.fullName !== undefined) data.fullName = input.fullName;
      if (input.dateOfBirth !== undefined) data.dateOfBirth = input.dateOfBirth;
      if (input.phone !== undefined) data.phone = input.phone;

      await tx.patient.update({
        where: { id },
        data,
      });

      // 2. If allergies provided, replace
      if (input.allergies !== undefined) {
        await tx.allergy.deleteMany({ where: { patientId: id } });
        if (input.allergies.length > 0) {
          await tx.allergy.createMany({
            data: input.allergies.map((a) => ({
              patientId: id,
              substance: a.substance,
              reaction: a.reaction ?? null,
              severity: a.severity ?? null,
            })),
          });
        }
      }

      // 3. If histories provided, replace
      if (input.histories !== undefined) {
        await tx.medicalHistory.deleteMany({ where: { patientId: id } });
        if (input.histories.length > 0) {
          await tx.medicalHistory.createMany({
            data: input.histories.map((h) => ({
              patientId: id,
              type: h.type,
              content: h.content,
            })),
          });
        }
      }

      return tx.patient.findUnique({
        where: { id },
        include: {
          allergies: true,
          histories: true,
          visits: {
            orderBy: { visitDate: 'desc' },
          },
        },
      });
    }, {
      maxWait: 10000,
      timeout: 15000,
    });
  }

  async findDuplicates(query: DuplicateCheckQuery) {
    const orConditions: any[] = [];

    if (query.phone && query.phone.trim()) {
      orConditions.push({ phone: query.phone.trim() });
    }

    if (query.fullName && query.fullName.trim() && query.dateOfBirth) {
      orConditions.push({
        fullName: { equals: query.fullName.trim(), mode: 'insensitive' },
        dateOfBirth: query.dateOfBirth,
      });
    }

    if (orConditions.length === 0) {
      return [];
    }

    return prisma.patient.findMany({
      where: {
        OR: orConditions,
      },
      select: {
        id: true,
        patientCode: true,
        fullName: true,
        phone: true,
        dateOfBirth: true,
      },
      take: 5,
    });
  }

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalPatients, todayVisits, allergiesGroup] = await Promise.all([
      prisma.patient.count(),
      prisma.visit.count({
        where: {
          visitDate: { gte: today },
        },
      }),
      prisma.allergy.findMany({
        select: { patientId: true },
        distinct: ['patientId'],
      }),
    ]);

    return {
      totalPatients,
      todayPatients: todayVisits,
      patientsWithAllergy: allergiesGroup.length,
    };
  }

  async countPatients(): Promise<number> {
    return prisma.patient.count();
  }

  async createAudit(data: { action: string; entity: string; entityId: string; accountId?: string }) {
    try {
      await prisma.auditLog.create({
        data: {
          action: data.action,
          entity: data.entity,
          entityId: data.entityId,
          accountId: data.accountId ?? null,
        },
      });
    } catch {
      // Audit log failures should not fail the main business flow
    }
  }

  async getAppointmentsByDate(dateStr: string) {
    const targetDate = new Date(dateStr);
    const start = new Date(targetDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(targetDate);
    end.setHours(23, 59, 59, 999);

    return prisma.appointment.findMany({
      where: { scheduledAt: { gte: start, lte: end } },
      include: { patient: true, employee: true, room: true },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async createVisit(patientId: string, employeeId?: string, roomId?: string) {
    return prisma.visit.create({
      data: {
        patientId,
        employeeId: employeeId ?? null,
        roomId: roomId ?? null,
        visitDate: new Date(),
        status: 'WAITING',
      },
    });
  }

  async getAllergiesByPatientId(patientId: string) {
    return prisma.allergy.findMany({ where: { patientId }, orderBy: { substance: 'asc' } });
  }

  async createAllergy(patientId: string, input: any) {
    return prisma.allergy.create({ data: { ...input, patientId } });
  }

  async updateAllergy(id: string, input: any) {
    return prisma.allergy.update({ where: { id }, data: input });
  }

  async deleteAllergy(id: string) {
    await prisma.allergy.delete({ where: { id } });
    return true;
  }

  async getMedicalHistoriesByPatientId(patientId: string) {
    return prisma.medicalHistory.findMany({ where: { patientId }, orderBy: { diagnosisDate: 'desc' } });
  }

  async createMedicalHistory(patientId: string, input: any) {
    return prisma.medicalHistory.create({ data: { ...input, patientId } });
  }

  async updateMedicalHistory(id: string, input: any) {
    return prisma.medicalHistory.update({ where: { id }, data: input });
  }

  async deleteMedicalHistory(id: string) {
    await prisma.medicalHistory.delete({ where: { id } });
    return true;
  }
}
