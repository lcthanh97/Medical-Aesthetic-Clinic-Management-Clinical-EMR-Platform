import type { IAuditRepository } from '@/server/repositories/IAuditRepository';
import type { IAuditService } from './IAuditService';
import type { AuditFilters } from '@/features/audit/types/audit.types';
export class AuditService implements IAuditService {
 constructor(private readonly repository:IAuditRepository){}
 getById(id:string){return this.repository.findById(id);}
 getList(filters?: AuditFilters){return this.repository.findMany(filters);}
 record(input: { accountId?: string; action: string; entity: string; entityId?: string; ipAddress?: string }) { return this.repository.create(input); }
}
