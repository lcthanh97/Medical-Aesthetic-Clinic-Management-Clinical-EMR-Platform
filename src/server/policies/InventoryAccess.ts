import { createHash } from 'node:crypto';
import { prisma } from '@/infrastructure/database/prisma';

export type InventoryActor = {
  accountId: string;
  sessionId: string;
  employeeId: string | null;
  username: string;
  roleNames: string[];
  permissionCodes: string[];
  rolePermissions: Array<{ roleName: string; permissionCodes: string[] }>;
};

const ADMIN_ROLE_NAMES = new Set(['ADMIN', 'ADMINISTRATOR', 'QUẢN TRỊ HỆ THỐNG']);

export async function getInventoryActor(token: string | undefined | null): Promise<InventoryActor | null> {
  if (!token || !/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;
  const tokenHash = createHash('sha256').update(token, 'utf8').digest('hex');
  const session = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      createdAt: true,
      expiresAt: true,
      revokedAt: true,
      account: {
        select: {
          id: true,
          username: true,
          status: true,
          employee: { select: { id: true } },
          roles: {
            select: {
              role: {
                select: {
                  name: true,
                  permissions: { select: { permission: { select: { code: true } } } },
                },
              },
            },
          },
        },
      },
    },
  });
  const now = Date.now();
  if (!session || session.revokedAt || session.expiresAt.getTime() <= now
    || session.createdAt.getTime() + 8 * 60 * 60 * 1000 <= now
    || session.account.status !== 'ACTIVE') return null;

  const roleNames = [...new Set(session.account.roles.map(({ role }) => role.name))];
  const rolePermissions = session.account.roles.map(({ role }) => ({
    roleName: role.name,
    permissionCodes: [...new Set(role.permissions.map(({ permission }) => permission.code))],
  }));
  const permissionCodes = [...new Set(session.account.roles.flatMap(({ role }) =>
    role.permissions.map(({ permission }) => permission.code),
  ))];
  return {
    accountId: session.account.id,
    sessionId: session.id,
    employeeId: session.account.employee?.id ?? null,
    username: session.account.username,
    roleNames,
    permissionCodes,
    rolePermissions,
  };
}

export function isSystemAdministrator(actor: InventoryActor): boolean {
  return actor.roleNames.some((name) => ADMIN_ROLE_NAMES.has(name.trim().toLocaleUpperCase('vi-VN')));
}

export function canReadInventory(actor: InventoryActor): boolean {
  return isSystemAdministrator(actor)
    || actor.permissionCodes.includes('INVENTORY_READ')
    || actor.permissionCodes.includes('INVENTORY_WRITE');
}

export function canWriteInventory(actor: InventoryActor): boolean {
  return isSystemAdministrator(actor) || actor.permissionCodes.includes('INVENTORY_WRITE');
}
