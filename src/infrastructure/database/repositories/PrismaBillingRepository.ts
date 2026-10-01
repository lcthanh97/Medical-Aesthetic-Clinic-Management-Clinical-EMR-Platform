import type { IBillingRepository } from '@/server/repositories/IBillingRepository';
export class PrismaBillingRepository implements IBillingRepository {
  async findById(_id:string){return null;}
  async findMany(){return [];}
  async create(_input:unknown){throw new Error('Not implemented');}
  async update(_id:string,_input:unknown){throw new Error('Not implemented');}
}
