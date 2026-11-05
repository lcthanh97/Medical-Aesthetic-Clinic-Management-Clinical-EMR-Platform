import type { ITreatmentsRepository } from '@/server/repositories/ITreatmentsRepository';
import type { ProtocolTemplateFilters, TreatmentSessionFilters } from '@/features/treatments/schemas/treatments.schema';
import { prisma } from '@/infrastructure/database/prisma';
import type { Prisma, TreatmentPlan, TreatmentStep } from '@prisma/client';
import type { ProtocolTemplatePage, ProtocolTemplateRecord } from '@/server/repositories/ITreatmentsRepository';

const PROTOCOL_PAGE_SIZE = 12;

export class PrismaTreatmentsRepository implements ITreatmentsRepository {
  async getProtocolTemplates(filters: ProtocolTemplateFilters): Promise<ProtocolTemplatePage> {
    const query = filters.q.trim();
    const where: Prisma.TreatmentProtocolTemplateWhereInput = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.stageType ? { stages: { some: { stageType: filters.stageType } } } : {}),
      ...(query ? {
        OR: [
          { code: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { indication: { contains: query, mode: 'insensitive' } },
          { contraindication: { contains: query, mode: 'insensitive' } },
          { stages: { some: { stageType: { contains: query, mode: 'insensitive' } } } },
          { stages: { some: { name: { contains: query, mode: 'insensitive' } } } },
          { stages: { some: { goal: { contains: query, mode: 'insensitive' } } } },
          { stages: { some: { steps: { some: { instruction: { contains: query, mode: 'insensitive' } } } } } },
          {
            stages: {
              some: {
                steps: {
                  some: { procedure: { is: { name: { contains: query, mode: 'insensitive' } } } },
                },
              },
            },
          },
        ],
      } : {}),
    };

    const [rows, total, statusRows, stageTypeRows] = await Promise.all([
      prisma.treatmentProtocolTemplate.findMany({
        where,
        select: {
          id: true, code: true, name: true, description: true, indication: true,
          contraindication: true, version: true, status: true, createdAt: true, updatedAt: true,
          createdBy: { select: { fullName: true } },
          stages: {
            orderBy: [{ orderNo: 'asc' }, { id: 'asc' }],
            select: {
              id: true, stageType: true, name: true, orderNo: true, goal: true, durationDays: true, notes: true,
              steps: {
                orderBy: [{ orderNo: 'asc' }, { id: 'asc' }],
                select: {
                  id: true, orderNo: true, instruction: true, repeatCount: true,
                  intervalDays: true, plannedDurationMinutes: true,
                  procedure: { select: { code: true, name: true, category: true } },
                },
              },
            },
          },
        },
        orderBy: [{ updatedAt: 'desc' }, { code: 'asc' }, { version: 'desc' }],
        skip: (filters.page - 1) * PROTOCOL_PAGE_SIZE,
        take: PROTOCOL_PAGE_SIZE,
      }),
      prisma.treatmentProtocolTemplate.count({ where }),
      prisma.treatmentProtocolTemplate.findMany({
        select: { status: true }, distinct: ['status'], orderBy: { status: 'asc' }, take: 100,
      }),
      prisma.protocolStageTemplate.findMany({
        select: { stageType: true }, distinct: ['stageType'], orderBy: { stageType: 'asc' }, take: 100,
      }),
    ]);

