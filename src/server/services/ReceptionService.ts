import type { IReceptionRepository } from '@/server/repositories/IReceptionRepository';
import type { IReceptionService } from './IReceptionService';
export class ReceptionService implements IReceptionService {
 constructor(private readonly repository:IReceptionRepository){}
 getById(id:string){return this.repository.findById(id);}
 getList(){return this.repository.findMany();}
 // TODO: Implement reception business rules
}
