import type { IAdministrationRepository } from '@/server/repositories/IAdministrationRepository';
import type { IAdministrationService } from './IAdministrationService';
export class AdministrationService implements IAdministrationService {
 constructor(private readonly repository:IAdministrationRepository){}
 getById(id:string){return this.repository.findById(id);}
 getList(){return this.repository.findMany();}
 // TODO: Implement administration business rules
}
