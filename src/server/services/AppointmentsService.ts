import type { IAppointmentsRepository } from '@/server/repositories/IAppointmentsRepository';
import type { IAppointmentsService } from './IAppointmentsService';
export class AppointmentsService implements IAppointmentsService {
 constructor(private readonly repository:IAppointmentsRepository){}
 getById(id:string){return this.repository.findById(id);}
 getList(){return this.repository.findMany();}
 // TODO: Implement appointments business rules
}
