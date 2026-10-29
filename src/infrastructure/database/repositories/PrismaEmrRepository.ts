import type { IEmrRepository } from '@/server/repositories/IEmrRepository';
import { prisma } from '@/infrastructure/database/prisma';

export class PrismaEmrRepository implements IEmrRepository {
  async findById(id: string) {
    return prisma.patient.findUnique({
      where: { id },
      include: {
        allergies: true,
        histories: true
      }
    });
  }

  async findMany(search?: string) {
    const whereClause: any = {};
    if (search && search.trim()) {
      const q = search.trim();
      whereClause.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { patientCode: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } }
      ];
    }

    const patients = await prisma.patient.findMany({
      where: whereClause,
      include: {
        allergies: true,
        histories: true,
        treatmentPlans: {
          select: { id: true, name: true, status: true }
        },
        visits: {
          select: {
            id: true,
            visitDate: true,
            status: true,
            employee: { select: { fullName: true } }
          },
          orderBy: { visitDate: 'desc' },
          take: 1
        },
        _count: {
          select: {
            visits: true,
            treatmentPlans: true,
            allergies: true
          }
        }
      },
      orderBy: { fullName: 'asc' },
      take: 100
    });

    return patients;
  }

  async create(input: { fullName: string; phone?: string; dateOfBirth?: Date | string; patientCode?: string }) {
    let patientCode = input.patientCode;
    if (!patientCode) {
      const count = await prisma.patient.count();
      patientCode = `BN-${String(count + 1).padStart(5, '0')}`;
    }

    return prisma.patient.create({
      data: {
        patientCode,
        fullName: input.fullName,
        phone: input.phone || null,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null
      }
    });
  }

  async update(id: string, input: { fullName?: string; phone?: string; dateOfBirth?: Date | string }) {
    return prisma.patient.update({
      where: { id },
      data: {
        ...(input.fullName ? { fullName: input.fullName } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.dateOfBirth ? { dateOfBirth: new Date(input.dateOfBirth) } : {})
      }
    });
  }

  async getPatientFullEMR(patientId: string) {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        allergies: {
          orderBy: { diagnosisDate: 'desc' }
        },
        histories: {
          orderBy: { diagnosisDate: 'desc' }
        },
        treatmentPlans: {
          include: {
            stages: {
              include: {
                steps: true
              },
              orderBy: { orderNo: 'asc' }
            }
          },
          orderBy: { version: 'desc' }
        },
        visits: {
          include: {
            employee: true,
            room: true,
            medicalRecord: true,
            orders: {
              include: {
                service: true,
                orderedBy: true,
                labResults: true,
                imagingResults: true
              },
              orderBy: { orderedAt: 'desc' }
            },
            prescriptions: {
              include: {
                employee: true,
                items: {
                  include: {
                    medicine: true
                  }
                }
              }
            },
            invoices: {
              include: {
                payments: true
              }
            },
            treatmentImages: {
              orderBy: { createdAt: 'desc' }
            },
            consents: {
              orderBy: { signedAt: 'desc' }
            }
          },
          orderBy: { visitDate: 'desc' }
        }
      }
    });

    return patient;
  }

  async saveMedicalRecord(visitId: string, input: { preliminaryDiagnosis?: string; finalDiagnosis?: string; notes?: string }) {
    const existing = await prisma.medicalRecord.findUnique({
      where: { visitId }
    });

    if (existing) {
      return prisma.medicalRecord.update({
        where: { visitId },
        data: {
          preliminaryDiagnosis: input.preliminaryDiagnosis ?? existing.preliminaryDiagnosis,
          finalDiagnosis: input.finalDiagnosis ?? existing.finalDiagnosis,
          notes: input.notes ?? existing.notes
        }
      });
    }

    return prisma.medicalRecord.create({
      data: {
        visitId,
        preliminaryDiagnosis: input.preliminaryDiagnosis || '',
        finalDiagnosis: input.finalDiagnosis || '',
        notes: input.notes || ''
      }
    });
  }

  async addPatientAllergy(patientId: string, input: { substance: string; severity?: string; reaction?: string }) {
    return prisma.allergy.create({
      data: {
        patientId,
        substance: input.substance,
        severity: input.severity || 'Vừa',
        reaction: input.reaction || null,
        diagnosisDate: new Date()
      }
    });
  }

  async addPatientHistory(patientId: string, input: { type: string; content: string }) {
    return prisma.medicalHistory.create({
      data: {
        patientId,
        type: input.type,
        content: input.content,
        diagnosisDate: new Date()
      }
    });
  }

  async createQuickVisit(patientId: string, input: { preliminaryDiagnosis?: string; finalDiagnosis?: string; notes?: string; employeeId?: string; roomId?: string }) {
    let employeeId = input.employeeId;
    if (!employeeId) {
      const defaultDoctor = await prisma.employee.findFirst();
      employeeId = defaultDoctor?.id;
    }

    return prisma.$transaction(async (tx) => {
      const visit = await tx.visit.create({
        data: {
          patientId,
          employeeId: employeeId || null,
          roomId: input.roomId || null,
          status: 'Đang khám',
          visitDate: new Date()
        }
      });

      if (input.preliminaryDiagnosis || input.finalDiagnosis || input.notes) {
        await tx.medicalRecord.create({
          data: {
            visitId: visit.id,
            preliminaryDiagnosis: input.preliminaryDiagnosis || '',
            finalDiagnosis: input.finalDiagnosis || '',
            notes: input.notes || ''
          }
        });
      }

      return visit;
    });
  }
}
