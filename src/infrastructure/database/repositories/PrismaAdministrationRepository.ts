import type { IAdministrationRepository } from '@/server/repositories/IAdministrationRepository';
export class PrismaAdministrationRepository implements IAdministrationRepository {
  async findById(_id:string){return null;}
  async findMany(){return [];}
  async create(_input:unknown){throw new Error('Not implemented');}
  async update(_id:string,_input:unknown){throw new Error('Not implemented');}
}
