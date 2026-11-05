import type { AuditFilters, AuditPage, AuditViewModel } from '@/features/audit/types/audit.types';

export interface IAuditRepository {
  findById(id: string): Promise<AuditViewModel | null>;
  findMany(filters?: AuditFilters): Promise<AuditPage>;
  create(input: { accountId?: string; action: string; entity: string; entityId?: string; ipAddress?: string }): Promise<AuditViewModel>;
}
