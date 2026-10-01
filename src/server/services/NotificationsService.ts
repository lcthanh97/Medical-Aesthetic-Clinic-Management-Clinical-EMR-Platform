import type { INotificationsRepository } from '@/server/repositories/INotificationsRepository';
import type { INotificationsService } from './INotificationsService';
export class NotificationsService implements INotificationsService {
 constructor(private readonly repository:INotificationsRepository){}
 getById(id:string){return this.repository.findById(id);}
 getList(){return this.repository.findMany();}
 // TODO: Implement notifications business rules
}
