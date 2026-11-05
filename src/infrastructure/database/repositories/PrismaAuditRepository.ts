import prisma from '@/infrastructure/database/prisma';
import type { AuditFilters, AuditViewModel } from '@/features/audit/types/audit.types';
import type { IAuditRepository } from '@/server/repositories/IAuditRepository';

function mapAudit(row: any): AuditViewModel { return { id: row.id, action: row.action, entity: row.entity, entityId: row.entityId,
  ipAddress: row.ipAddress, accountId: row.accountId, username: row.account?.username ?? null, createdAt: row.createdAt.toISOString() }; }

export class PrismaAuditRepository implements IAuditRepository {
  async findById(id: string) { const row = await prisma.auditLog.findUnique({ where: { id }, include: { account: true } }); return row ? mapAudit(row) : null; }
  async findMany(filters: AuditFilters = {}) {
    const page = Math.max(1, filters.page ?? 1); const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
    const where = { ...(filters.entity ? { entity: filters.entity } : {}), ...(filters.accountId ? { accountId: filters.accountId } : {}),
      ...(filters.query ? { OR: [{ action: { contains: filters.query, mode: 'insensitive' as const } }, { entity: { contains: filters.query, mode: 'insensitive' as const } }, { account: { username: { contains: filters.query, mode: 'insensitive' as const } } }] } : {}),
      ...((filters.from || filters.to) ? { createdAt: { ...(filters.from ? { gte: new Date(filters.from) } : {}), ...(filters.to ? { lte: new Date(filters.to) } : {}) } } : {}) };
    const [rows, total] = await prisma.$transaction([prisma.auditLog.findMany({ where, include: { account: true }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }), prisma.auditLog.count({ where })]);
    return { items: rows.map(mapAudit), total, page, pageSize };
  }
  async create(input: { accountId?: string; action: string; entity: string; entityId?: string; ipAddress?: string }) {
    const row = await prisma.auditLog.create({ data: { ...input, accountId: input.accountId || null, entityId: input.entityId || null, ipAddress: input.ipAddress || null }, include: { account: true } });
    return mapAudit(row);
  }
}
