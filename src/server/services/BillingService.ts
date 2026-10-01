import type { IBillingRepository } from '@/server/repositories/IBillingRepository';
import type { IBillingService } from './IBillingService';
export class BillingService implements IBillingService {
 constructor(private readonly repository:IBillingRepository){}
 getById(id:string){return this.repository.findById(id);}
 getList(){return this.repository.findMany();}
 // TODO: Implement billing business rules
}
