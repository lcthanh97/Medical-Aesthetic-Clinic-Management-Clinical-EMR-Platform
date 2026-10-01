import type { IConsentsRepository } from '@/server/repositories/IConsentsRepository';
import type { IConsentsService } from './IConsentsService';
export class ConsentsService implements IConsentsService {
 constructor(private readonly repository:IConsentsRepository){}
 getById(id:string){return this.repository.findById(id);}
 getList(){return this.repository.findMany();}
 // TODO: Implement consents business rules
}
