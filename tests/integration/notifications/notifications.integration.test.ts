import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/infrastructure/database/prisma';
import { PrismaAuthRepository } from '@/infrastructure/database/repositories/PrismaAuthRepository';
import { PrismaNotificationsRepository } from '@/infrastructure/database/repositories/PrismaNotificationsRepository';
import { NotificationsService } from '@/server/services/NotificationsService';
import { AuthService } from '@/server/services/AuthService';
import { NextRequest } from 'next/server';
import { GET as notificationsGet } from '@/app/api/notifications/route';

const databaseUrl = (() => {
  try { return new URL(process.env.DATABASE_URL ?? ''); } catch { return null; }
})();
const isolatedDatabase = Boolean(databaseUrl
  && ['127.0.0.1', 'localhost'].includes(databaseUrl.hostname)
  && databaseUrl.port === '55432'
  && databaseUrl.pathname === '/emr_test');

describe.skipIf(!isolatedDatabase)('Notification isolated PostgreSQL integration', () => {
  const suffix = randomUUID();
  const readCode = 'NOTIFICATION_READ';
  const deliveryReadCode = 'NOTIFICATION_DELIVERY_READ';
  const service = new NotificationsService(new PrismaNotificationsRepository());
  const auth = new AuthService(new PrismaAuthRepository());
  let accountId = '';
  let roleId = '';
  let sessionId = '';
  let token = '';
  let filteredNotificationId = '';
  let foreignNotificationId = '';
  let actor: Awaited<ReturnType<AuthService['getSession']>> = null;
  const notificationIds: string[] = [];
  const createdPermissionIds: string[] = [];
  const originalFeatureFlag = process.env.NOTIFICATIONS_TEST_MODE;

  beforeAll(async () => {
    if (!isolatedDatabase) return;
    process.env.NOTIFICATIONS_TEST_MODE = 'true';
    const account = await prisma.account.create({
      data: { username: `synthetic-notification-${suffix}`, passwordHash: 'test-only-not-used', status: 'ACTIVE' },
    });
    accountId = account.id;
    const role = await prisma.role.create({ data: { name: `Synthetic notification role ${suffix}` } });
    roleId = role.id;
    await prisma.accountRole.create({ data: { accountId, roleId } });

    for (const code of [readCode, deliveryReadCode]) {
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

    token = randomBytes(32).toString('base64url');
    const session = await prisma.refreshToken.create({
      data: {
        accountId,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
    sessionId = session.id;

    const ownedRows = await Promise.all(Array.from({ length: 26 }, (_, index) => prisma.notification.create({
      data: {
        recipient: accountId,
        type: index === 0 ? 'TEST_FILTER_TYPE' : 'TEST_ONLY_TYPE',
        content: `Synthetic notification ${index} ${suffix}`,
        status: index === 0 ? 'TEST_FILTER_STATUS' : 'TEST_ONLY_STATUS',
        scheduledAt: new Date(Date.now() - index * 60_000),
      },
    })));
    notificationIds.push(...ownedRows.map(({ id }) => id));
    filteredNotificationId = ownedRows[0].id;
    const foreign = await prisma.notification.create({
      data: {
        recipient: `other-account-${suffix}`,
        type: 'TEST_ONLY_TYPE', content: 'Synthetic foreign notification', status: 'TEST_ONLY_STATUS',
      },
    });
    foreignNotificationId = foreign.id;
    notificationIds.push(foreign.id);
    await prisma.notificationDelivery.create({
      data: {
        notificationId: filteredNotificationId, channel: 'TEST_ONLY_CHANNEL', status: 'TEST_ONLY_STATUS',
        attemptedAt: new Date(), deliveredAt: new Date(),
        providerMessageId: 'synthetic-provider-id', errorMessage: 'synthetic provider detail not exposed',
      },
    });
    actor = await auth.getSession(token);
    if (!actor) throw new Error('Synthetic notification test session could not be resolved.');
  });

  afterAll(async () => {
    if (!isolatedDatabase) return;
    if (notificationIds.length) {
      await prisma.notificationDelivery.deleteMany({ where: { notificationId: { in: notificationIds } } });
      await prisma.notification.deleteMany({ where: { id: { in: notificationIds } } });
    }
    if (sessionId) await prisma.refreshToken.deleteMany({ where: { id: sessionId } });
    if (accountId) await prisma.accountRole.deleteMany({ where: { accountId } });
    if (roleId) {
      await prisma.rolePermission.deleteMany({ where: { roleId } });
      await prisma.role.deleteMany({ where: { id: roleId } });
    }
    if (createdPermissionIds.length) await prisma.permission.deleteMany({ where: { id: { in: createdPermissionIds } } });
    if (accountId) await prisma.account.deleteMany({ where: { id: accountId } });
    if (originalFeatureFlag === undefined) delete process.env.NOTIFICATIONS_TEST_MODE;
    else process.env.NOTIFICATIONS_TEST_MODE = originalFeatureFlag;
  });

  it('paginates only notifications whose synthetic recipient equals the authenticated account ID', async () => {
    const result = await service.getList(actor!, { page: 0 });
    expect(result.totalRows).toBe(26);
    expect(result.rows).toHaveLength(25);
    expect(result.rows.some(({ id }) => id === foreignNotificationId)).toBe(false);
    const nextPage = await service.getList(actor!, { page: 1 });
    expect(nextPage.rows).toHaveLength(1);
    expect(new Set([...result.rows, ...nextPage.rows].map(({ id }) => id)).size).toBe(26);
  });

  it('filters by stored type/status and returns only permitted delivery fields', async () => {
    const result = await service.getList(actor!, { type: 'TEST_FILTER_TYPE', status: 'TEST_FILTER_STATUS', page: 0 });
    expect(result.totalRows).toBe(1);
    expect(result.rows[0].id).toBe(filteredNotificationId);
    expect(result.rows[0].deliveries).toMatchObject([{ channel: 'TEST_ONLY_CHANNEL', status: 'TEST_ONLY_STATUS' }]);
    expect(result.rows[0].deliveries?.[0]).not.toHaveProperty('providerMessageId');
    expect(result.rows[0].deliveries?.[0]).not.toHaveProperty('errorMessage');
  });

  it('does not reveal whether a notification ID belongs to another recipient', async () => {
    await expect(service.getById(actor!, foreignNotificationId)).rejects.toThrow('NOTIFICATION_NOT_FOUND');
  });

  it('serves the authenticated scoped API without cache and rejects a foreign notification ID', async () => {
    const unauthenticated = await notificationsGet(new NextRequest('http://localhost/api/notifications'));
    expect(unauthenticated.status).toBe(401);
    const request = new NextRequest('http://localhost/api/notifications?page=0', {
      headers: { cookie: `clinic_session=${token}` },
    });
    const response = await notificationsGet(request);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    const body = await response.json();
    expect(body.data.totalRows).toBe(26);
    expect(body.data.rows.some((row: { id: string }) => row.id === foreignNotificationId)).toBe(false);

    const foreignRequest = new NextRequest(`http://localhost/api/notifications?id=${encodeURIComponent(foreignNotificationId)}`, {
      headers: { cookie: `clinic_session=${token}` },
    });
    expect((await notificationsGet(foreignRequest)).status).toBe(404);
  });

  it('rejects requests without notification permission after the database grant is removed', async () => {
    const permission = await prisma.permission.findUniqueOrThrow({ where: { code: readCode } });
    await prisma.rolePermission.delete({ where: { roleId_permissionId: { roleId, permissionId: permission.id } } });
    const updatedActor = await auth.getSession(token);
    expect(updatedActor).not.toBeNull();
    await expect(service.getList(updatedActor!, { page: 0 })).rejects.toThrow('NOTIFICATION_ACCESS_DENIED');
  });

  it('rejects a revoked session', async () => {
    await prisma.refreshToken.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
    await expect(auth.getSession(token)).resolves.toBeNull();
  });
});
