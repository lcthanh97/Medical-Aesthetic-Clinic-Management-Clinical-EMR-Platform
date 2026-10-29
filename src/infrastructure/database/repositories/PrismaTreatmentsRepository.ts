import type { ITreatmentsRepository } from '@/server/repositories/ITreatmentsRepository';
import { prisma } from '@/infrastructure/database/prisma';
import type { Prisma, TreatmentPlan, TreatmentStep } from '@prisma/client';

export class PrismaTreatmentsRepository implements ITreatmentsRepository {
  // Treatment Plan
  async getPlansByVisitId(visitId: string): Promise<any[]> {
    return prisma.treatmentPlan.findMany({
      where: { visitId },
      include: { 
        stages: {
          include: {
            steps: {
              orderBy: { orderNo: 'asc' }
            }
          },
          orderBy: { orderNo: 'asc' }
        }
      },
      orderBy: { id: 'asc' },
    });
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