    return {
      items: rows as ProtocolTemplateRecord[],
      total,
      page: filters.page,
      pageSize: PROTOCOL_PAGE_SIZE,
      statuses: statusRows.map(({ status }) => status),
      stageTypes: stageTypeRows.map(({ stageType }) => stageType),
    };
  }

  getAssignedVisitsForEmployee(employeeId: string) {
    return prisma.visit.findMany({
      where: { employeeId },
      select: {
        id: true,
        visitDate: true,
        status: true,
        patient: { select: { id: true, patientCode: true, fullName: true } },
      },
      orderBy: [{ visitDate: 'desc' }, { id: 'desc' }],
      take: 100,
    });
  }

  async getTreatmentSessions(employeeId: string, filters: TreatmentSessionFilters) {
    const sessions = await prisma.treatmentSession.findMany({
      where: {
        visit: { is: { employeeId } },
        ...(filters.visitId ? { visitId: filters.visitId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.scheduledDate ? {
          scheduledAt: {
            gte: new Date(`${filters.scheduledDate}T00:00:00.000Z`),
            lt: new Date(new Date(`${filters.scheduledDate}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000),
          },
        } : {}),
        ...(filters.q ? {
          OR: [
            {
              visit: { is: { patient: { is: { fullName: { contains: filters.q, mode: 'insensitive' } } } } },
            },
            {
              visit: { is: { patient: { is: { patientCode: { contains: filters.q, mode: 'insensitive' } } } } },
            },
            { stage: { is: { name: { contains: filters.q, mode: 'insensitive' } } } },
            { stage: { is: { plan: { is: { name: { contains: filters.q, mode: 'insensitive' } } } } } },
            { step: { is: { content: { contains: filters.q, mode: 'insensitive' } } } },
          ],
        } : {}),
      },
      include: {
        visit: { select: { id: true, visitDate: true, status: true, employeeId: true, patient: { select: { id: true, patientCode: true, fullName: true } } } },
        stage: { include: { plan: { select: { id: true, name: true, status: true, patientId: true, visitId: true } } } },
        step: { select: { id: true, stageId: true, orderNo: true, content: true, status: true } },
        performedBy: { select: { id: true, fullName: true } },
      },
      orderBy: [{ scheduledAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });

    return sessions.filter((session) =>
      session.visit.employeeId === employeeId &&
      session.stage.plan.visitId === session.visitId &&
      session.stage.plan.patientId === session.visit.patient.id &&
      (!session.step || (session.step.id === session.stepId && session.step.stageId === session.stageId)),
    );
  }

  async getSessionInventoryDetails(sessionIds: string[], employeeId: string) {
    if (!sessionIds.length) return [];
    const [consumptions, equipmentUsages] = await Promise.all([
      prisma.treatmentConsumption.findMany({
        where: { sessionId: { in: sessionIds }, session: { is: { visit: { is: { employeeId } } } } },
        select: {
          id: true, sessionId: true, actualQuantity: true, unit: true,
          medicine: { select: { name: true } }, supply: { select: { name: true } },
          session: { select: { visitId: true, stage: { select: { plan: { select: { visitId: true, patientId: true } } } }, visit: { select: { patientId: true } } } },
        },
      }),
      prisma.equipmentUsage.findMany({
        where: { treatmentSessionId: { in: sessionIds }, visit: { is: { employeeId } } },
        select: {
          id: true, treatmentSessionId: true, startedAt: true, endedAt: true, parameters: true,
          equipment: { select: { name: true } }, operator: { select: { fullName: true } },
          visit: { select: { id: true, patientId: true } },
          session: { select: { id: true, visitId: true, visit: { select: { id: true, patientId: true } }, stage: { select: { plan: { select: { visitId: true, patientId: true } } } } } },
        },
      }),
    ]);
    const safeConsumptions = consumptions.filter((row) => row.session.visitId === row.session.stage.plan.visitId && row.session.visit.patientId === row.session.stage.plan.patientId);
    const sessionIdsWithEquipment = new Set(sessionIds);
    const equipmentBySession = new Map<string, typeof equipmentUsages>();
    for (const row of equipmentUsages) {
      const sessionId = row.treatmentSessionId;
      if (!sessionId || !sessionIdsWithEquipment.has(sessionId) || !row.session ||
          row.session.id !== sessionId || row.visit.id !== row.session.visit.id ||
          row.session.visitId !== row.session.visit.id ||
          row.session.stage.plan.visitId !== row.session.visit.id ||
          row.session.stage.plan.patientId !== row.session.visit.patientId ||
          row.visit.patientId !== row.session.visit.patientId) continue;
      const current = equipmentBySession.get(sessionId) ?? [];
      current.push(row);
      equipmentBySession.set(sessionId, current);
    }
    const consumptionBySession = new Map<string, typeof safeConsumptions>();
    for (const row of safeConsumptions) {
      const current = consumptionBySession.get(row.sessionId) ?? [];
      current.push(row);
      consumptionBySession.set(row.sessionId, current);
    }
    return sessionIds.map((sessionId) => ({
      sessionId,
      consumptions: (consumptionBySession.get(sessionId) ?? []).map(({ id, actualQuantity, unit, medicine, supply }) => ({ id, actualQuantity, unit, medicine, supply })),
      equipmentUsages: (equipmentBySession.get(sessionId) ?? []).map(({ id, startedAt, endedAt, parameters, equipment, operator }) => ({ id, startedAt, endedAt, parameters, equipment, operator })),
    }));
  }

  // Treatment Plan
  async getPlansByVisitId(visitId: string, employeeId: string) {
    const plans = await prisma.treatmentPlan.findMany({
      where: { visitId, visit: { is: { employeeId } } },
      include: {
        visit: { select: { id: true, visitDate: true, status: true, patient: { select: { id: true, patientCode: true, fullName: true } } } },
        createdBy: { select: { fullName: true } },
        stages: {
          include: {
            steps: {
              orderBy: { orderNo: 'asc' }
            },
            sessions: {
              where: { visitId, visit: { is: { employeeId } } },
              include: { performedBy: { select: { fullName: true } }, step: { select: { id: true, orderNo: true, content: true } } },
              orderBy: [{ scheduledAt: 'asc' }, { sessionNo: 'asc' }],
            },
          },
          orderBy: { orderNo: 'asc' }
        }
      },
      orderBy: { id: 'asc' },
    });
    return plans.filter((plan) => plan.patientId === plan.visit.patient.id);
  }

  async createPlan(input: Prisma.TreatmentPlanUncheckedCreateInput): Promise<TreatmentPlan> {
    return prisma.treatmentPlan.create({
      data: input,
    });
  }

  async updatePlan(id: string, input: Prisma.TreatmentPlanUpdateInput): Promise<TreatmentPlan> {
    return prisma.treatmentPlan.update({
      where: { id },
      data: input,
    });
  }

  async deletePlan(id: string): Promise<TreatmentPlan> {
    // Delete all related steps and stages first to satisfy foreign key constraint
    const stages = await prisma.treatmentStage.findMany({ where: { planId: id } });
    for (const stage of stages) {
      await prisma.treatmentStep.deleteMany({ where: { stageId: stage.id } });
    }
    await prisma.treatmentStage.deleteMany({ where: { planId: id } });

    return prisma.treatmentPlan.delete({
      where: { id },
    });
  }

  // Treatment Step
  async getStepsByPlanId(stageId: string): Promise<TreatmentStep[]> {
    return prisma.treatmentStep.findMany({
      where: { stageId },
      orderBy: { orderNo: 'asc' },
    });
  }

  async createStep(input: Prisma.TreatmentStepUncheckedCreateInput): Promise<TreatmentStep> {
    return prisma.treatmentStep.create({
      data: input,
    });
  }

  async updateStep(id: string, input: Prisma.TreatmentStepUpdateInput): Promise<TreatmentStep> {
    return prisma.treatmentStep.update({
      where: { id },
      data: input,
    });
  }

  async deleteStep(id: string): Promise<TreatmentStep> {
    return prisma.treatmentStep.delete({
      where: { id },
    });
  }
}
