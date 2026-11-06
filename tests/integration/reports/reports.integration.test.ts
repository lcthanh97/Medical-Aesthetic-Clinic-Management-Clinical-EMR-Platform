import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import { NextRequest } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { PrismaAuthRepository } from '@/infrastructure/database/repositories/PrismaAuthRepository';
import { PrismaReportsRepository } from '@/infrastructure/database/repositories/PrismaReportsRepository';
import { ReportsController } from '@/server/controllers/ReportsController';
import { ReportsService } from '@/server/services/ReportsService';
import { AuthService } from '@/server/services/AuthService';
import { GET as reportsGet } from '@/app/api/reports/route';

const databaseUrl = (() => {
  try { return new URL(process.env.DATABASE_URL ?? ''); } catch { return null; }
})();
const isolatedDatabase = Boolean(databaseUrl
  && ['127.0.0.1', 'localhost'].includes(databaseUrl.hostname)
  && databaseUrl.port === '55432'
  && databaseUrl.pathname === '/emr_test');

describe.skipIf(!isolatedDatabase)('Reports PostgreSQL isolated integration', () => {
  const suffix = randomUUID();
  const permissions = ['REPORT_READ', 'REPORT_EXPORT', 'BILLING_READ', 'INVENTORY_READ', 'TREATMENT_READ'];
  const auth = new AuthService(new PrismaAuthRepository());
  const controller = new ReportsController(new ReportsService(new PrismaReportsRepository()));
  const fixedNow = new Date('2026-03-01T12:00:00.000Z');
  let accountId = '';
  let employeeId = '';
  let otherEmployeeId = '';
  let roleId = '';
  let sessionId = '';
  let token = '';
  let patientId = '';
  let visitId = '';
  let visitTwoId = '';
  let outsideVisitId = '';
  let foreignVisitId = '';
  let appointmentIds: string[] = [];
  let invoiceIds: string[] = [];
  let invoiceItemIds: string[] = [];
  let treatmentPlanIds: string[] = [];
  let treatmentStageIds: string[] = [];
  let sessionIds: string[] = [];
  let consumptionIds: string[] = [];
  let medicineId = '';
  let lowStockMedicineId = '';
  let inventoryTransactionIds: string[] = [];
  const createdPermissionIds: string[] = [];
  const reportsFeatureFlag = process.env.REPORTS_TEST_MODE;

  beforeAll(async () => {
    if (!isolatedDatabase) return;
    process.env.REPORTS_TEST_MODE = 'true';

    const account = await prisma.account.create({
      data: { username: `synthetic-report-${suffix}`, passwordHash: 'test-only-not-used', status: 'ACTIVE' },
    });
    accountId = account.id;
    const employee = await prisma.employee.create({
      data: { accountId, employeeCode: `REPORT-${suffix}`, fullName: 'Synthetic report actor' },
    });
    employeeId = employee.id;
    const otherEmployee = await prisma.employee.create({
      data: { employeeCode: `REPORT-OTHER-${suffix}`, fullName: 'Synthetic other employee' },
    });
    otherEmployeeId = otherEmployee.id;
    const role = await prisma.role.create({ data: { name: `Synthetic report role ${suffix}` } });
    roleId = role.id;
    await prisma.accountRole.create({ data: { accountId, roleId } });

    for (const code of permissions) {
      let permission = await prisma.permission.findUnique({ where: { code } });
      if (!permission) {
        permission = await prisma.permission.create({ data: { code } });
        createdPermissionIds.push(permission.id);
      }
      await prisma.rolePermission.create({ data: { roleId, permissionId: permission.id } });
    }
    token = randomBytes(32).toString('base64url');
    const session = await prisma.refreshToken.create({
      data: { accountId, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 30 * 60_000) },
    });
    sessionId = session.id;

    const patient = await prisma.patient.create({ data: { patientCode: `REPORT-${suffix}`, fullName: 'Synthetic report patient' } });
    patientId = patient.id;
    const ownVisit = await prisma.visit.create({ data: { patientId, employeeId, status: 'VISIT_TEST_A', visitDate: fixedNow } });
    visitId = ownVisit.id;
    const ownVisitTwo = await prisma.visit.create({ data: { patientId, employeeId, status: 'VISIT_TEST_B', visitDate: new Date('2026-03-02T15:00:00.000Z') } });
    visitTwoId = ownVisitTwo.id;
    const outsideVisit = await prisma.visit.create({ data: { patientId, employeeId, status: 'OUTSIDE_TEST', visitDate: new Date('2026-04-01T10:00:00.000Z') } });
    outsideVisitId = outsideVisit.id;
    const foreignVisit = await prisma.visit.create({ data: { patientId, employeeId: otherEmployeeId, status: 'FOREIGN_TEST', visitDate: fixedNow } });
    foreignVisitId = foreignVisit.id;

    const appointments = await Promise.all([
      prisma.appointment.create({ data: { patientId, employeeId, scheduledAt: fixedNow, status: 'APPT_TEST_A' } }),
      prisma.appointment.create({ data: { patientId, employeeId, scheduledAt: new Date('2026-03-02T08:00:00.000Z'), status: 'APPT_TEST_B' } }),
      prisma.appointment.create({ data: { patientId, employeeId: otherEmployeeId, scheduledAt: fixedNow, status: 'FOREIGN_APPT_TEST' } }),
    ]);
    appointmentIds = appointments.map(({ id }) => id);

    const ownInvoice = await prisma.invoice.create({ data: { visitId, total: '200.00', status: 'INVOICE_TEST' } });
    const foreignInvoice = await prisma.invoice.create({ data: { visitId: foreignVisitId, total: '999.00', status: 'INVOICE_TEST' } });
    invoiceIds = [ownInvoice.id, foreignInvoice.id];
    const items = await Promise.all([
      prisma.invoiceItem.create({ data: { invoiceId: ownInvoice.id, itemType: 'TEST', description: 'Synthetic line one', quantity: '1', unitPrice: '100.00', discount: '0', total: '100.00' } }),
      prisma.invoiceItem.create({ data: { invoiceId: ownInvoice.id, itemType: 'TEST', description: 'Synthetic line two', quantity: '1', unitPrice: '100.00', discount: '0', total: '100.00' } }),
    ]);
    invoiceItemIds = items.map(({ id }) => id);
    await prisma.payment.createMany({ data: [
      { invoiceId: ownInvoice.id, amount: '12.34', method: 'TEST_METHOD', paidAt: fixedNow },
      { invoiceId: foreignInvoice.id, amount: '999.00', method: 'TEST_METHOD', paidAt: fixedNow },
    ] });

    const treatmentPlans = await Promise.all([visitId, visitTwoId, foreignVisitId].map((assignedVisitId, index) => prisma.treatmentPlan.create({
      data: { patientId, visitId: assignedVisitId, name: `Synthetic report plan ${index + 1}`, status: 'PLAN_TEST', version: 1, createdById: index === 2 ? otherEmployeeId : employeeId, createdAt: fixedNow },
    })));
    treatmentPlanIds = treatmentPlans.map(({ id }) => id);
    const treatmentStages = await Promise.all(treatmentPlanIds.map((planId, index) => prisma.treatmentStage.create({
      data: { planId, stageType: 'TEST', name: `Synthetic report stage ${index + 1}`, orderNo: 1, status: 'STAGE_TEST' },
    })));
    treatmentStageIds = treatmentStages.map(({ id }) => id);
    const sessions = await Promise.all([
      prisma.treatmentSession.create({ data: { stageId: treatmentStageIds[0], visitId, sessionNo: 1, status: 'SESSION_TEST_A', createdAt: fixedNow } }),
      prisma.treatmentSession.create({ data: { stageId: treatmentStageIds[1], visitId: visitTwoId, sessionNo: 2, status: 'SESSION_TEST_B', createdAt: new Date('2026-03-02T16:00:00.000Z') } }),
      prisma.treatmentSession.create({ data: { stageId: treatmentStageIds[2], visitId: foreignVisitId, sessionNo: 3, status: 'FOREIGN_SESSION_TEST', createdAt: fixedNow } }),
    ]);
    sessionIds = sessions.map(({ id }) => id);
    const medicine = await prisma.medicine.create({ data: { name: `Synthetic report item ${suffix}`, unit: 'ml', unitCost: '999.99', stock: '50' } });
    medicineId = medicine.id;
    const lowMedicine = await prisma.medicine.create({ data: { name: `Synthetic low-stock report item ${suffix}`, unit: 'box', stock: '1', minStock: '2' } });
    lowStockMedicineId = lowMedicine.id;
    inventoryTransactionIds.push((await prisma.inventoryTransaction.create({
      data: { medicineId: lowMedicine.id, transactionType: 'SYNTHETIC_TYPE_KEEP_RAW', quantity: '2.5', unit: 'box', balanceBefore: '0', balanceAfter: '2.5', createdById: employeeId, createdAt: fixedNow },
    })).id);
    const consumption = await Promise.all([
      prisma.treatmentConsumption.create({ data: { sessionId: sessions[0].id, medicineId, actualQuantity: '0.50', unit: 'ml', unitCost: '10.00', totalCost: '17.33', recordedById: employeeId, createdAt: fixedNow } }),
      prisma.treatmentConsumption.create({ data: { sessionId: sessions[0].id, medicineId, actualQuantity: '2', unit: 'piece', unitCost: '0.50', totalCost: '1.01', recordedById: employeeId, createdAt: fixedNow } }),
      prisma.treatmentConsumption.create({ data: { sessionId: sessions[2].id, medicineId, actualQuantity: '5', unit: 'ml', unitCost: '100.00', totalCost: '500.00', recordedById: otherEmployeeId, createdAt: fixedNow } }),
    ]);
    consumptionIds = consumption.map(({ id }) => id);
  });

  afterAll(async () => {
    if (!isolatedDatabase) return;
    if (consumptionIds.length) await prisma.treatmentConsumption.deleteMany({ where: { id: { in: consumptionIds } } });
    if (inventoryTransactionIds.length) await prisma.inventoryTransaction.deleteMany({ where: { id: { in: inventoryTransactionIds } } });
    if (sessionIds.length) await prisma.treatmentSession.deleteMany({ where: { id: { in: sessionIds } } });
    if (treatmentStageIds.length) await prisma.treatmentStage.deleteMany({ where: { id: { in: treatmentStageIds } } });
    if (treatmentPlanIds.length) await prisma.treatmentPlan.deleteMany({ where: { id: { in: treatmentPlanIds } } });
    if (invoiceIds.length) {
      await prisma.paymentAllocation.deleteMany({ where: { invoiceItemId: { in: invoiceItemIds } } });
      await prisma.payment.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
      await prisma.invoiceItem.deleteMany({ where: { id: { in: invoiceItemIds } } });
      await prisma.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
    }
    if (appointmentIds.length) await prisma.appointment.deleteMany({ where: { id: { in: appointmentIds } } });
    const visitIds = [visitId, visitTwoId, outsideVisitId, foreignVisitId].filter(Boolean);
    if (visitIds.length) await prisma.visit.deleteMany({ where: { id: { in: visitIds } } });
    if (medicineId || lowStockMedicineId) await prisma.medicine.deleteMany({ where: { id: { in: [medicineId, lowStockMedicineId].filter(Boolean) } } });
    if (patientId) await prisma.patient.deleteMany({ where: { id: patientId } });
    if (sessionId) await prisma.refreshToken.deleteMany({ where: { id: sessionId } });
    if (accountId) await prisma.accountRole.deleteMany({ where: { accountId } });
    if (roleId) {
      await prisma.rolePermission.deleteMany({ where: { roleId } });
      await prisma.role.deleteMany({ where: { id: roleId } });
    }
    if (createdPermissionIds.length) await prisma.permission.deleteMany({ where: { id: { in: createdPermissionIds } } });
    if (employeeId || otherEmployeeId) await prisma.employee.deleteMany({ where: { id: { in: [employeeId, otherEmployeeId].filter(Boolean) } } });
    if (accountId) await prisma.account.deleteMany({ where: { id: accountId } });
    if (reportsFeatureFlag === undefined) delete process.env.REPORTS_TEST_MODE;
    else process.env.REPORTS_TEST_MODE = reportsFeatureFlag;
  });

  const getActor = () => auth.getSession(token);
  const period = { startDate: '2026-03-01', endDate: '2026-03-03' };

  it('counts assigned visits and appointments by stored status and their correct date fields', async () => {
    const actor = await getActor();
    expect(actor).not.toBeNull();
    const data = await controller.getDashboard(actor!, period);
    expect(data.visits.total).toBe(2);
    expect(data.visits.byStatus).toEqual([
      { status: 'VISIT_TEST_A', count: 1 }, { status: 'VISIT_TEST_B', count: 1 },
    ]);
    expect(data.appointments.total).toBe(2);
    expect(data.patients.uniqueWithVisits).toBe(1);
    expect(data.appointments.byStatus).toEqual([
      { status: 'APPT_TEST_A', count: 1 }, { status: 'APPT_TEST_B', count: 1 },
    ]);
    expect(data.visits.byDate).toHaveLength(3);
    expect(data.visits.byDate[2]).toEqual({ date: '2026-03-03', count: 0 });
    expect(data.visits).not.toHaveProperty('patient');
    expect(await controller.getDashboard(actor!, { ...period, visitStatus: 'VISIT_TEST_A' })).toMatchObject({ visits: { total: 1 } });
  });

  it('aggregates Payment.amount once by paidAt without joining invoice items and keeps Decimal exact', async () => {
    const data = await controller.getDashboard((await getActor())!, period);
    expect(data.finance?.paymentCount).toBe(1);
    expect(new Prisma.Decimal(data.finance!.paymentAmount).eq('12.34')).toBe(true);
    expect(data.finance?.byMethod).toEqual([{ method: 'TEST_METHOD', count: 1, amount: expect.any(String) }]);
  });

  it('uses stored treatment costs and groups quantities separately by unit within assigned Visits', async () => {
    const data = await controller.getDashboard((await getActor())!, period);
    expect(data.treatment?.sessionCount).toBe(2);
    expect(data.treatment?.planCount).toBe(2);
    expect(data.treatment?.plansByStatus).toEqual([{ status: 'PLAN_TEST', count: 2 }]);
    expect(data.treatment?.sessionsByStatus).toEqual([
      { status: 'SESSION_TEST_A', count: 1 }, { status: 'SESSION_TEST_B', count: 1 },
    ]);
    expect(new Prisma.Decimal(data.treatment!.consumptionTotalCost).eq('18.34')).toBe(true);
    expect(data.treatment?.quantityByUnit.map(({ unit, quantity }) => [unit, new Prisma.Decimal(quantity).toString()]))
      .toEqual([['ml', new Prisma.Decimal('0.50').toString()], ['piece', '2']]);
  });

  it('reports configured low-stock thresholds and preserves raw inventory transaction types without deriving valuation', async () => {
    const report = await controller.getDashboard((await getActor())!, period);
    expect(report.inventory).not.toBeNull();
    expect(report.inventory!.lowStockCount).toBeGreaterThanOrEqual(1);
    expect(report.inventory!.lowStockItems.some(({ name, stock, minStock }) =>
      name === `Synthetic low-stock report item ${suffix}` && stock === '1' && minStock === '2')).toBe(true);
    expect(report.inventory!.transactionsByTypeAndUnit).toContainEqual({
      transactionType: 'SYNTHETIC_TYPE_KEEP_RAW', unit: 'box', quantity: expect.any(String), count: 1,
    });
    expect(report.inventory).not.toHaveProperty('inventoryValue');
  });

  it('requires a live session and server permission for the scoped API and export', async () => {
    const unauthenticated = await reportsGet(new NextRequest(`http://localhost/api/reports?startDate=${period.startDate}&endDate=${period.endDate}`));
    expect(unauthenticated.status).toBe(401);
    const cookie = { headers: { cookie: `clinic_session=${token}` } };
    const dashboard = await reportsGet(new NextRequest(`http://localhost/api/reports?startDate=${period.startDate}&endDate=${period.endDate}`, cookie));
    expect(dashboard.status).toBe(200);
    expect(dashboard.headers.get('cache-control')).toContain('no-store');
    const body = await dashboard.json();
    expect(body.data.visits.total).toBe(2);
    expect(body.data.patients).toEqual({ totalInScope: 1, uniqueWithVisits: 1, newInPeriod: null });

    const exportUrl = `http://localhost/api/reports?startDate=${period.startDate}&endDate=${period.endDate}&format=csv`;
    const csvResponse = await reportsGet(new NextRequest(exportUrl, cookie));
    expect(csvResponse.status).toBe(200);
    const csvBytes = Buffer.from(await csvResponse.arrayBuffer());
    expect(csvBytes.subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
    const csv = csvBytes.subarray(3).toString('utf8');
    expect(csv).toContain('12.34');
    expect(csv).not.toContain('Synthetic report patient');

    const exportPermission = await prisma.permission.findUniqueOrThrow({ where: { code: 'REPORT_EXPORT' } });
    await prisma.rolePermission.delete({ where: { roleId_permissionId: { roleId, permissionId: exportPermission.id } } });
    expect((await reportsGet(new NextRequest(exportUrl, cookie))).status).toBe(403);
  });
});
