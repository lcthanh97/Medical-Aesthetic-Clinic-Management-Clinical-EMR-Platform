import type { IReportsRepository } from '@/server/repositories/IReportsRepository';
import type { IReportsService } from './IReportsService';
export class ReportsService implements IReportsService {
 constructor(private readonly repository:IReportsRepository){}
 getById(id:string){return this.repository.findById(id);}
 getList(){return this.repository.findMany();}
 // TODO: Implement reports business rules
}
