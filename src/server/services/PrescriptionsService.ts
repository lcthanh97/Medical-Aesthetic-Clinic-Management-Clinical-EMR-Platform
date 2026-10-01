import type { IPrescriptionsRepository } from '@/server/repositories/IPrescriptionsRepository';
import type { IPrescriptionsService } from './IPrescriptionsService';
export class PrescriptionsService implements IPrescriptionsService {
 constructor(private readonly repository:IPrescriptionsRepository){}
 getById(id:string){return this.repository.findById(id);}
 getList(){return this.repository.findMany();}
 // TODO: Implement prescriptions business rules
}
