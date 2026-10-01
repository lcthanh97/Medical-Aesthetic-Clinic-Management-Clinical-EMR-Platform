import type { IClinicalServicesRepository } from '@/server/repositories/IClinicalServicesRepository';
export class PrismaClinicalServicesRepository implements IClinicalServicesRepository {
  async findById(_id:string){return null;}
  async findMany(){return [];}
  async create(_input:unknown){throw new Error('Not implemented');}
  async update(_id:string,_input:unknown){throw new Error('Not implemented');}
}
