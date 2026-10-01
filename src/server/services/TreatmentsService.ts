import type { ITreatmentsRepository } from '@/server/repositories/ITreatmentsRepository';
import type { ITreatmentsService } from './ITreatmentsService';
export class TreatmentsService implements ITreatmentsService {
 constructor(private readonly repository:ITreatmentsRepository){}
 getById(id:string){return this.repository.findById(id);}
 getList(){return this.repository.findMany();}
 // TODO: Implement treatments business rules
}
