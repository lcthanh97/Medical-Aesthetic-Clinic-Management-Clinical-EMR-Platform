import type { IAuthRepository } from '@/server/repositories/IAuthRepository';
import type { IAuthService } from './IAuthService';
export class AuthService implements IAuthService {
 constructor(private readonly repository:IAuthRepository){}
 getById(id:string){return this.repository.findById(id);}
 getList(){return this.repository.findMany();}
 // TODO: Implement auth business rules
}
