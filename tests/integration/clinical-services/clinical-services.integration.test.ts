import { randomBytes, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/infrastructure/database/prisma';
import { PrismaAuthRepository } from '@/infrastructure/database/repositories/PrismaAuthRepository';
import { PrismaClinicalServicesRepository } from '@/infrastructure/database/repositories/PrismaClinicalServicesRepository';
import { ClinicalServicesController } from '@/server/controllers/ClinicalServicesController';
import { ClinicalServicesService } from '@/server/services/ClinicalServicesService';
import { AuthService, hashNewPassword, hashSessionToken, type AuthActor } from '@/server/services/AuthService';

const databaseUrl = (() => { try { return new URL(process.env.DATABASE_URL ?? ''); } catch { return null; } })();
const isolatedDatabase = Boolean(
  databaseUrl && ['127.0.0.1', 'localhost'].includes(databaseUrl.hostname) &&
  databaseUrl.port === '55432' && databaseUrl.pathname === '/emr_test',
);

describe.skipIf(!isolatedDatabase)('CLS-03 isolated PostgreSQL integration', () => {
  const suffix = randomUUID();
  const service = new ClinicalServicesService(new PrismaClinicalServicesRepository());
  const controller = new ClinicalServicesController(service);
  const auth = new AuthService(new PrismaAuthRepository());
  const createdPermissionCodes: string[] = [];
  let permissionReadId: string;
  let permissionWriteId: string;
  let writerRoleId: string;
  let readerRoleId: string;
  let splitWriterRoleId: string;
  let writerAccountId: string;
  let splitAccountId: string;
  let employeeId: string;
  let splitEmployeeId: string;
  let patientId: string;
  let visitId: string;
  let foreignVisitId: string;
  let orderId: string;
  let foreignOrderId: string;
  let writerActor: AuthActor;
  let splitRoleActor: AuthActor;
  const sessionTokens: string[] = [];

  async function createSession(accountId: string): Promise<AuthActor> {
    const token = randomBytes(32).toString('base64url');
    const tokenHash = hashSessionToken(token);
    sessionTokens.push(tokenHash);
    await prisma.refreshToken.create({
      data: { accountId, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    const actor = await auth.getSession(token);
    if (!actor) throw new Error('Synthetic integration session could not be established.');
    return actor;
  }

  beforeAll(async () => {
    if (!isolatedDatabase) return;

    const readPermission = await prisma.permission.findUnique({ where: { code: 'IMAGE_READ' }, select: { id: true } })
      ?? await prisma.permission.create({ data: { code: 'IMAGE_READ' }, select: { id: true } }).then((created) => {
        createdPermissionCodes.push('IMAGE_READ'); return created;
      });
    const writePermission = await prisma.permission.findUnique({ where: { code: 'IMAGE_WRITE' }, select: { id: true } })
      ?? await prisma.permission.create({ data: { code: 'IMAGE_WRITE' }, select: { id: true } }).then((created) => {
        createdPermissionCodes.push('IMAGE_WRITE'); return created;
      });
    if (!readPermission || !writePermission) throw new Error('Synthetic image permissions were not available in the isolated test database.');
    permissionReadId = readPermission.id;
    permissionWriteId = writePermission.id;

    const writerRole = await prisma.role.create({ data: { name: `Synthetic CLS03 writer ${suffix}` }, select: { id: true } });
    const readerRole = await prisma.role.create({ data: { name: `Synthetic CLS03 reader ${suffix}` }, select: { id: true } });
    const splitWriteRole = await prisma.role.create({ data: { name: `Synthetic CLS03 split writer ${suffix}` }, select: { id: true } });
    writerRoleId = writerRole.id;
    readerRoleId = readerRole.id;
    splitWriterRoleId = splitWriteRole.id;
    await prisma.rolePermission.createMany({ data: [
      { roleId: writerRoleId, permissionId: permissionReadId },
      { roleId: writerRoleId, permissionId: permissionWriteId },
      { roleId: readerRoleId, permissionId: permissionReadId },
      { roleId: splitWriterRoleId, permissionId: permissionWriteId },
    ] });

    const hash = await hashNewPassword(randomBytes(32).toString('hex'));
    const writer = await prisma.account.create({ data: {
      username: `synthetic-cls03-writer-${suffix}`, passwordHash: hash,
      roles: { create: { roleId: writerRoleId } },
    }, select: { id: true } });
    const split = await prisma.account.create({ data: {
      username: `synthetic-cls03-split-${suffix}`, passwordHash: hash,
      roles: { create: [{ roleId: readerRoleId }, { roleId: splitWriterRoleId }] },
    }, select: { id: true } });
    writerAccountId = writer.id;
    splitAccountId = split.id;

    const employees = await Promise.all([
      prisma.employee.create({ data: { accountId: writerAccountId, employeeCode: `CLS03_${suffix}`, fullName: 'Synthetic CLS03 Writer' }, select: { id: true } }),
      prisma.employee.create({ data: { accountId: splitAccountId, employeeCode: `CLS03_SPLIT_${suffix}`, fullName: 'Synthetic CLS03 Split Role' }, select: { id: true } }),
    ]);
    employeeId = employees[0].id;
    splitEmployeeId = employees[1].id;
    const patient = await prisma.patient.create({ data: { patientCode: `CLS03_${suffix}`, fullName: 'Synthetic CLS03 Patient' }, select: { id: true } });
    patientId = patient.id;
    const visits = await Promise.all([
      prisma.visit.create({ data: { patientId, employeeId, status: 'CLS03_TEST_ONLY' }, select: { id: true } }),
      prisma.visit.create({ data: { patientId, employeeId: splitEmployeeId, status: 'CLS03_TEST_ONLY' }, select: { id: true } }),
    ]);
    visitId = visits[0].id;
    foreignVisitId = visits[1].id;
    const orders = await Promise.all([
      prisma.clinicalOrder.create({ data: { visitId, type: 'CLS03_TEST_ONLY', status: 'CLS03_TEST_ONLY' }, select: { id: true } }),
      prisma.clinicalOrder.create({ data: { visitId: foreignVisitId, type: 'CLS03_TEST_ONLY', status: 'CLS03_TEST_ONLY' }, select: { id: true } }),
    ]);
    orderId = orders[0].id;
    foreignOrderId = orders[1].id;
    writerActor = await createSession(writerAccountId);
    splitRoleActor = await createSession(splitAccountId);
  });

  afterAll(async () => {
    if (!isolatedDatabase) return;
    if (orderId || foreignOrderId) {
      const orderIds = [orderId, foreignOrderId].filter(Boolean);
      await prisma.imagingResult.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.clinicalOrder.deleteMany({ where: { id: { in: orderIds } } });
    }
    if (visitId || foreignVisitId) await prisma.visit.deleteMany({ where: { id: { in: [visitId, foreignVisitId].filter(Boolean) } } });
    if (patientId) await prisma.patient.deleteMany({ where: { id: patientId } });
    if (sessionTokens.length) await prisma.refreshToken.deleteMany({ where: { tokenHash: { in: sessionTokens } } });
    if (writerAccountId || splitAccountId) {
      const accountIds = [writerAccountId, splitAccountId].filter(Boolean);
      await prisma.accountRole.deleteMany({ where: { accountId: { in: accountIds } } });
    }
    if (employeeId || splitEmployeeId) await prisma.employee.deleteMany({ where: { id: { in: [employeeId, splitEmployeeId].filter(Boolean) } } });
    if (writerAccountId || splitAccountId) await prisma.account.deleteMany({ where: { id: { in: [writerAccountId, splitAccountId].filter(Boolean) } } });
    const roleIds = [writerRoleId, readerRoleId, splitWriterRoleId].filter(Boolean);
    if (roleIds.length) {
      await prisma.rolePermission.deleteMany({ where: { roleId: { in: roleIds } } });
      await prisma.role.deleteMany({ where: { id: { in: roleIds } } });
    }
    if (createdPermissionCodes.length) await prisma.permission.deleteMany({ where: { code: { in: createdPermissionCodes } } });
  });

  it('reads only assigned orders, creates and reads a result, then updates it', async () => {
    const visible = await service.getImagingOrders(writerActor);
    expect(visible.map(({ id }) => id)).toContain(orderId);
    expect(visible.map(({ id }) => id)).not.toContain(foreignOrderId);

    const created = await service.createImagingResult(writerActor, {
      orderId, imagingType: 'Synthetic imaging type', conclusion: 'Synthetic conclusion for integration only',
    });
    const resultId = created.imagingResults.at(-1)?.id;
    expect(resultId).toBeTruthy();
    expect(created.imagingResults.at(-1)).toMatchObject({ imagingType: 'Synthetic imaging type', conclusion: 'Synthetic conclusion for integration only', fileUrl: null });

    const reread = await service.getImagingOrder(writerActor, orderId);
    expect(reread.imagingResults.some(({ id }) => id === resultId)).toBe(true);
    const updated = await service.updateImagingResult(writerActor, {
      resultId: resultId!, imagingType: 'Synthetic updated imaging type', conclusion: 'Synthetic updated conclusion',
    });
    expect(updated.imagingResults.find(({ id }) => id === resultId)).toMatchObject({
      imagingType: 'Synthetic updated imaging type', conclusion: 'Synthetic updated conclusion',
    });
  });

  it('rejects a different Visit and an order that does not exist', async () => {
    await expect(service.getImagingOrder(writerActor, foreignOrderId)).rejects.toThrow('CLINICAL_ORDER_NOT_FOUND');
    await expect(service.createImagingResult(writerActor, {
      orderId: 'missing-cls03-order', imagingType: 'Synthetic', conclusion: 'Synthetic',
    })).rejects.toThrow('CLINICAL_ORDER_NOT_FOUND');
  });

  it('does not combine read and write permission across separate roles', async () => {
    await expect(service.createImagingResult(splitRoleActor, {
      orderId: foreignOrderId, imagingType: 'Synthetic', conclusion: 'Synthetic',
    })).rejects.toThrow('IMAGING_ACCESS_DENIED');
    expect((await service.getImagingOrders(splitRoleActor)).map(({ id }) => id)).toContain(foreignOrderId);
  });

  it('does not mutate a result when validation fails or the result is outside scope', async () => {
    const before = await prisma.imagingResult.findMany({ where: { orderId }, select: { id: true, conclusion: true } });
    expect(() => controller.createImagingResult(writerActor, {
      orderId, imagingType: '', conclusion: 'Synthetic invalid payload',
    })).toThrow();
    const afterInvalid = await prisma.imagingResult.findMany({ where: { orderId }, select: { id: true, conclusion: true } });
    expect(afterInvalid).toEqual(before);
    const foreignResult = await prisma.imagingResult.create({ data: {
      orderId: foreignOrderId, imagingType: 'Synthetic foreign result', conclusion: 'Synthetic only',
    }, select: { id: true } });
    await expect(service.updateImagingResult(writerActor, {
      resultId: foreignResult.id, imagingType: 'Synthetic', conclusion: 'Out of scope',
    })).rejects.toThrow('IMAGING_RESULT_NOT_FOUND');
    const unchanged = await prisma.imagingResult.findUniqueOrThrow({ where: { id: foreignResult.id }, select: { conclusion: true } });
    expect(unchanged.conclusion).toBe('Synthetic only');
  });
});
