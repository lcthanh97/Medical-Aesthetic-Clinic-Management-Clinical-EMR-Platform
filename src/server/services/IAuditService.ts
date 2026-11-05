import type { AuditFilters, AuditPage, AuditViewModel } from '@/features/audit/types/audit.types';
export interface IAuditService {
  getById(id: string): Promise<AuditViewModel | null>;
  getList(filters?: AuditFilters): Promise<AuditPage>;
  record(input: { accountId?: string; action: string; entity: string; entityId?: string; ipAddress?: string }): Promise<AuditViewModel>;
}
