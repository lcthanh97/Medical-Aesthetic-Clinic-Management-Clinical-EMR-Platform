import type {
  EmrActorScope,
  IEmrRepository,
  MedicalRecordSnapshot,
  TreatmentImageFilters,
  TreatmentImageTimelineItem,
} from '@/server/repositories/IEmrRepository';
import { prisma } from '@/infrastructure/database/prisma';

const ACTIVE_VISIT_STATUSES = ['REGISTERED', 'PAID', 'WAITING', 'EXAMINING', 'IN_PROGRESS', 'WAITING_CLS', 'RESULT_READY', 'WAITING_RESULT', 'PRESCRIBED'];

export class PrismaEmrRepository implements IEmrRepository {
  private async findAuthorizedTreatmentImages(
    patientId: string,
    actor: EmrActorScope,
    filters: TreatmentImageFilters = {},
    imageIds?: string[],
  ): Promise<TreatmentImageTimelineItem[]> {
    const now = new Date();
    const session = await prisma.refreshToken.findFirst({
      where: {
        id: actor.sessionId,
        accountId: actor.accountId,
        revokedAt: null,
        expiresAt: { gt: now },
        createdAt: { gt: new Date(now.getTime() - 8 * 60 * 60 * 1000) },
        account: {
          is: {
            status: 'ACTIVE',
            employee: { is: { id: actor.employeeId } },
            roles: {
              some: {
                role: {
                  is: { permissions: { some: { permission: { is: { code: 'IMAGE_READ' } } } } },
                },
              },
            },
          },
        },
      },
      select: { id: true },
    });
    if (!session) return [];

    const where: any = {
      visit: {
        is: {
          patientId,
          employeeId: actor.employeeId,
          employee: { is: { accountId: actor.accountId } },
        },
      },
    };
    if (imageIds) where.id = { in: imageIds };
    if (filters.visitId) where.visitId = filters.visitId;
    if (filters.planId) where.planId = filters.planId;
    if (filters.sessionId) where.sessionId = filters.sessionId;
    if (filters.phase) where.phase = filters.phase;
    if (filters.imageType) where.imageType = filters.imageType;
    if (filters.bodyArea) where.bodyArea = filters.bodyArea;
    if (filters.from || filters.to) {
      where.capturedAt = {
        ...(filters.from ? { gte: new Date(filters.from) } : {}),
        ...(filters.to ? { lte: new Date(filters.to) } : {}),
      };
    }

    const images = await prisma.treatmentImage.findMany({
      where,
      select: {
        id: true,
        planId: true,
        sessionId: true,
        visitId: true,
        imageType: true,
        phase: true,
        bodyArea: true,
        description: true,
        capturedAt: true,
        createdAt: true,
        plan: { select: { id: true, name: true, visitId: true, patientId: true } },
        visit: { select: { patientId: true } },
        session: {
          select: {
            id: true,
            sessionNo: true,
            treatmentArea: true,
            visitId: true,
            stage: { select: { planId: true } },
          },
        },
      },
      orderBy: [{ capturedAt: 'desc' }, { id: 'desc' }],
      take: 500,
    });

    return images
      .filter((image) =>
        image.plan.visitId === image.visitId &&
        image.plan.patientId === image.visit.patientId &&
        (!image.session || (
          image.session.visitId === image.visitId &&
          image.session.stage.planId === image.planId
        )),
      )
      .map(({ plan, session: treatmentSession, visit: _visit, ...image }) => ({
        ...image,
        plan: { id: plan.id, name: plan.name },
        session: treatmentSession
          ? { id: treatmentSession.id, sessionNo: treatmentSession.sessionNo, treatmentArea: treatmentSession.treatmentArea }
          : null,
      }));
  }

  getTreatmentImageTimelineForEmployee(patientId: string, actor: EmrActorScope, filters: TreatmentImageFilters = {}) {
    return this.findAuthorizedTreatmentImages(patientId, actor, filters);
  }

  async getTreatmentImageDetailsForEmployee(patientId: string, imageId: string, actor: EmrActorScope) {
    const [image] = await this.findAuthorizedTreatmentImages(patientId, actor, {}, [imageId]);
    return image ?? null;
  }

