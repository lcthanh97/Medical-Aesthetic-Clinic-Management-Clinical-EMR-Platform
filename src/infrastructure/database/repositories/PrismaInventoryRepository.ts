import type { IInventoryRepository } from '@/server/repositories/IInventoryRepository';
export class PrismaInventoryRepository implements IInventoryRepository {
  async findById(_id:string){return null;}
  async findMany(){return [];}
  async create(_input:unknown){throw new Error('Not implemented');}
  async update(_id:string,_input:unknown){throw new Error('Not implemented');}
}
