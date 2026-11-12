import type { IEmrRepository } from '@/server/repositories/IEmrRepository';
import type { IEmrService } from './IEmrService';
export class EmrService implements IEmrService {
 constructor(private readonly repository:IEmrRepository){}
 getById(id:string){return this.repository.findById(id);}
 getList(){return this.repository.findMany();}
 // TODO: Implement emr business rules
}
