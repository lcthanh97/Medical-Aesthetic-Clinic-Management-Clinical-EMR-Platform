import { Prisma } from '@prisma/client';
import { prisma } from '@/infrastructure/database/prisma';
import type { IClinicalServicesRepository } from '@/server/repositories/IClinicalServicesRepository';

const imagingOrderSelect = {
  id: true,
  type: true,
  status: true,
  orderedAt: true,
  orderedBy: { select: { fullName: true } },
  service: { select: { code: true, name: true } },
  visit: {
    select: {
      id: true,
      employeeId: true,
      visitDate: true,
      status: true,
      patient: { select: { patientCode: true, fullName: true } },
    },
  },
  imagingResults: {
    select: { id: true, imagingType: true, conclusion: true, fileUrl: true },
    orderBy: { id: 'asc' },
  },
} satisfies Prisma.ClinicalOrderSelect;

export class PrismaClinicalServicesRepository implements IClinicalServicesRepository {
  findImagingOrderForEmployee(orderId: string, employeeId: string) {
    return prisma.clinicalOrder.findFirst({
      where: { id: orderId, visit: { is: { employeeId } } },
      select: imagingOrderSelect,
    });
  }

  findImagingResultScopeForEmployee(resultId: string, employeeId: string) {
    return prisma.imagingResult.findFirst({
      where: { id: resultId, order: { is: { visit: { is: { employeeId } } } } },
      select: { orderId: true, order: { select: { type: true, status: true } } },
    }).then((result) => result ? { orderId: result.orderId, type: result.order.type, status: result.order.status } : null);
  }

  findImagingOrdersForEmployee(employeeId: string, search?: string) {
    const query = search?.trim();
    return prisma.clinicalOrder.findMany({
      where: {
        visit: { is: { employeeId } },
        ...(query ? {
          OR: [
            { id: { contains: query, mode: 'insensitive' } },
            { type: { contains: query, mode: 'insensitive' } },
            { status: { contains: query, mode: 'insensitive' } },
            { service: { is: { name: { contains: query, mode: 'insensitive' } } } },
            { visit: { is: { patient: { is: { fullName: { contains: query, mode: 'insensitive' } } } } } },
            { visit: { is: { patient: { is: { patientCode: { contains: query, mode: 'insensitive' } } } } } },
            { imagingResults: { some: { conclusion: { contains: query, mode: 'insensitive' } } } },
          ],
        } : {}),
      },
      select: imagingOrderSelect,
      orderBy: [{ orderedAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });
  }

  createImagingResultForAssignedOrder(
    employeeId: string,
    orderId: string,
    input: { imagingType: string; conclusion: string },
  ) {
    return prisma.$transaction(async (transaction) => {
      const order = await transaction.clinicalOrder.findFirst({
        where: { id: orderId, visit: { is: { employeeId } } },
        select: { id: true, visitId: true },
      });
      if (!order) throw new Error('CLINICAL_ORDER_NOT_FOUND');

      await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "Visit" WHERE "id" = ${order.visitId} FOR UPDATE
      `;
      const assignedOrder = await transaction.clinicalOrder.findFirst({
        where: { id: orderId, visit: { is: { employeeId } } },
        select: { id: true },
      });
      if (!assignedOrder) throw new Error('CLINICAL_ORDER_NOT_FOUND');

      const result = await transaction.imagingResult.create({
        data: {
          orderId,
          imagingType: input.imagingType,
          conclusion: input.conclusion,
          fileUrl: null,
        },
        select: { id: true },
      });
      return result.id;
    });
  }

  async updateImagingResultForAssignedOrder(
    employeeId: string,
    resultId: string,
    input: { imagingType: string; conclusion: string },
  ): Promise<string> {
    return prisma.$transaction(async (transaction) => {
      const scoped = await transaction.imagingResult.findFirst({
        where: { id: resultId, order: { is: { visit: { is: { employeeId } } } } },
        select: { id: true, order: { select: { visitId: true } } },
      });
      if (!scoped) throw new Error('IMAGING_RESULT_NOT_FOUND');

      await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "Visit" WHERE "id" = ${scoped.order.visitId} FOR UPDATE
      `;
      const stillScoped = await transaction.imagingResult.findFirst({
        where: { id: resultId, order: { is: { visit: { is: { employeeId } } } } },
        select: { id: true },
      });
      if (!stillScoped) throw new Error('IMAGING_RESULT_NOT_FOUND');

      await transaction.imagingResult.update({
        where: { id: resultId },
        data: { imagingType: input.imagingType, conclusion: input.conclusion },
      });
      const parent = await transaction.imagingResult.findUniqueOrThrow({
        where: { id: resultId },
        select: { orderId: true },
      });
      return parent.orderId;
    });
  }
}
