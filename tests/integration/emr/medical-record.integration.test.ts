import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/infrastructure/database/prisma';
import { PrismaAuthRepository } from '@/infrastructure/database/repositories/PrismaAuthRepository';
import { PrismaEmrRepository } from '@/infrastructure/database/repositories/PrismaEmrRepository';
import { DELETE as authDelete, GET as authGet, POST as authPost } from '@/app/api/auth/route';
import { AuthorizationService } from '@/server/policies/AuthorizationService';
import { AuthService, hashNewPassword, hashSessionToken } from '@/server/services/AuthService';

const databaseUrl = (() => {
  try { return new URL(process.env.DATABASE_URL ?? ''); } catch { return null; }
})();
const isolatedDatabase = Boolean(
  databaseUrl &&
  ['127.0.0.1', 'localhost'].includes(databaseUrl.hostname) &&
  databaseUrl.port === '55432' &&
  databaseUrl.pathname === '/emr_test',
);
const repository = new PrismaEmrRepository();
const authRepository = new PrismaAuthRepository();
const rateLimitSecret = process.env.AUTH_RATE_LIMIT_SECRET ?? 'local-only-auth-integration-key-at-least-32-bytes';
const username = 'synthetic-emr-doctor-ui';
const accountData = { username, password: 'Synthetic-password-123!' };
const approvedRoleNames = ['Bác sĩ da liễu', 'Bác sĩ điều trị'];

let patientIds: string[] = [];
let visitIds: string[] = [];
const treatmentPlanIds: string[] = [];
const treatmentStageIds: string[] = [];
const treatmentSessionIds: string[] = [];
const treatmentImageIds: string[] = [];
let accountId: string;
let employeeId: string;
let otherEmployeeId: string;
let writeSessionId: string;
let writeSessionToken: string;
let roleId: string;
let permissionIds: string[] = [];
let createdRole = false;
let createdPermissions: string[] = [];
let createdRolePermissionIds: string[] = [];
const createdAdditionalRoles: string[] = [];
const createdAdditionalRolePermissions: Array<{ roleId: string; permissionId: string }> = [];
const additionalAccountIds: string[] = [];
const additionalEmployeeIds: string[] = [];
const matrixActors: Record<string, { accountId: string; employeeId: string; sessionId: string; sessionToken: string; visitId: string; roleName: string }> = {};
const matrixRoleIds: Record<string, string> = {};
let mixedRoleActor: { accountId: string; employeeId: string; sessionId: string; sessionToken: string; visitId: string };
let noEmployeeActor: { accountId: string; sessionToken: string };
let authFingerprint: string;
let rateLimitedUsername: string;
const additionalAuthFingerprints: string[] = [];

