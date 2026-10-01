import type { INotificationsRepository } from '@/server/repositories/INotificationsRepository';
export class PrismaNotificationsRepository implements INotificationsRepository {
  async findById(_id:string){return null;}
  async findMany(){return [];}
  async create(_input:unknown){throw new Error('Not implemented');}
  async update(_id:string,_input:unknown){throw new Error('Not implemented');}
}