  async getTreatmentImagesForComparison(patientId: string, imageIds: [string, string], actor: EmrActorScope) {
    const images = await this.findAuthorizedTreatmentImages(patientId, actor, {}, imageIds);
    if (images.length !== 2) return null;
    const byId = new Map(images.map((image) => [image.id, image]));
    const first = byId.get(imageIds[0]);
    const second = byId.get(imageIds[1]);
    return first && second ? [first, second] as [TreatmentImageTimelineItem, TreatmentImageTimelineItem] : null;
  }

  async findByIdForEmployee(id: string, employeeId: string) {
    return prisma.patient.findFirst({
      where: { id, visits: { some: { employeeId } } },
      select: { id: true, fullName: true, patientCode: true },
    });
  }

  async findManyForEmployee(employeeId: string, search?: string) {
    const whereClause: any = { visits: { some: { employeeId } } };
    if (search && search.trim()) {
      const q = search.trim();
      whereClause.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { patientCode: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }

    return prisma.patient.findMany({
      where: whereClause,
      select: {
        id: true,
        fullName: true,
        patientCode: true,
        dateOfBirth: true,
        phone: true,
        visits: {
          where: { employeeId },
          select: {
            id: true,
            visitDate: true,
            status: true
          },
          orderBy: { visitDate: 'desc' }
        },
      },
      orderBy: { fullName: 'asc' },
      take: 100,
    });
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

  async getPatientFullEMRForEmployee(
    patientId: string,
    employeeId: string,
    scope: { prescriptions: boolean; treatmentPlans: boolean; clinicalOrders: boolean } = {
      prescriptions: false,
      treatmentPlans: false,
      clinicalOrders: false,
    },
  ) {
    const assignedVisits = await prisma.visit.findMany({
      where: { patientId, employeeId },
      select: { id: true, status: true },
    });
    if (!assignedVisits.length) return null;
    const assignedVisitIds = assignedVisits.map(({ id }) => id);
    const hasActiveTreatmentRelationship = assignedVisits.some(({ status }) => ACTIVE_VISIT_STATUSES.includes(status));

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, visits: { some: { employeeId } } },
      select: {
        id: true,
        fullName: true,
        patientCode: true,
        dateOfBirth: true,
        phone: true,
        visits: {
          ...(hasActiveTreatmentRelationship ? {} : { where: { employeeId } }),
          select: {
            id: true,
            employeeId: true,
            visitDate: true,
            status: true,
            employee: { select: { fullName: true } },
            room: { select: { name: true, department: { select: { name: true } } } },
            medicalRecord: {
              select: {
                id: true,
                visitId: true,
                preliminaryDiagnosis: true,
                finalDiagnosis: true,
                notes: true,
              },
            },
            ...(scope.clinicalOrders ? {
              orders: {
                where: { visitId: { in: assignedVisitIds } },
                select: {
                  id: true,
                  type: true,
                  status: true,
                  orderedAt: true,
                  orderedBy: { select: { fullName: true } },
                  service: { select: { name: true } },
                  labResults: { select: { id: true, testName: true, result: true, unit: true } },
                  imagingResults: { select: { id: true, imagingType: true, conclusion: true } },
                },
                orderBy: { orderedAt: 'desc' as const },
              },
            } : {}),
            ...(scope.prescriptions ? {
              prescriptions: {
                where: { employeeId, visitId: { in: assignedVisitIds } },
                select: {
                  id: true,
                  employeeId: true,
                  status: true,
                  items: {
                    select: {
                      id: true,
                      quantity: true,
                      dosage: true,
                      medicine: { select: { name: true, unit: true } },
                    },
                  },
                },
              },
            } : {}),
            ...(scope.treatmentPlans ? {
              treatmentPlans: {
                where: { patientId, visitId: { in: assignedVisitIds } },
                select: {
                  id: true,
                  visitId: true,
                  name: true,
                  diagnosisSummary: true,
                  goal: true,
                  status: true,
                  version: true,
                  startDate: true,
                  expectedEndDate: true,
                  createdAt: true,
                  stages: {
                    orderBy: { orderNo: 'asc' as const },
                    select: {
                      id: true,
                      name: true,
                      status: true,
                      orderNo: true,
                      steps: {
                        orderBy: { orderNo: 'asc' as const },
                        select: { id: true, content: true, status: true, orderNo: true },
                      },
                    },
                  },
                },
                orderBy: { createdAt: 'desc' as const },
              },
            } : {}),
          },
          orderBy: { visitDate: 'desc' },
        },
      },
    });
    if (!patient) return null;
    return {
      ...patient,
      hasActiveTreatmentRelationship,
      treatmentPlans: scope.treatmentPlans
        ? patient.visits.flatMap((visit) => visit.treatmentPlans ?? [])
        : [],
    };
  }

  async getAssignedVisitForEmployee(
    visitId: string,
    actor: { accountId: string; employeeId: string; sessionId: string },
    scope: { prescriptions: boolean; treatmentPlans: boolean; clinicalOrders: boolean } = {
      prescriptions: false,
      treatmentPlans: false,
      clinicalOrders: false,
    },
    allowedRoleNames: string[] = [],
  ) {
    if (!allowedRoleNames.length) return null;
    const now = new Date();
    const requiredReadPermissions = [
      'EMR_READ',
      ...(scope.clinicalOrders ? ['IMAGE_READ'] : []),
      ...(scope.prescriptions ? ['PRESCRIPTION_READ'] : []),
    ];
    return prisma.$transaction(async (tx) => {
      const session = await tx.refreshToken.findFirst({
        where: {
          id: actor.sessionId,
          accountId: actor.accountId,
          revokedAt: null,
          expiresAt: { gt: now },
          createdAt: { gt: new Date(now.getTime() - 8 * 60 * 60 * 1000) },
          account: {
            is: {
              status: 'ACTIVE',
              employee: { is: { id: actor.employeeId } },
              roles: {
                some: {
                  role: {
                    is: {
                      name: { in: allowedRoleNames },
                      AND: requiredReadPermissions.map((code) => ({
                        permissions: { some: { permission: { is: { code } } } },
                      })),
                    },
                  },
                },
              },
            },
          },
        },
        select: { id: true },
      });
      if (!session) return null;

      return tx.visit.findFirst({
        where: {
          id: visitId,
          employeeId: actor.employeeId,
          employee: {
            is: {
              accountId: actor.accountId,
              account: {
                is: {
                  status: 'ACTIVE',
                  roles: { some: { role: { is: { name: { in: allowedRoleNames }, permissions: { some: { permission: { is: { code: 'EMR_READ' } } } } } } } },
                },
              },
            },
          },
        },
        select: {
          id: true,
          patientId: true,
          employeeId: true,
          visitDate: true,
          status: true,
          patient: { select: { id: true, patientCode: true, fullName: true, dateOfBirth: true, phone: true } },
          employee: { select: { fullName: true } },
          room: { select: { name: true, department: { select: { name: true } } } },
          medicalRecord: { select: { id: true, visitId: true, preliminaryDiagnosis: true, finalDiagnosis: true, notes: true } },
          ...(scope.clinicalOrders ? {
            orders: {
              select: {
                id: true,
                type: true,
                status: true,
                orderedAt: true,
                orderedBy: { select: { fullName: true } },
                service: { select: { code: true, name: true } },
                labResults: { select: { id: true, testName: true, result: true, unit: true } },
                imagingResults: { select: { id: true, imagingType: true, conclusion: true, fileUrl: true } },
              },
              orderBy: { orderedAt: 'desc' as const },
            },
          } : {}),
          ...(scope.prescriptions ? {
            prescriptions: {
              where: { employeeId: actor.employeeId },
              select: { id: true, status: true, items: { select: { id: true, dosage: true, medicine: { select: { name: true, unit: true } } } } },
            },
          } : {}),
        },
      });
    }, { isolationLevel: 'Serializable', maxWait: 10_000, timeout: 15_000 });
  }

  async saveMedicalRecord(
    visitId: string,
    actor: { accountId: string; employeeId: string; sessionId: string },
    allowedRoleNames: string[],
    input: { preliminaryDiagnosis?: string; finalDiagnosis?: string; notes?: string },
    expected: MedicalRecordSnapshot | null
  ) {
    if (!actor.accountId || !actor.employeeId || !actor.sessionId || allowedRoleNames.length === 0) {
      throw new Error('EMR access denied.');
    }
    try {
      return await prisma.$transaction(async (tx) => {
        const now = new Date();
        const activeSession = await tx.refreshToken.findFirst({
          where: {
            id: actor.sessionId,
            accountId: actor.accountId,
            revokedAt: null,
            expiresAt: { gt: now },
            createdAt: { gt: new Date(now.getTime() - 8 * 60 * 60 * 1000) },
          },
          select: { id: true },
        });
        if (!activeSession) throw new Error('EMR access denied.');

        const authorizedVisit = await tx.visit.findFirst({
          where: {
            id: visitId,
            employeeId: actor.employeeId,
            employee: {
              is: {
                accountId: actor.accountId,
                account: {
                  is: {
                    status: 'ACTIVE',
                    roles: {
                      some: {
                        role: {
                          is: {
                            name: { in: allowedRoleNames },
                            permissions: {
                              some: { permission: { is: { code: 'EMR_WRITE' } } },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          select: {
            id: true,
            status: true,
            medicalRecord: { select: { id: true } },
          },
        });
        if (!authorizedVisit) throw new Error('EMR access denied.');

        const isExamining = authorizedVisit.status === 'EXAMINING' || authorizedVisit.status === 'IN_PROGRESS';
        const isResultReady = authorizedVisit.status === 'RESULT_READY' || authorizedVisit.status === 'WAITING_RESULT';
        if (!isExamining && !isResultReady) throw new Error('EMR access denied.');

        if (isResultReady) {
          const diagnosisChanged = expected
            ? (input.preliminaryDiagnosis !== undefined && input.preliminaryDiagnosis !== (expected.preliminaryDiagnosis ?? '')) ||
              (input.finalDiagnosis !== undefined && input.finalDiagnosis !== (expected.finalDiagnosis ?? ''))
            : Boolean(input.preliminaryDiagnosis?.trim() || input.finalDiagnosis?.trim());
          if (diagnosisChanged) throw new Error('EMR access denied.');
        }

        if (expected === null) {
          const created = await tx.medicalRecord.create({
            data: {
              visitId,
              preliminaryDiagnosis: isResultReady ? '' : input.preliminaryDiagnosis ?? '',
              finalDiagnosis: isResultReady ? '' : input.finalDiagnosis ?? '',
              notes: input.notes ?? '',
            },
          });
          await tx.auditLog.create({
            data: { accountId: actor.accountId, action: 'MEDICAL_RECORD_CREATED', entity: 'MedicalRecord', entityId: created.id },
          });
          return created;
        }

        const result = await tx.medicalRecord.updateMany({
          where: { visitId, ...expected },
          data: {
            preliminaryDiagnosis: input.preliminaryDiagnosis,
            finalDiagnosis: input.finalDiagnosis,
            notes: input.notes,
          },
        });
        if (result.count !== 1) {
          throw new Error('Bệnh án đã thay đổi ở nơi khác hoặc không còn tồn tại. Hãy tải lại hồ sơ trước khi tiếp tục.');
        }

        const updated = await tx.medicalRecord.findUnique({ where: { visitId } });
        if (!updated) throw new Error('Không tìm thấy bệnh án sau khi cập nhật.');
        await tx.auditLog.create({
          data: { accountId: actor.accountId, action: 'MEDICAL_RECORD_UPDATED', entity: 'MedicalRecord', entityId: updated.id },
        });
        return updated;
      }, { isolationLevel: 'Serializable', maxWait: 10_000, timeout: 15_000 });
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        throw new Error('Bệnh án đã được tạo ở nơi khác. Hãy tải lại hồ sơ trước khi tiếp tục.');
      }
      throw error;
    }
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
    return prisma.$transaction(async (tx) => {
      const visit = await tx.visit.create({
        data: {
          patientId,
          employeeId: input.employeeId || null,
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
