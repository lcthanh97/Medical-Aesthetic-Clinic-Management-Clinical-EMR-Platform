import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/infrastructure/database/prisma';
import { PrismaPrescriptionsRepository } from '@/infrastructure/database/repositories/PrismaPrescriptionsRepository';
import { PrescriptionsService } from '@/server/services/PrescriptionsService';
import type { AuthActor } from '@/server/services/AuthService';

const databaseUrl = (() => {
  try { return new URL(process.env.DATABASE_URL ?? ''); } catch { return null; }
})();
const isolatedDatabase = Boolean(
  databaseUrl && ['127.0.0.1', 'localhost'].includes(databaseUrl.hostname) &&
  databaseUrl.port === '55432' && databaseUrl.pathname === '/emr_test',
);

describe.skipIf(!isolatedDatabase)('MED-01 PostgreSQL isolated integration', () => {
  const suffix = randomUUID();
  const repository = new PrismaPrescriptionsRepository();
  const service = new PrescriptionsService(repository);
  let employeeId: string;
  let otherEmployeeId: string;
  let patientId: string;
  let otherPatientId: string;
  let visitId: string;
  let otherVisitId: string;
  let otherPatientVisitId: string;
  let otherPatientOtherEmployeeVisitId: string;
  let activeMedicineId: string;
  let inactiveMedicineId: string;
  const createdPrescriptionIds: string[] = [];

  function actor(id: string, permissionCodes: string[]): AuthActor {
    return {
      accountId: `account-${id}`, sessionId: `session-${id}`, username: `synthetic-${id}`,
      employeeId: id === 'doctor' ? employeeId : otherEmployeeId,
      employeeName: 'Synthetic test only', roleNames: ['Synthetic integration role'],
      rolePermissions: [{ roleName: 'Synthetic integration role', permissionCodes }],
    };
  }

  beforeAll(async () => {
    if (!isolatedDatabase) return;
    const employee = await prisma.employee.create({ data: { employeeCode: `MED01_${suffix}`, fullName: 'Synthetic MED01 clinician' } });
    const otherEmployee = await prisma.employee.create({ data: { employeeCode: `MED01_OTHER_${suffix}`, fullName: 'Synthetic other clinician' } });
    employeeId = employee.id;
    otherEmployeeId = otherEmployee.id;
    const patient = await prisma.patient.create({ data: { patientCode: `MED01_${suffix}`, fullName: 'Synthetic MED01 patient' } });
    const otherPatient = await prisma.patient.create({ data: { patientCode: `MED01_OTHER_${suffix}`, fullName: 'Synthetic other patient' } });
    patientId = patient.id;
    otherPatientId = otherPatient.id;
    const visit = await prisma.visit.create({ data: { patientId, employeeId, status: 'SCHEDULED' } });
    const otherVisit = await prisma.visit.create({ data: { patientId, employeeId: otherEmployeeId, status: 'SCHEDULED' } });
    const otherPatientVisit = await prisma.visit.create({ data: { patientId: otherPatientId, employeeId: employeeId, status: 'SCHEDULED' } });
    const otherPatientOtherEmployeeVisit = await prisma.visit.create({ data: { patientId: otherPatientId, employeeId: otherEmployeeId, status: 'SCHEDULED' } });
    visitId = visit.id;
    otherVisitId = otherVisit.id;
    otherPatientVisitId = otherPatientVisit.id;
    otherPatientOtherEmployeeVisitId = otherPatientOtherEmployeeVisit.id;
    const activeMedicine = await prisma.medicine.create({ data: { name: `Synthetic MED01 ${suffix}`, unit: 'test unit', status: 'ACTIVE' } });
    const inactiveMedicine = await prisma.medicine.create({ data: { name: `Inactive MED01 ${suffix}`, unit: 'test unit', status: 'INACTIVE' } });
    activeMedicineId = activeMedicine.id;
    inactiveMedicineId = inactiveMedicine.id;
  });

  afterAll(async () => {
    if (!isolatedDatabase) return;
    if (createdPrescriptionIds.length) {
      await prisma.prescriptionItem.deleteMany({ where: { prescriptionId: { in: createdPrescriptionIds } } });
      await prisma.prescription.deleteMany({ where: { id: { in: createdPrescriptionIds } } });
    }
    await prisma.visit.deleteMany({ where: { id: { in: [visitId, otherVisitId, otherPatientVisitId, otherPatientOtherEmployeeVisitId].filter(Boolean) } } });
    await prisma.medicine.deleteMany({ where: { id: { in: [activeMedicineId, inactiveMedicineId].filter(Boolean) } } });
    await prisma.patient.deleteMany({ where: { id: { in: [patientId, otherPatientId].filter(Boolean) } } });
    await prisma.employee.deleteMany({ where: { id: { in: [employeeId, otherEmployeeId].filter(Boolean) } } });
  });

  it('creates and reads back a draft with transactionally persisted lines without changing stock', async () => {
    const doctor = actor('doctor', ['PRESCRIPTION_READ', 'PRESCRIPTION_WRITE']);
    const stockBefore = await prisma.medicine.findUniqueOrThrow({ where: { id: activeMedicineId }, select: { stock: true } });
    const created = await service.create(doctor, {
      visitId,
      items: [{ medicineId: activeMedicineId, quantity: 2.5, dosage: 'Synthetic integration instruction' }],
    });
    createdPrescriptionIds.push(created.id);

    expect(created).toMatchObject({ status: 'DRAFT', employeeName: 'Synthetic MED01 clinician', canEdit: true });
    expect(created.items).toHaveLength(1);
    expect(created.items[0]).toMatchObject({ quantity: '2.5', dosage: 'Synthetic integration instruction' });
    const stockAfter = await prisma.medicine.findUniqueOrThrow({ where: { id: activeMedicineId }, select: { stock: true } });
    expect(stockAfter.stock.toString()).toBe(stockBefore.stock.toString());
  });

  it('replaces all draft items atomically and does not merge duplicate medicine rows', async () => {
    const created = await service.create(actor('doctor', ['PRESCRIPTION_READ', 'PRESCRIPTION_WRITE']), {
      visitId,
      items: [
        { medicineId: activeMedicineId, quantity: 1, dosage: 'First synthetic direction' },
        { medicineId: activeMedicineId, quantity: 2, dosage: 'Second synthetic direction' },
      ],
    });
    createdPrescriptionIds.push(created.id);
    expect(created.items).toHaveLength(2);

    const updated = await service.update(actor('doctor', ['PRESCRIPTION_READ', 'PRESCRIPTION_WRITE']), created.id, {
      items: [{ medicineId: activeMedicineId, quantity: 3.5, dosage: 'Updated synthetic direction' }],
    });
    expect(updated.items).toHaveLength(1);
    expect(updated.items[0]).toMatchObject({ quantity: '3.5', dosage: 'Updated synthetic direction' });
  });

  it('rejects visits outside the employee assignment for create and read', async () => {
    const doctor = actor('doctor', ['PRESCRIPTION_READ', 'PRESCRIPTION_WRITE']);
    await expect(service.create(doctor, {
      visitId: otherVisitId, items: [{ medicineId: activeMedicineId, quantity: 1, dosage: 'Synthetic' }],
    })).rejects.toThrow('PRESCRIPTION_VISIT_FORBIDDEN');
    const foreignRecords = await Promise.all([otherVisitId, otherPatientOtherEmployeeVisitId].map((foreignVisitId) =>
      prisma.prescription.create({
        data: {
          visitId: foreignVisitId,
          employeeId: otherEmployeeId,
          status: 'DRAFT',
          items: { create: { medicineId: activeMedicineId, quantity: 1, dosage: 'Synthetic test only' } },
        },
        select: { id: true },
      }),
    ));
    createdPrescriptionIds.push(...foreignRecords.map(({ id }) => id));
    for (const foreign of foreignRecords) {
      await expect(service.getById(doctor, foreign.id)).rejects.toThrow('PRESCRIPTION_NOT_FOUND');
    }
    const visibleIds = (await service.getList(doctor)).prescriptions.map(({ id }) => id);
    expect(visibleIds).not.toContain(foreignRecords[0].id);
    expect(visibleIds).not.toContain(foreignRecords[1].id);
    expect(otherPatientVisitId).toBeTruthy();
  });

  it('rejects inactive or missing medicines without persisting a parent prescription', async () => {
    const before = await prisma.prescription.count({ where: { visitId } });
    await expect(service.create(actor('doctor', ['PRESCRIPTION_READ', 'PRESCRIPTION_WRITE']), {
      visitId, items: [{ medicineId: inactiveMedicineId, quantity: 1, dosage: 'Synthetic' }],
    })).rejects.toThrow('PRESCRIPTION_MEDICINE_UNAVAILABLE');
    await expect(service.create(actor('doctor', ['PRESCRIPTION_READ', 'PRESCRIPTION_WRITE']), {
      visitId, items: [{ medicineId: 'missing-medicine', quantity: 1, dosage: 'Synthetic' }],
    })).rejects.toThrow('PRESCRIPTION_MEDICINE_UNAVAILABLE');
    expect(await prisma.prescription.count({ where: { visitId } })).toBe(before);
  });

  it('refuses edits by a different prescriber and refuses edits after the draft status changes', async () => {
    const created = await service.create(actor('doctor', ['PRESCRIPTION_READ', 'PRESCRIPTION_WRITE']), {
      visitId, items: [{ medicineId: activeMedicineId, quantity: 1, dosage: 'Synthetic' }],
    });
    createdPrescriptionIds.push(created.id);

    await expect(repository.replaceOwnDraftItems(created.id, otherEmployeeId, [
      { medicineId: activeMedicineId, quantity: 1, dosage: 'Out of scope' },
    ])).rejects.toThrow('PRESCRIPTION_NOT_EDITABLE');

    await prisma.prescription.update({ where: { id: created.id }, data: { status: 'LOCKED_TEST_ONLY' } });
    await expect(service.update(actor('doctor', ['PRESCRIPTION_READ', 'PRESCRIPTION_WRITE']), created.id, {
      items: [{ medicineId: activeMedicineId, quantity: 1, dosage: 'Locked edit attempt' }],
    })).rejects.toThrow('PRESCRIPTION_NOT_EDITABLE');
  });

  it('enforces read and write permission codes from one role on the actor', async () => {
    const reader = actor('doctor', ['PRESCRIPTION_READ']);
    await expect(service.getAssignedVisits(reader)).rejects.toThrow('PRESCRIPTION_ACCESS_DENIED');
    expect((await service.getAssignedVisits(actor('doctor', ['PRESCRIPTION_READ', 'PRESCRIPTION_WRITE']))).map((visit) => visit.id)).toContain(visitId);
    await expect(service.create(reader, {
      visitId, items: [{ medicineId: activeMedicineId, quantity: 1, dosage: 'No write permission' }],
    })).rejects.toThrow('PRESCRIPTION_ACCESS_DENIED');
    await expect(service.getList(actor('doctor', ['EMR_READ', 'EMR_WRITE']))).rejects.toThrow('PRESCRIPTION_ACCESS_DENIED');
  });
});
