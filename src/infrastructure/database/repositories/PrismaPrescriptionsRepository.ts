import { Prisma } from '@prisma/client';
import { prisma } from '@/infrastructure/database/prisma';
import type { PrescriptionItemInput } from '@/features/prescriptions/schemas/prescriptions.schema';
import type { IPrescriptionsRepository } from '@/server/repositories/IPrescriptionsRepository';
import { PRESCRIPTION_DRAFT_TEST_STATUS } from '@/server/services/PrescriptionsService';

const prescriptionSelect = {
  id: true,
  visitId: true,
  employeeId: true,
  status: true,
  employee: { select: { fullName: true } },
  visit: {
    select: {
      id: true,
      employeeId: true,
      visitDate: true,
      status: true,
      patient: { select: { id: true, patientCode: true, fullName: true } },
    },
  },
  items: {
    select: {
      id: true,
      medicineId: true,
      quantity: true,
      dosage: true,
      medicine: { select: { id: true, name: true, unit: true, status: true } },
    },
  },
} satisfies Prisma.PrescriptionSelect;

function assertActiveMedicines(found: Array<{ id: string }>, inputs: PrescriptionItemInput[]) {
  const requestedIds = new Set(inputs.map((item) => item.medicineId));
  if (found.length !== requestedIds.size) throw new Error('PRESCRIPTION_MEDICINE_UNAVAILABLE');
}

export class PrismaPrescriptionsRepository implements IPrescriptionsRepository {
  findByIdForEmployee(id: string, employeeId: string) {
    return prisma.prescription.findFirst({
      where: { id, visit: { is: { employeeId } } },
      select: prescriptionSelect,
    });
  }

  findManyForEmployee(employeeId: string, search?: string) {
    const query = search?.trim();
    return prisma.prescription.findMany({
      where: {
        visit: { is: { employeeId } },
        ...(query ? {
          OR: [
            { visit: { is: { patient: { is: { fullName: { contains: query, mode: 'insensitive' } } } } } },
            { visit: { is: { patient: { is: { patientCode: { contains: query, mode: 'insensitive' } } } } } },
            { items: { some: { medicine: { is: { name: { contains: query, mode: 'insensitive' } } } } } },
          ],
        } : {}),
      },
      select: prescriptionSelect,
      orderBy: [{ visit: { visitDate: 'desc' } }, { id: 'desc' }],
      take: 100,
    });
  }

  findAssignedVisits(employeeId: string, search?: string) {
    const query = search?.trim();
    return prisma.visit.findMany({
      where: {
        employeeId,
        ...(query ? {
          OR: [
            { patient: { is: { fullName: { contains: query, mode: 'insensitive' } } } },
            { patient: { is: { patientCode: { contains: query, mode: 'insensitive' } } } },
          ],
        } : {}),
      },
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

  findActiveMedicines(search?: string) {
    const query = search?.trim();
    return prisma.medicine.findMany({
      where: { status: 'ACTIVE', ...(query ? { name: { contains: query, mode: 'insensitive' } } : {}) },
      select: { id: true, name: true, unit: true, status: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: 50,
    });
  }

  createForAssignedVisit(employeeId: string, visitId: string, items: PrescriptionItemInput[]) {
    return prisma.$transaction(async (transaction) => {
      const visit = await transaction.visit.findFirst({
        where: { id: visitId, employeeId },
        select: { id: true },
      });
      if (!visit) throw new Error('PRESCRIPTION_VISIT_FORBIDDEN');

      const medicineIds = [...new Set(items.map((item) => item.medicineId))];
      const medicines = await transaction.medicine.findMany({
        where: { id: { in: medicineIds }, status: 'ACTIVE' },
        select: { id: true },
      });
      assertActiveMedicines(medicines, items);

      const prescription = await transaction.prescription.create({
        data: {
          visitId,
          employeeId,
          status: PRESCRIPTION_DRAFT_TEST_STATUS,
          items: {
            create: items.map((item) => ({
              medicineId: item.medicineId,
              quantity: new Prisma.Decimal(item.quantity),
              dosage: item.dosage,
            })),
          },
        },
        select: { id: true },
      });
      return prescription.id;
    });
  }

  async replaceOwnDraftItems(id: string, employeeId: string, items: PrescriptionItemInput[]) {
    await prisma.$transaction(async (transaction) => {
      const locked = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "Prescription" WHERE "id" = ${id} FOR UPDATE
      `;
      if (!locked.length) throw new Error('PRESCRIPTION_NOT_FOUND');

      const prescription = await transaction.prescription.findFirst({
        where: {
          id,
          employeeId,
          status: PRESCRIPTION_DRAFT_TEST_STATUS,
          visit: { is: { employeeId } },
        },
        select: { id: true },
      });
      if (!prescription) throw new Error('PRESCRIPTION_NOT_EDITABLE');

      const medicineIds = [...new Set(items.map((item) => item.medicineId))];
      const medicines = await transaction.medicine.findMany({
        where: { id: { in: medicineIds }, status: 'ACTIVE' },
        select: { id: true },
      });
      assertActiveMedicines(medicines, items);

      await transaction.prescriptionItem.deleteMany({ where: { prescriptionId: id } });
      await transaction.prescriptionItem.createMany({
        data: items.map((item) => ({
          prescriptionId: id,
          medicineId: item.medicineId,
          quantity: new Prisma.Decimal(item.quantity),
          dosage: item.dosage,
        })),
      });
    });
  }
}
