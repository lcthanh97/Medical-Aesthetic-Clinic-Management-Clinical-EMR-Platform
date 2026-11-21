'use server';

import { PrismaTreatmentsRepository } from '@/infrastructure/database/repositories/PrismaTreatmentsRepository';
import { TreatmentsService } from '@/server/services/TreatmentsService';
import { revalidatePath } from 'next/cache';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/infrastructure/database/prisma';
import { getDoctorSession } from '@/server/auth/doctor-session';

const repository = new PrismaTreatmentsRepository();
const service = new TreatmentsService(repository);

// Employees for Executor dropdown
export async function getEmployees() {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: { fullName: 'asc' }
    });
    return { success: true, data: employees };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Treatment Plan
export async function getPlansByVisitId(visitId: string) {
  try {
    const plans = await service.getPlansByVisitId(visitId);
    
    // Map stage from notes back for the UI
    const mappedPlans = plans.map((plan: any) => {
      let stage = 'Khỏe';
      if (plan.notes && plan.notes.includes('Giai đoạn: ')) {
        const match = plan.notes.match(/Giai đoạn:\s*(.*)/);
        if (match && match[1]) stage = match[1];
      }
      return { ...plan, stage };
    });

    return { success: true, data: mappedPlans };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createPlan(input: any) {
  try {
    // The frontend passes visitId, name, stage, status.
    // We need to fetch the visit to get patientId, and provide defaults for version/createdById.
    const visit = await prisma.visit.findUnique({ where: { id: input.visitId } });
    if (!visit) throw new Error("Visit not found");

    // Fetch a real employee to act as createdBy
    let employee = await prisma.employee.findFirst();
    if (!employee) {
      // Create a dummy employee if database is empty
      employee = await prisma.employee.create({
        data: {
          employeeCode: `EMP_${Date.now()}`,
          fullName: 'System User'
        }
      });
    }

    const payload: Prisma.TreatmentPlanUncheckedCreateInput = {
      visitId: input.visitId,
      patientId: visit.patientId,
      name: input.name,
      status: input.status || 'Lên kế hoạch',
      version: 1,
      createdById: employee.id, 
    };

    if (input.stage) {
      payload.notes = `Giai đoạn: ${input.stage}`;
    }

    const plan = await service.createPlan(payload);

    // Create a TreatmentStage to hold steps
    await prisma.treatmentStage.create({
      data: {
        planId: plan.id,
        stageType: input.stage || 'Khỏe',
        name: input.stage || 'Khỏe',
        orderNo: 1,
        status: input.status || 'Lên kế hoạch'
      }
    });

    revalidatePath(`/treatments/${plan.visitId}`);
    return { success: true, data: { ...plan, stage: input.stage } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updatePlan(id: string, input: Prisma.TreatmentPlanUpdateInput) {
  try {
    const plan = await service.updatePlan(id, input);
    revalidatePath(`/treatments`);
    revalidatePath(`/bacsi/treatments`);
    return { success: true, data: plan };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deletePlan(id: string) {
  try {
    await service.deletePlan(id);
    revalidatePath(`/treatments`);
    revalidatePath(`/bacsi/treatments`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Treatment Step
export async function getStepsByStageId(stageId: string) {
  try {
    const steps = await service.getStepsByStageId(stageId);
    return { success: true, data: steps };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createStep(input: any) {
  try {
    // input has planId from UI, we need to find the stage
    let stageId = input.stageId;
    if (input.planId && !stageId) {
      const stages = await prisma.treatmentStage.findMany({ where: { planId: input.planId }});
      if (stages.length > 0) {
        stageId = stages[0].id;
      } else {
        throw new Error("No stage found for this plan");
      }
    }
    
    const payload: Prisma.TreatmentStepUncheckedCreateInput = {
      stageId,
      orderNo: input.orderNo,
      content: input.content,
      status: input.status || 'Lên kế hoạch',
      repeatCount: 1
    };

    const step = await service.createStep(payload);
    revalidatePath(`/treatments`);
    revalidatePath(`/bacsi/treatments`);
    return { success: true, data: step };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateStep(id: string, input: any) {
  try {
    const payload: Prisma.TreatmentStepUpdateInput = {
      orderNo: input.orderNo,
      content: input.content,
      status: input.status
    };
    const step = await service.updateStep(id, payload);
    revalidatePath(`/treatments`);
    revalidatePath(`/bacsi/treatments`);
    return { success: true, data: step };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteStep(id: string) {
  try {
    await service.deleteStep(id);
    revalidatePath(`/treatments`);
    revalidatePath(`/bacsi/treatments`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function checkMedicineInteractions(visitId: string, medicineIds: string[]) {
  try {
    const { clinicalRuleEngine } = await import('@/server/services/ClinicalRuleEngineService');
    const visit = await prisma.visit.findUnique({ where: { id: visitId } });
    if (!visit) return { success: false, error: 'Visit not found' };
    
    const warnings = await clinicalRuleEngine.checkInteractions(visit.patientId, medicineIds);
    return { success: true, data: warnings };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAllMedicines() {
  try {
    const medicines = await prisma.medicine.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'asc' }
    });
    
    // Convert Decimal to number for Next.js Client Component serialization
    const serializedMedicines = medicines.map(med => ({
      ...med,
      stock: Number(med.stock),
      unitCost: Number(med.unitCost),
      minStock: Number(med.minStock)
    }));

    return { success: true, data: serializedMedicines };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAllSupplies() {
  try {
    const supplies = await prisma.supply.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'asc' }
    });

    const serializedSupplies = supplies.map(sup => ({
      ...sup,
      stock: Number(sup.stock),
      unitCost: Number(sup.unitCost),
      minStock: Number(sup.minStock)
    }));

    return { success: true, data: serializedSupplies };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function completeStepWithInventoryDeduction(input: {
  stepId: string;
  visitId?: string;
  performedById: string;
  consumptions: Array<{
    type: 'MEDICINE' | 'SUPPLY';
    itemId: string;
    actualQuantity: number;
    unit?: string;
    notes?: string;
  }>;
  notes?: string;
}) {
  try {
    const { PrismaInventoryRepository } = await import('@/infrastructure/database/repositories/PrismaInventoryRepository');
    const { InventoryService } = await import('@/server/services/InventoryService');
    const invRepo = new PrismaInventoryRepository();
    const invService = new InventoryService(invRepo);

    const result = await invService.deductInventoryForTreatment(input);
    revalidatePath('/treatments');
    revalidatePath('/bacsi/treatments');
    revalidatePath('/inventory');
    revalidatePath('/admin/inventory');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createPlanFromTemplate(input: { visitId: string; templateId: string }) {
  try {
    const session = await getDoctorSession();
    if (!session) throw new Error('Phiên đăng nhập bác sĩ đã hết hạn.');

    const visit = await prisma.visit.findFirst({
      where: { id: input.visitId, employeeId: session.employeeId },
      select: { id: true, patientId: true },
    });
    if (!visit) throw new Error('Không tìm thấy lượt khám được phân công cho bác sĩ này.');

    const template = await prisma.treatmentProtocolTemplate.findUnique({
      where: { id: input.templateId },
      include: {
        stages: {
          include: { steps: { orderBy: { orderNo: 'asc' } } },
          orderBy: { orderNo: 'asc' },
        },
      },
    });
    if (!template) throw new Error('Không tìm thấy phác đồ chuẩn.');
    if (template.stages.length === 0) throw new Error('Phác đồ chuẩn chưa có giai đoạn điều trị.');

    const now = new Date();
    let elapsedDays = 0;
    const stages = template.stages.map((stage, index) => {
      const duration = Math.max(stage.durationDays ?? 0, 0);
      const plannedStartDate = new Date(now);
      plannedStartDate.setDate(plannedStartDate.getDate() + elapsedDays);
      const plannedEndDate = duration > 0 ? new Date(plannedStartDate) : null;
      if (plannedEndDate) plannedEndDate.setDate(plannedEndDate.getDate() + duration - 1);
      elapsedDays += duration;

      return {
        stageType: stage.stageType,
        name: stage.name,
        orderNo: stage.orderNo,
        goal: stage.goal,
        plannedStartDate,
        plannedEndDate,
        status: index === 0 ? 'Đang thực hiện' : 'Lên kế hoạch',
        notes: stage.notes,
        steps: {
          create: stage.steps.map((step) => ({
            orderNo: step.orderNo,
            content: step.instruction,
            repeatCount: step.repeatCount,
            intervalDays: step.intervalDays,
            plannedDurationMinutes: step.plannedDurationMinutes,
            ...(step.defaultParameters === null
              ? {}
              : { defaultParameters: step.defaultParameters as Prisma.InputJsonValue }),
            status: 'Lên kế hoạch',
          })),
        },
      };
    });

    const expectedEndDate = elapsedDays > 0 ? new Date(now) : null;
    if (expectedEndDate) expectedEndDate.setDate(expectedEndDate.getDate() + elapsedDays - 1);

    const plan = await prisma.treatmentPlan.create({
      data: {
        visitId: visit.id,
        patientId: visit.patientId,
        protocolTemplateId: template.id,
        name: template.name,
        diagnosisSummary: template.indication,
        goal: template.description,
        status: 'Đang thực hiện',
        version: 1,
        createdById: session.employeeId,
        startDate: now,
        expectedEndDate,
        stages: { create: stages },
      },
    });

    revalidatePath('/bacsi/treatments');
    revalidatePath('/bacsi/protocols');
    return { success: true, data: { id: plan.id, visitId: plan.visitId } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Không thể tạo phác đồ từ mẫu.' };
  }
}
