import type { IInventoryRepository } from '@/server/repositories/IInventoryRepository';
import type { IInventoryService } from './IInventoryService';
export class InventoryService implements IInventoryService {
 constructor(private readonly repository:IInventoryRepository){}
 getById(id:string){return this.repository.findById(id);}
 getList(){return this.repository.findMany();}
 // TODO: Implement inventory business rules
}
