import type { IAppointmentsRepository } from '@/server/repositories/IAppointmentsRepository';
export class PrismaAppointmentsRepository implements IAppointmentsRepository {
  async findById(_id:string){return null;}
  async findMany(){return [];}
  async create(_input:unknown){throw new Error('Not implemented');}
  async update(_id:string,_input:unknown){throw new Error('Not implemented');}
}
