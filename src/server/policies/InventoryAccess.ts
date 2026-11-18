import { createHash } from 'node:crypto';
import { prisma } from '@/infrastructure/database/prisma';
import { getStaffSession } from '@/server/auth/staff-session';

export type InventoryActor = {
  accountId: string;
  sessionId: string;
  employeeId: string | null;
  username: string;
  roleNames: string[];
  permissionCodes: string[];
  rolePermissions: Array<{ roleName: string; permissionCodes: string[] }>;
  isAdmin: boolean;
};

const normalizeRoleName = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const isAdminRoleName = (name: string) => {
  const normalized = normalizeRoleName(name);
  return normalized === 'admin' || normalized === 'administrator'
    || normalized.includes('quan tri') || normalized.includes('quan ly');
};

export async function getInventoryActor(token?: string | null): Promise<InventoryActor | null> {
  // The Admin portal has a signed staff session; validate it and confirm the active account in the database.
  const staffSession = await getStaffSession('admin');
  if (staffSession) {
    const account = await prisma.account.findUnique({
      where: { id: staffSession.accountId },
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
    });
    if (!account || account.status !== 'ACTIVE' || account.employee?.id !== staffSession.employeeId) return null;
    const roleNames = [...new Set(account.roles.map(({ role }) => role.name))];
    const rolePermissions = account.roles.map(({ role }) => ({
      roleName: role.name,
      permissionCodes: [...new Set(role.permissions.map(({ permission }) => permission.code))],
    }));
    return {
      accountId: account.id,
      sessionId: `staff:${account.id}`,
      employeeId: staffSession.employeeId,
      username: account.username,
      roleNames,
      permissionCodes: [...new Set(rolePermissions.flatMap(({ permissionCodes }) => permissionCodes))],
      rolePermissions,
      isAdmin: roleNames.some(isAdminRoleName),
    };
  }

  // Keep compatibility with legacy clinic_session callers while they are being migrated.
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
  const permissionCodes = [...new Set(rolePermissions.flatMap(({ permissionCodes }) => permissionCodes))];
  return {
    accountId: session.account.id,
    sessionId: session.id,
    employeeId: session.account.employee?.id ?? null,
    username: session.account.username,
    roleNames,
    permissionCodes,
    rolePermissions,
    isAdmin: roleNames.some(isAdminRoleName),
  };
}

export function isSystemAdministrator(actor: InventoryActor): boolean {
  return actor.isAdmin || actor.roleNames.some(isAdminRoleName);
}

export function canReadInventory(actor: InventoryActor): boolean {
  return isSystemAdministrator(actor)
    || actor.permissionCodes.includes('INVENTORY_READ')
    || actor.permissionCodes.includes('INVENTORY_WRITE');
}

export function canWriteInventory(actor: InventoryActor): boolean {
  return isSystemAdministrator(actor) || actor.permissionCodes.includes('INVENTORY_WRITE');
}
