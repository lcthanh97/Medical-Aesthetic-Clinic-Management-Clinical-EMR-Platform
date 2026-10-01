import type { IAuditRepository } from '@/server/repositories/IAuditRepository';
import type { IAuditService } from './IAuditService';
export class AuditService implements IAuditService {
 constructor(private readonly repository:IAuditRepository){}
 getById(id:string){return this.repository.findById(id);}
 getList(){return this.repository.findMany();}
 // TODO: Implement audit business rules
}