describe.skipIf(!isolatedDatabase)('Auth and EMR PostgreSQL isolated integration', () => {
  beforeAll(async () => {
    if (!databaseUrl) throw new Error('Set DATABASE_URL to the isolated local PostgreSQL test database.');
    const roleBefore = await prisma.role.findUnique({ where: { name: 'Bác sĩ da liễu' }, select: { id: true } });
    const role = await prisma.role.upsert({
      where: { name: 'Bác sĩ da liễu' }, create: { name: 'Bác sĩ da liễu' }, update: {},
    });
    roleId = role.id;
    createdRole = !roleBefore;

    for (const code of ['EMR_READ', 'EMR_WRITE']) {
      const permissionBefore = await prisma.permission.findUnique({ where: { code }, select: { id: true } });
      const permission = await prisma.permission.upsert({ where: { code }, create: { code }, update: {} });
      permissionIds.push(permission.id);
      if (!permissionBefore) createdPermissions.push(permission.id);

      const relationBefore = await prisma.rolePermission.findUnique({
        where: { roleId_permissionId: { roleId, permissionId: permission.id } }, select: { roleId: true },
      });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId: permission.id } },
        create: { roleId, permissionId: permission.id }, update: {},
      });
      if (!relationBefore) createdRolePermissionIds.push(permission.id);
    }

    const imagePermissionBefore = await prisma.permission.findUnique({ where: { code: 'IMAGE_READ' }, select: { id: true } });
    const imagePermission = await prisma.permission.upsert({ where: { code: 'IMAGE_READ' }, create: { code: 'IMAGE_READ' }, update: {} });
    if (!imagePermissionBefore) createdPermissions.push(imagePermission.id);
    const imageRelationBefore = await prisma.rolePermission.findUnique({
      where: { roleId_permissionId: { roleId, permissionId: imagePermission.id } }, select: { roleId: true },
    });
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId: imagePermission.id } },
      create: { roleId, permissionId: imagePermission.id }, update: {},
    });
    if (!imageRelationBefore) createdRolePermissionIds.push(imagePermission.id);

    const account = await prisma.account.create({
      data: { username, passwordHash: await bcrypt.hash(accountData.password, 12), status: 'ACTIVE' },
    });
    accountId = account.id;
    const employee = await prisma.employee.create({
      data: { accountId, employeeCode: `TEST-${randomUUID()}`, fullName: 'Synthetic EMR Doctor' },
    });
    employeeId = employee.id;
    const otherEmployee = await prisma.employee.create({
      data: { employeeCode: `TEST-${randomUUID()}`, fullName: 'Synthetic Other Doctor' },
    });
    otherEmployeeId = otherEmployee.id;
    await prisma.accountRole.create({ data: { accountId, roleId } });
    writeSessionToken = randomBytes(32).toString('base64url');
    const writeSession = await prisma.refreshToken.create({
      data: { accountId, tokenHash: hashSessionToken(writeSessionToken), expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    writeSessionId = writeSession.id;

    const firstPatient = await prisma.patient.create({
      data: { patientCode: `TEST-${randomUUID()}`, fullName: 'Synthetic EMR Patient One' },
    });
    const secondPatient = await prisma.patient.create({
      data: { patientCode: `TEST-${randomUUID()}`, fullName: 'Synthetic EMR Patient Two' },
    });
    patientIds = [firstPatient.id, secondPatient.id];

    const assignedVisit = await prisma.visit.create({
      data: { patientId: firstPatient.id, employeeId, status: 'INTEGRATION_TEST_ONLY' },
    });
    const unassignedVisit = await prisma.visit.create({
      data: { patientId: firstPatient.id, status: 'INTEGRATION_TEST_ONLY' },
    });
    const otherVisit = await prisma.visit.create({
      data: { patientId: secondPatient.id, employeeId: otherEmployeeId, status: 'INTEGRATION_TEST_ONLY' },
    });
    visitIds = [assignedVisit.id, unassignedVisit.id, otherVisit.id];

    const permissionIdByCode = new Map<string, string>([
      ['EMR_READ', permissionIds[0]],
      ['EMR_WRITE', permissionIds[1]],
    ]);
    const roleFixtures = [
      { key: 'treatingDoctor', roleName: 'Bác sĩ điều trị', permissions: ['EMR_READ', 'EMR_WRITE'] },
      { key: 'resident', roleName: 'Bác sĩ nội trú', permissions: ['EMR_READ'] },
      { key: 'consultant', roleName: 'Bác sĩ tư vấn', permissions: ['EMR_READ'] },
      { key: 'receptionist', roleName: 'Lễ tân', permissions: ['EMR_READ', 'EMR_WRITE'] },
      { key: 'accountant', roleName: 'Kế toán', permissions: ['EMR_WRITE'] },
      { key: 'customerCare', roleName: 'Chăm sóc khách hàng', permissions: ['EMR_WRITE'] },
      { key: 'pharmacist', roleName: 'Dược sĩ', permissions: ['EMR_READ', 'EMR_WRITE'] },
      { key: 'inventoryManager', roleName: 'Quản lý kho', permissions: ['EMR_READ', 'EMR_WRITE'] },
    ];

    for (const fixture of roleFixtures) {
      const roleBefore = await prisma.role.findUnique({ where: { name: fixture.roleName }, select: { id: true } });
      const fixtureRole = await prisma.role.upsert({
        where: { name: fixture.roleName }, create: { name: fixture.roleName }, update: {},
      });
      matrixRoleIds[fixture.key] = fixtureRole.id;
      if (!roleBefore) createdAdditionalRoles.push(fixtureRole.id);

      for (const code of fixture.permissions) {
        const permissionId = permissionIdByCode.get(code);
        if (!permissionId) throw new Error(`Missing synthetic permission ${code}.`);
        const relationBefore = await prisma.rolePermission.findUnique({
          where: { roleId_permissionId: { roleId: fixtureRole.id, permissionId } }, select: { roleId: true },
        });
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: fixtureRole.id, permissionId } },
          create: { roleId: fixtureRole.id, permissionId }, update: {},
        });
        if (!relationBefore) createdAdditionalRolePermissions.push({ roleId: fixtureRole.id, permissionId });
      }

      const fixtureAccount = await prisma.account.create({
        data: { username: `synthetic-${fixture.key}`, passwordHash: await bcrypt.hash(accountData.password, 12), status: 'ACTIVE' },
      });
      additionalAccountIds.push(fixtureAccount.id);
      const fixtureEmployee = await prisma.employee.create({
        data: { accountId: fixtureAccount.id, employeeCode: `TEST-${randomUUID()}`, fullName: `Synthetic ${fixture.roleName}` },
      });
      additionalEmployeeIds.push(fixtureEmployee.id);
      await prisma.accountRole.create({ data: { accountId: fixtureAccount.id, roleId: fixtureRole.id } });
      const fixtureToken = randomBytes(32).toString('base64url');
      const fixtureSession = await prisma.refreshToken.create({
        data: { accountId: fixtureAccount.id, tokenHash: hashSessionToken(fixtureToken), expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
      });
      const fixtureVisit = await prisma.visit.create({
        data: { patientId: firstPatient.id, employeeId: fixtureEmployee.id, status: 'INTEGRATION_TEST_ONLY' },
      });
      visitIds.push(fixtureVisit.id);
      matrixActors[fixture.key] = {
        accountId: fixtureAccount.id,
        employeeId: fixtureEmployee.id,
        sessionId: fixtureSession.id,
        sessionToken: fixtureToken,
        visitId: fixtureVisit.id,
        roleName: fixture.roleName,
      };
    }

    const residentRoleId = matrixRoleIds.resident;
    const receptionistRoleId = matrixRoleIds.receptionist;
    const mixedAccount = await prisma.account.create({
      data: { username: `synthetic-mixed-${randomUUID()}`, passwordHash: await bcrypt.hash(accountData.password, 12), status: 'ACTIVE' },
    });
    additionalAccountIds.push(mixedAccount.id);
    const mixedEmployee = await prisma.employee.create({
      data: { accountId: mixedAccount.id, employeeCode: `TEST-${randomUUID()}`, fullName: 'Synthetic Mixed Role' },
    });
    additionalEmployeeIds.push(mixedEmployee.id);
    await prisma.accountRole.createMany({ data: [
      { accountId: mixedAccount.id, roleId: residentRoleId },
      { accountId: mixedAccount.id, roleId: receptionistRoleId },
    ] });
    const mixedToken = randomBytes(32).toString('base64url');
    const mixedSession = await prisma.refreshToken.create({
      data: { accountId: mixedAccount.id, tokenHash: hashSessionToken(mixedToken), expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    const mixedVisit = await prisma.visit.create({
      data: { patientId: patientIds[0], employeeId: mixedEmployee.id, status: 'INTEGRATION_TEST_ONLY' },
    });
    visitIds.push(mixedVisit.id);
    mixedRoleActor = {
      accountId: mixedAccount.id,
      employeeId: mixedEmployee.id,
      sessionId: mixedSession.id,
      sessionToken: mixedToken,
      visitId: mixedVisit.id,
    };

    const unlinkedAccount = await prisma.account.create({
      data: { username: `synthetic-no-employee-${randomUUID()}`, passwordHash: await bcrypt.hash(accountData.password, 12), status: 'ACTIVE' },
    });
    additionalAccountIds.push(unlinkedAccount.id);
    await prisma.accountRole.create({ data: { accountId: unlinkedAccount.id, roleId } });
    const unlinkedToken = randomBytes(32).toString('base64url');
    await prisma.refreshToken.create({
      data: { accountId: unlinkedAccount.id, tokenHash: hashSessionToken(unlinkedToken), expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    noEmployeeActor = { accountId: unlinkedAccount.id, sessionToken: unlinkedToken };

    rateLimitedUsername = 'synthetic-rate-limit-e2e';
    const rateLimitedAccount = await prisma.account.create({
      data: { username: rateLimitedUsername, passwordHash: await bcrypt.hash(accountData.password, 12), status: 'ACTIVE' },
    });
    additionalAccountIds.push(rateLimitedAccount.id);
    additionalAuthFingerprints.push(`login:${createHmac('sha256', rateLimitSecret).update(rateLimitedUsername).digest('hex')}`);

    authFingerprint = `login:${createHmac('sha256', rateLimitSecret).update(username).digest('hex')}`;
  }, 60_000);

  afterAll(async () => {
    if (process.env.EMR_IT_KEEP_FIXTURES === 'true') {
      await prisma.$disconnect();
      return;
    }
    if (treatmentImageIds.length) await prisma.treatmentImage.deleteMany({ where: { id: { in: treatmentImageIds } } });
    if (treatmentSessionIds.length) await prisma.treatmentSession.deleteMany({ where: { id: { in: treatmentSessionIds } } });
    if (treatmentStageIds.length) await prisma.treatmentStage.deleteMany({ where: { id: { in: treatmentStageIds } } });
    if (treatmentPlanIds.length) await prisma.treatmentPlan.deleteMany({ where: { id: { in: treatmentPlanIds } } });
    if (visitIds.length) await prisma.medicalRecord.deleteMany({ where: { visitId: { in: visitIds } } });
    if (visitIds.length) await prisma.visit.deleteMany({ where: { id: { in: visitIds } } });
    if (patientIds.length) await prisma.patient.deleteMany({ where: { id: { in: patientIds } } });
    if (accountId) {
      await prisma.refreshToken.deleteMany({ where: { accountId } });
      await prisma.accountRole.deleteMany({ where: { accountId } });
    }
    if (additionalAccountIds.length) {
      await prisma.refreshToken.deleteMany({ where: { accountId: { in: additionalAccountIds } } });
      await prisma.accountRole.deleteMany({ where: { accountId: { in: additionalAccountIds } } });
    }
    if (additionalEmployeeIds.length) await prisma.employee.deleteMany({ where: { id: { in: additionalEmployeeIds } } });
    if (additionalAccountIds.length) await prisma.account.deleteMany({ where: { id: { in: additionalAccountIds } } });
    if (otherEmployeeId) await prisma.employee.deleteMany({ where: { id: otherEmployeeId } });
    if (employeeId) await prisma.employee.deleteMany({ where: { id: employeeId } });
    if (accountId) await prisma.account.deleteMany({ where: { id: accountId } });
    if (authFingerprint) {
      await prisma.auditLog.deleteMany({ where: { entity: 'AUTH', entityId: authFingerprint } });
    }
    if (additionalAuthFingerprints.length) {
      await prisma.auditLog.deleteMany({ where: { entity: 'AUTH', entityId: { in: additionalAuthFingerprints } } });
    }
    if (createdRolePermissionIds.length) {
      await prisma.rolePermission.deleteMany({ where: { roleId, permissionId: { in: createdRolePermissionIds } } });
    }
    for (const relation of createdAdditionalRolePermissions) {
      await prisma.rolePermission.deleteMany({ where: { roleId: relation.roleId, permissionId: relation.permissionId } });
    }
    if (createdPermissions.length) await prisma.permission.deleteMany({ where: { id: { in: createdPermissions } } });
    if (createdAdditionalRoles.length) await prisma.role.deleteMany({ where: { id: { in: createdAdditionalRoles } } });
    if (createdRole) await prisma.role.deleteMany({ where: { id: roleId } });
    await prisma.$disconnect();
  }, 60_000);

  it('authenticates synthetic account and revokes the server-side session on logout', async () => {
    const service = new AuthService(authRepository, rateLimitSecret);
    expect(await service.login(username, 'wrong-password')).toEqual({ kind: 'invalid' });
    const login = await service.login(username, accountData.password);
    expect(login.kind).toBe('authenticated');
    if (login.kind !== 'authenticated') return;

    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hashSessionToken(login.token) } });
    expect(stored?.tokenHash).toBe(hashSessionToken(login.token));
    expect(stored?.tokenHash).not.toBe(login.token);
    expect((await service.getSession(login.token))?.employeeId).toBe(employeeId);
    await service.logout(login.token);
    expect(await service.getSession(login.token)).toBeNull();
  });

  it('accepts a verified Argon2id password and rejects an account marked INACTIVE', async () => {
    const argonUsername = 'synthetic-argon-http';
    additionalAuthFingerprints.push(`login:${createHmac('sha256', rateLimitSecret).update(argonUsername).digest('hex')}`);
    const argonPassword = 'Synthetic-argon-password-123!';
    const argonAccount = await prisma.account.create({
      data: { username: argonUsername, passwordHash: await hashNewPassword(argonPassword), status: 'ACTIVE' },
    });
    additionalAccountIds.push(argonAccount.id);

    const service = new AuthService(authRepository, rateLimitSecret);
    expect((await service.login(argonUsername, argonPassword)).kind).toBe('authenticated');
    await prisma.account.update({ where: { id: argonAccount.id }, data: { status: 'INACTIVE' } });
    expect(await service.login(argonUsername, argonPassword)).toEqual({ kind: 'invalid' });
  });

  it('limits concurrent failed logins to five attempts in the rolling window', async () => {
    const service = new AuthService(authRepository, rateLimitSecret);
    const results = await Promise.all(Array.from({ length: 6 }, () => service.login(rateLimitedUsername, 'wrong-password')));
    expect(results.filter((result) => result.kind === 'invalid')).toHaveLength(5);
    expect(results.filter((result) => result.kind === 'rate-limited')).toHaveLength(1);
  });

  it('serves login, session and logout through the real Auth route handlers with secure cookie attributes', async () => {
    const loginResponse = await authPost(new NextRequest('https://localhost/api/auth', {
      method: 'POST',
      headers: { origin: 'https://localhost', host: 'localhost', 'content-type': 'application/json' },
      body: JSON.stringify(accountData),
    }));
    expect(loginResponse.status).toBe(200);
    const setCookie = loginResponse.headers.get('set-cookie') ?? '';
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/Secure/i);
    expect(setCookie).toMatch(/SameSite=lax/i);
    expect(setCookie).toMatch(/Max-Age=28800/i);
    const token = setCookie.match(/clinic_session=([^;]+)/)?.[1];
    expect(token).toBeTruthy();
    if (!token) throw new Error('Auth route did not set the session cookie.');

    const sessionResponse = await authGet(new NextRequest('https://localhost/api/auth', {
      headers: { cookie: `clinic_session=${token}` },
    }));
    expect(sessionResponse.status).toBe(200);
    expect(await sessionResponse.json()).toMatchObject({ success: true, user: { username } });

    const crossOrigin = await authPost(new NextRequest('https://localhost/api/auth', {
      method: 'POST',
      headers: { origin: 'https://attacker.example', host: 'localhost', 'content-type': 'application/json' },
      body: JSON.stringify(accountData),
    }));
    expect(crossOrigin.status).toBe(403);

    const logoutResponse = await authDelete(new NextRequest('https://localhost/api/auth', {
      method: 'DELETE',
      headers: { origin: 'https://localhost', host: 'localhost', cookie: `clinic_session=${token}` },
    }));
    expect(logoutResponse.status).toBe(200);
    const afterLogout = await authGet(new NextRequest('https://localhost/api/auth', {
      headers: { cookie: `clinic_session=${token}` },
    }));
    expect(await afterLogout.json()).toMatchObject({ success: true, user: null });
  });

  it('filters patient search and detail to the employee-assigned Visit only', async () => {
    const patients = await repository.findManyForEmployee(employeeId, 'Synthetic EMR');
    expect(patients.map((patient: { id: string }) => patient.id)).toContain(patientIds[0]);
    expect(patients.map((patient: { id: string }) => patient.id)).not.toContain(patientIds[1]);

    const detail = await repository.getPatientFullEMRForEmployee(patientIds[0], employeeId);
    expect(detail?.visits.map((visit: { id: string }) => visit.id)).toEqual([visitIds[0]]);
    expect(detail).not.toHaveProperty('allergies');
    expect(detail).not.toHaveProperty('histories');
  });

  it('loads the examination Visit through a valid session and denies unassigned and cross-assigned Visit ids', async () => {
    const actor = { accountId, employeeId, sessionId: writeSessionId };
    const assigned = await repository.getAssignedVisitForEmployee(visitIds[0], actor, {
      prescriptions: false, treatmentPlans: false, clinicalOrders: true,
    });
    expect(assigned?.id).toBe(visitIds[0]);
    expect(assigned?.patient.id).toBe(patientIds[0]);
    expect(assigned).toHaveProperty('medicalRecord');
    expect(assigned).toHaveProperty('orders');
    expect(await repository.getAssignedVisitForEmployee(visitIds[1], actor)).toBeNull();
    expect(await repository.getAssignedVisitForEmployee(visitIds[2], actor)).toBeNull();
  });

  it('returns only assigned and internally consistent TreatmentImage metadata for timeline, details, filters and comparison', async () => {
    const secondAssignedVisit = await prisma.visit.create({ data: { patientId: patientIds[0], employeeId, status: 'INTEGRATION_TEST_ONLY' } });
    visitIds.push(secondAssignedVisit.id);
    const planOne = await prisma.treatmentPlan.create({ data: { patientId: patientIds[0], visitId: visitIds[0], name: 'Synthetic plan one', status: 'INTEGRATION_TEST_ONLY', version: 1, createdById: employeeId } });
    const stageOne = await prisma.treatmentStage.create({ data: { planId: planOne.id, stageType: 'INTEGRATION_TEST_ONLY', name: 'Synthetic stage one', orderNo: 1, status: 'INTEGRATION_TEST_ONLY' } });
    const sessionOne = await prisma.treatmentSession.create({ data: { stageId: stageOne.id, visitId: visitIds[0], sessionNo: 1, status: 'INTEGRATION_TEST_ONLY' } });
    const planTwo = await prisma.treatmentPlan.create({ data: { patientId: patientIds[0], visitId: secondAssignedVisit.id, name: 'Synthetic plan two', status: 'INTEGRATION_TEST_ONLY', version: 1, createdById: employeeId } });
    const stageTwo = await prisma.treatmentStage.create({ data: { planId: planTwo.id, stageType: 'INTEGRATION_TEST_ONLY', name: 'Synthetic stage two', orderNo: 1, status: 'INTEGRATION_TEST_ONLY' } });
    const sessionTwo = await prisma.treatmentSession.create({ data: { stageId: stageTwo.id, visitId: secondAssignedVisit.id, sessionNo: 2, status: 'INTEGRATION_TEST_ONLY' } });
    treatmentPlanIds.push(planOne.id, planTwo.id);
    treatmentStageIds.push(stageOne.id, stageTwo.id);
    treatmentSessionIds.push(sessionOne.id, sessionTwo.id);

    const oldCapture = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const recentCapture = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const firstImage = await prisma.treatmentImage.create({ data: { planId: planOne.id, sessionId: sessionOne.id, visitId: visitIds[0], imageUrl: 'synthetic://test-image-one', imageType: 'SYNTHETIC_TEST', phase: 'BEFORE_TEST', bodyArea: 'synthetic-area', description: 'Synthetic metadata only', capturedAt: oldCapture, capturedById: employeeId } });
    const secondImage = await prisma.treatmentImage.create({ data: { planId: planTwo.id, visitId: secondAssignedVisit.id, imageUrl: 'synthetic://test-image-two', imageType: 'SYNTHETIC_TEST', phase: 'AFTER_TEST', bodyArea: 'synthetic-area', capturedAt: recentCapture } });
    const inconsistentImage = await prisma.treatmentImage.create({ data: { planId: planOne.id, sessionId: sessionTwo.id, visitId: secondAssignedVisit.id, imageUrl: 'synthetic://inconsistent-link', imageType: 'SYNTHETIC_TEST', phase: 'INVALID_TEST', bodyArea: 'synthetic-area', capturedAt: new Date() } });
    treatmentImageIds.push(firstImage.id, secondImage.id, inconsistentImage.id);

    const actor = { accountId, employeeId, sessionId: writeSessionId };
    const timeline = await repository.getTreatmentImageTimelineForEmployee(patientIds[0], actor);
    expect(timeline.map((image) => image.id)).toEqual([secondImage.id, firstImage.id]);
    expect(timeline.every((image) => !('imageUrl' in image))).toBe(true);
    expect(timeline.find((image) => image.id === firstImage.id)?.plan.name).toBe('Synthetic plan one');
    expect(timeline.find((image) => image.id === firstImage.id)?.session?.sessionNo).toBe(1);

    const filtered = await repository.getTreatmentImageTimelineForEmployee(patientIds[0], actor, { phase: 'BEFORE_TEST', from: oldCapture.toISOString() });
    expect(filtered.map((image) => image.id)).toEqual([firstImage.id]);
    await expect(repository.getTreatmentImageDetailsForEmployee(patientIds[0], firstImage.id, actor)).resolves.toMatchObject({ id: firstImage.id });
    await expect(repository.getTreatmentImageDetailsForEmployee(patientIds[1], firstImage.id, actor)).resolves.toBeNull();
    await expect(repository.getTreatmentImageDetailsForEmployee(patientIds[0], inconsistentImage.id, actor)).resolves.toBeNull();
    await expect(repository.getTreatmentImagesForComparison(patientIds[0], [firstImage.id, secondImage.id], actor)).resolves.toHaveLength(2);
    await expect(repository.getTreatmentImagesForComparison(patientIds[1], [firstImage.id, secondImage.id], actor)).resolves.toBeNull();

    const revokedImageSession = await prisma.refreshToken.create({
      data: { accountId, tokenHash: hashSessionToken(randomBytes(32).toString('base64url')), expiresAt: new Date(Date.now() + 60 * 60 * 1000), revokedAt: new Date() },
    });
    await expect(repository.getTreatmentImageTimelineForEmployee(patientIds[0], { ...actor, sessionId: revokedImageSession.id })).resolves.toEqual([]);
  });

  it('creates, reads, updates and rejects duplicate MedicalRecord writes on an assigned Visit', async () => {
    const actor = { accountId, employeeId, sessionId: writeSessionId };
    const created = await repository.saveMedicalRecord(
      visitIds[0], actor, approvedRoleNames,
      { preliminaryDiagnosis: 'Synthetic preliminary', finalDiagnosis: '', notes: 'Synthetic note' }, null,
    );
    expect(created.visitId).toBe(visitIds[0]);

    const loaded = await repository.getPatientFullEMRForEmployee(patientIds[0], employeeId);
    expect(loaded?.visits.find((visit: { id: string }) => visit.id === visitIds[0])?.medicalRecord).toMatchObject({
      preliminaryDiagnosis: 'Synthetic preliminary', finalDiagnosis: '', notes: 'Synthetic note',
    });
    const current = loaded?.visits.find((visit: { id: string }) => visit.id === visitIds[0])?.medicalRecord;
    if (!current) throw new Error('Synthetic MedicalRecord was not returned.');

    const updated = await repository.saveMedicalRecord(visitIds[0], actor, approvedRoleNames, { notes: 'Updated synthetic note' }, {
      preliminaryDiagnosis: current.preliminaryDiagnosis,
      finalDiagnosis: current.finalDiagnosis,
      notes: current.notes,
    });
    expect(updated.notes).toBe('Updated synthetic note');
    await expect(repository.saveMedicalRecord(visitIds[0], actor, approvedRoleNames, {}, null)).rejects.toThrow(
      'Bệnh án đã được tạo ở nơi khác',
    );
  });

  it('denies unassigned and cross-patient Visits even when the actor has EMR_WRITE', async () => {
    const actor = { accountId, employeeId, sessionId: writeSessionId };
    await expect(repository.saveMedicalRecord(visitIds[1], actor, approvedRoleNames, { notes: 'Synthetic' }, null)).rejects.toThrow('EMR access denied');
    await expect(repository.saveMedicalRecord(visitIds[2], actor, approvedRoleNames, { notes: 'Synthetic' }, null)).rejects.toThrow('EMR access denied');
    expect(await repository.getPatientFullEMRForEmployee(patientIds[1], employeeId)).toBeNull();
  });

  it('enforces the approved RBAC matrix against live RolePermission rows and assigned Visits', async () => {
    const service = new AuthService(authRepository, rateLimitSecret);
    const authorization = new AuthorizationService();
    const expected: Record<string, { read: boolean; write: boolean }> = {
      treatingDoctor: { read: true, write: true },
      resident: { read: true, write: false },
      consultant: { read: true, write: false },
      receptionist: { read: false, write: false },
      accountant: { read: false, write: false },
      customerCare: { read: false, write: false },
      pharmacist: { read: false, write: false },
      inventoryManager: { read: false, write: false },
    };

    for (const [key, policy] of Object.entries(expected)) {
      const fixture = matrixActors[key];
      const actor = await service.getSession(fixture.sessionToken);
      expect(actor?.employeeId).toBe(fixture.employeeId);
      expect(authorization.hasPermission(actor!, 'EMR_READ')).toBe(policy.read);
      expect(authorization.hasPermission(actor!, 'EMR_WRITE')).toBe(policy.write);

      if (policy.read) {
        const detail = await repository.getPatientFullEMRForEmployee(patientIds[0], fixture.employeeId);
        expect(detail?.visits.map((visit: { id: string }) => visit.id)).toEqual([fixture.visitId]);
      }
      if (policy.write) {
        const saved = await repository.saveMedicalRecord(
          fixture.visitId,
          { accountId: actor!.accountId, employeeId: actor!.employeeId!, sessionId: actor!.sessionId },
          authorization.allowedRoleNames('EMR_WRITE'),
          { notes: `Synthetic authorized note ${key}` },
          null,
        );
        expect(saved.visitId).toBe(fixture.visitId);
      } else {
        await expect(repository.saveMedicalRecord(
          fixture.visitId,
          { accountId: actor!.accountId, employeeId: fixture.employeeId, sessionId: actor!.sessionId },
          authorization.allowedRoleNames('EMR_WRITE'),
          { notes: `Synthetic denied note ${key}` },
          null,
        )).rejects.toThrow('EMR access denied');
      }
    }

    const mixed = await service.getSession(mixedRoleActor.sessionToken);
    expect(mixed?.roleNames).toHaveLength(2);
    expect(authorization.hasPermission(mixed!, 'EMR_READ')).toBe(true);
    expect(authorization.hasPermission(mixed!, 'EMR_WRITE')).toBe(false);
    await expect(repository.saveMedicalRecord(
      mixedRoleActor.visitId,
      { accountId: mixedRoleActor.accountId, employeeId: mixedRoleActor.employeeId, sessionId: mixedRoleActor.sessionId },
      authorization.allowedRoleNames('EMR_WRITE'),
      { notes: 'Synthetic cross-role escalation attempt' },
      null,
    )).rejects.toThrow('EMR access denied');

    const unlinked = await service.getSession(noEmployeeActor.sessionToken);
    expect(unlinked?.employeeId).toBeNull();
    expect(authorization.hasPermission(unlinked!, 'EMR_READ')).toBe(false);
    expect(await repository.getPatientFullEMRForEmployee(patientIds[0], unlinked?.employeeId ?? '')).toBeNull();
  });

  it('serializes concurrent MedicalRecord creation so only one record can be created', async () => {
    const fixture = matrixActors.treatingDoctor;
    const raceVisit = await prisma.visit.create({
      data: { patientId: patientIds[0], employeeId: fixture.employeeId, status: 'INTEGRATION_TEST_ONLY' },
    });
    visitIds.push(raceVisit.id);
    const actor = await new AuthService(authRepository, rateLimitSecret).getSession(fixture.sessionToken);
    if (!actor?.employeeId) throw new Error('Synthetic treating doctor session was not valid.');
    const attempts = await Promise.allSettled([
      repository.saveMedicalRecord(raceVisit.id, { accountId: actor.accountId, employeeId: actor.employeeId, sessionId: actor.sessionId }, approvedRoleNames, { notes: 'Synthetic concurrent write A' }, null),
      repository.saveMedicalRecord(raceVisit.id, { accountId: actor.accountId, employeeId: actor.employeeId, sessionId: actor.sessionId }, approvedRoleNames, { notes: 'Synthetic concurrent write B' }, null),
    ]);
    expect(attempts.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(attempts.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(await prisma.medicalRecord.count({ where: { visitId: raceVisit.id } })).toBe(1);
  });

  it('denies an account after it is disabled and rejects a session that has expired', async () => {
    const service = new AuthService(authRepository, rateLimitSecret);
    await prisma.account.update({ where: { id: accountId }, data: { status: 'INACTIVE' } });
    expect(await service.login(username, accountData.password)).toEqual({ kind: 'invalid' });
    await prisma.account.update({ where: { id: accountId }, data: { status: 'ACTIVE' } });

    const expiredToken = randomUUID().replaceAll('-', '').padEnd(43, 'x').slice(0, 43);
    const expiredHash = hashSessionToken(expiredToken);
    await prisma.refreshToken.create({
      data: { accountId, tokenHash: expiredHash, expiresAt: new Date(Date.now() - 60_000) },
    });
    expect(await service.getSession(expiredToken)).toBeNull();
  });

  it('enforces idle and absolute expiration and rechecks revoked session before an EMR write', async () => {
    const service = new AuthService(authRepository, rateLimitSecret);
    const idleSession = matrixActors.resident;
    await prisma.refreshToken.update({
      where: { id: idleSession.sessionId },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });
    expect(await service.getSession(idleSession.sessionToken)).toBeNull();

    const absoluteSession = matrixActors.consultant;
    await prisma.refreshToken.update({
      where: { id: absoluteSession.sessionId },
      data: { createdAt: new Date(Date.now() - 9 * 60 * 60 * 1000), expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    expect(await service.getSession(absoluteSession.sessionToken)).toBeNull();

    await prisma.refreshToken.update({ where: { id: writeSessionId }, data: { revokedAt: new Date() } });
    expect(await service.getSession(writeSessionToken)).toBeNull();
    await expect(repository.saveMedicalRecord(
      visitIds[0],
      { accountId, employeeId, sessionId: writeSessionId },
      approvedRoleNames,
      { notes: 'Synthetic revoked-session write attempt' },
      null,
    )).rejects.toThrow('EMR access denied');
  });
});
