import { randomUUID, createHash } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import { prisma } from '@/infrastructure/database/prisma';
import { PrismaInventoryRepository } from '@/infrastructure/database/repositories/PrismaInventoryRepository';
import { InventoryService } from '@/server/services/InventoryService';

const databaseUrl = (() => {
  try { return new URL(process.env.DATABASE_URL ?? ''); } catch { return null; }
})();
const isolatedDatabase = Boolean(databaseUrl
  && ['127.0.0.1', 'localhost'].includes(databaseUrl.hostname)
  && databaseUrl.port === '55432'
  && databaseUrl.pathname === '/emr_test');

describe.skipIf(!isolatedDatabase)('INV-03 local PostgreSQL report integration', () => {
  const suffix = randomUUID();
  const repository = new PrismaInventoryRepository();
  const service = new InventoryService(repository);
  const permissionCodes = ['INVENTORY_READ', 'TREATMENT_READ'];
  let accountId = '';
  let employeeId = '';
  let otherEmployeeId = '';
  let roleId = '';
  let patientId = '';
  let visitId = '';
  let foreignVisitId = '';
  let planId = '';
  let stageId = '';
  let sessionId = '';
  let medicineId = '';
  let consumptionId = '';
  let foreignPlanId = '';
  let foreignStageId = '';
  let foreignSessionId = '';
  let foreignConsumptionId = '';
  let token = '';
  let sessionRecordId = '';
  const createdPermissionIds: string[] = [];

  beforeAll(async () => {
    if (!isolatedDatabase) return;

    const account = await prisma.account.create({
      data: { username: `synthetic-inv03-${suffix}`, passwordHash: 'test-only-not-used', status: 'ACTIVE' },
    });
    accountId = account.id;
    const employee = await prisma.employee.create({
      data: { accountId, employeeCode: `INV03-${suffix}`, fullName: 'Synthetic INV03 clinician' },
    });
    employeeId = employee.id;
    const otherEmployee = await prisma.employee.create({
      data: { employeeCode: `INV03-OTHER-${suffix}`, fullName: 'Synthetic other clinician' },
    });
    otherEmployeeId = otherEmployee.id;

    const role = await prisma.role.create({ data: { name: `Synthetic INV03 role ${suffix}` } });
    roleId = role.id;
    await prisma.accountRole.create({ data: { accountId, roleId } });
    for (const code of permissionCodes) {
      let permission = await prisma.permission.findUnique({ where: { code } });
      if (!permission) {
        permission = await prisma.permission.create({ data: { code } });
        createdPermissionIds.push(permission.id);
      }
      const relation = await prisma.rolePermission.findUnique({
        where: { roleId_permissionId: { roleId, permissionId: permission.id } },
      });
      if (!relation) {
        await prisma.rolePermission.create({ data: { roleId, permissionId: permission.id } });
      }
    }

    token = randomUUID() + randomUUID();
    const sessionRecord = await prisma.refreshToken.create({
      data: {
        accountId,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
    sessionRecordId = sessionRecord.id;

    const patient = await prisma.patient.create({ data: { patientCode: `INV03-${suffix}`, fullName: 'Synthetic INV03 patient' } });
    patientId = patient.id;
    const visit = await prisma.visit.create({ data: { patientId, employeeId, status: 'TEST_ONLY' } });
    visitId = visit.id;
    const foreignVisit = await prisma.visit.create({ data: { patientId, employeeId: otherEmployeeId, status: 'TEST_ONLY' } });
    foreignVisitId = foreignVisit.id;
    const plan = await prisma.treatmentPlan.create({
      data: { patientId, visitId, name: 'Synthetic INV03 plan', status: 'TEST_ONLY', version: 1, createdById: employeeId },
    });
    planId = plan.id;
    const stage = await prisma.treatmentStage.create({
      data: { planId, stageType: 'TEST_ONLY', name: 'Synthetic stage', orderNo: 1, status: 'TEST_ONLY' },
    });
    stageId = stage.id;
    const session = await prisma.treatmentSession.create({
      data: { stageId, visitId, sessionNo: 1, status: 'TEST_ONLY' },
    });
    sessionId = session.id;
    const foreignPlan = await prisma.treatmentPlan.create({
      data: { patientId, visitId: foreignVisitId, name: 'Synthetic foreign plan', status: 'TEST_ONLY', version: 1, createdById: otherEmployeeId },
    });
    foreignPlanId = foreignPlan.id;
    const foreignStage = await prisma.treatmentStage.create({
      data: { planId: foreignPlanId, stageType: 'TEST_ONLY', name: 'Synthetic foreign stage', orderNo: 1, status: 'TEST_ONLY' },
    });
    foreignStageId = foreignStage.id;
    const foreignSession = await prisma.treatmentSession.create({
      data: { stageId: foreignStageId, visitId: foreignVisitId, sessionNo: 1, status: 'TEST_ONLY' },
    });
    foreignSessionId = foreignSession.id;
    const medicine = await prisma.medicine.create({
      data: { name: `Synthetic INV03 item ${suffix}`, unit: 'ml', unitCost: '0.10', stock: '99' },
    });
    medicineId = medicine.id;
    const consumption = await prisma.treatmentConsumption.create({
      data: {
        sessionId, medicineId, plannedQuantity: '0.20', actualQuantity: '0.30', unit: 'ml',
        unitCost: '0.10', totalCost: '0.03', recordedById: employeeId,
      },
    });
    consumptionId = consumption.id;
    const foreignConsumption = await prisma.treatmentConsumption.create({
      data: {
        sessionId: foreignSessionId, medicineId, plannedQuantity: '0.20', actualQuantity: '9', unit: 'ml',
        unitCost: '0.10', totalCost: '0.90', recordedById: otherEmployeeId,
      },
    });
    foreignConsumptionId = foreignConsumption.id;
  });

  afterAll(async () => {
    if (!isolatedDatabase) return;
    if (consumptionId || foreignConsumptionId) await prisma.treatmentConsumption.deleteMany({ where: { id: { in: [consumptionId, foreignConsumptionId].filter(Boolean) } } });
    if (sessionId || foreignSessionId) await prisma.treatmentSession.deleteMany({ where: { id: { in: [sessionId, foreignSessionId].filter(Boolean) } } });
    if (stageId || foreignStageId) await prisma.treatmentStage.deleteMany({ where: { id: { in: [stageId, foreignStageId].filter(Boolean) } } });
    if (planId || foreignPlanId) await prisma.treatmentPlan.deleteMany({ where: { id: { in: [planId, foreignPlanId].filter(Boolean) } } });
    if (visitId || foreignVisitId) await prisma.visit.deleteMany({ where: { id: { in: [visitId, foreignVisitId].filter(Boolean) } } });
    if (patientId) await prisma.patient.deleteMany({ where: { id: patientId } });
    if (medicineId) await prisma.medicine.deleteMany({ where: { id: medicineId } });
    if (sessionRecordId) await prisma.refreshToken.deleteMany({ where: { id: sessionRecordId } });
    if (accountId) await prisma.accountRole.deleteMany({ where: { accountId } });
    if (roleId) {
      await prisma.rolePermission.deleteMany({ where: { roleId } });
      await prisma.role.deleteMany({ where: { id: roleId } });
    }
    if (createdPermissionIds.length) await prisma.permission.deleteMany({ where: { id: { in: createdPermissionIds } } });
    if (employeeId || otherEmployeeId) await prisma.employee.deleteMany({ where: { id: { in: [employeeId, otherEmployeeId].filter(Boolean) } } });
    if (accountId) await prisma.account.deleteMany({ where: { id: accountId } });
  });

  const actor = () => ({ accountId, employeeId, sessionId: sessionRecordId });

  it('reads stored consumption and cost, computes exact quantity variance, and excludes another doctor’s Visit', async () => {
    const report = await service.getTreatmentConsumptionReport(actor(), {});
    expect(report.rows).toHaveLength(1);
    expect(report.rows[0]).toMatchObject({ id: consumptionId, patientCode: `INV03-${suffix}`, sessionId, variancePercent: '50' });
    expect(new Prisma.Decimal(report.rows[0].actualQuantity).eq('0.30')).toBe(true);
    expect(new Prisma.Decimal(report.rows[0].plannedQuantity!).eq('0.20')).toBe(true);
    expect(new Prisma.Decimal(report.rows[0].quantityVariance!).eq('0.10')).toBe(true);
    expect(new Prisma.Decimal(report.rows[0].unitCost).eq('0.10')).toBe(true);
    expect(new Prisma.Decimal(report.rows[0].totalCost).eq('0.03')).toBe(true);
    expect(new Prisma.Decimal(report.totalCost).eq('0.03')).toBe(true);
    expect(report.items).toHaveLength(1);
    expect(new Prisma.Decimal(report.items[0].actualQuantity).eq('0.30')).toBe(true);
    expect(report.rows.some(({ id }) => id === foreignConsumptionId)).toBe(false);
  });

  it('requires both permissions in the same database role and a live session', async () => {
    const treatmentPermission = await prisma.permission.findUniqueOrThrow({ where: { code: 'TREATMENT_READ' } });
    await prisma.rolePermission.delete({
      where: { roleId_permissionId: { roleId, permissionId: treatmentPermission.id } },
    });
    const splitPermission = await service.getTreatmentConsumptionReport(actor(), {});
    expect(splitPermission.rows).toHaveLength(0);
    expect(splitPermission.totalRows).toBe(0);
    await prisma.rolePermission.create({ data: { roleId, permissionId: treatmentPermission.id } });
    await prisma.refreshToken.update({ where: { id: sessionRecordId }, data: { revokedAt: new Date() } });
    const revoked = await service.getTreatmentConsumptionReport(actor(), {});
    expect(revoked.rows).toHaveLength(0);
    expect(revoked.totalRows).toBe(0);
  });
});
