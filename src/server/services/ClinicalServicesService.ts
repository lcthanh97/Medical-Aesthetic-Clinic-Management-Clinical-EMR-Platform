import type { IClinicalServicesRepository } from '@/server/repositories/IClinicalServicesRepository';
import type { IClinicalServicesService } from './IClinicalServicesService';
export class ClinicalServicesService implements IClinicalServicesService {
 constructor(private readonly repository:IClinicalServicesRepository){}
 getById(id:string){return this.repository.findById(id);}
 getList(){return this.repository.findMany();}
 // TODO: Implement clinical-services business rules
}
