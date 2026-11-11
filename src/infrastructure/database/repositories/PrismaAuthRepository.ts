import prisma from '@/infrastructure/database/prisma';
import type { AccountViewModel, CreateAccountInput, RoleSummary, UpdateAccountInput } from '@/features/auth/types/auth.types';
import type { IAuthRepository } from '@/server/repositories/IAuthRepository';

const accountInclude = { employee: { select: { fullName: true } }, roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } as const;
function mapAccount(row: any): AccountViewModel {
  return { id: row.id, username: row.username, email: row.email, status: row.status, employeeName: row.employee?.fullName ?? null,
    roles: row.roles.map((item: any) => ({ id: item.role.id, name: item.role.name, permissions: item.role.permissions.map((entry: any) => entry.permission.code) })),
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

export class PrismaAuthRepository implements IAuthRepository {
  async findById(id: string) { const row = await prisma.account.findUnique({ where: { id }, include: accountInclude }); return row ? mapAccount(row) : null; }
  async findMany(query?: string) {
    const rows = await prisma.account.findMany({ where: query ? { OR: [
      { username: { contains: query, mode: 'insensitive' } }, { email: { contains: query, mode: 'insensitive' } },
      { employee: { fullName: { contains: query, mode: 'insensitive' } } },
    ] } : undefined, include: accountInclude, orderBy: { createdAt: 'desc' } });
    return rows.map(mapAccount);
  }
  async findRoles(): Promise<RoleSummary[]> {
    const roles = await prisma.role.findMany({ include: { permissions: { include: { permission: true } } }, orderBy: { name: 'asc' } });
    return roles.map((role) => ({ id: role.id, name: role.name, permissions: role.permissions.map((entry) => entry.permission.code) }));
  }
  async create(input: CreateAccountInput & { passwordHash: string }) {
    const row = await prisma.account.create({ data: { username: input.username, email: input.email || null, passwordHash: input.passwordHash,
      roles: input.roleIds?.length ? { create: input.roleIds.map((roleId) => ({ role: { connect: { id: roleId } } })) } : undefined }, include: accountInclude });
    return mapAccount(row);
  }
  async update(id: string, input: UpdateAccountInput & { passwordHash?: string }) {
    const row = await prisma.$transaction(async (tx) => {
      if (input.roleIds) await tx.accountRole.deleteMany({ where: { accountId: id } });
      return tx.account.update({ where: { id }, data: { email: input.email, status: input.status, passwordHash: input.passwordHash,
        roles: input.roleIds ? { create: input.roleIds.map((roleId) => ({ role: { connect: { id: roleId } } })) } : undefined }, include: accountInclude });
    }, {
      maxWait: 10000,
      timeout: 15000,
    });
    return mapAccount(row);
  }
}
