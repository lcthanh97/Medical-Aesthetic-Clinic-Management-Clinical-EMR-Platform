import type { IAuthRepository } from '@/server/repositories/IAuthRepository';
import type { IAuthService } from './IAuthService';
export interface AuthActor {
 accountId: string;
 sessionId: string;
 username: string;
 employeeId: string | null;
 employeeName: string | null;
 roleNames: string[];
 rolePermissions: Array<{ roleName: string; permissionCodes: string[] }>;
}
export class AuthService implements IAuthService {
 constructor(private readonly repository:IAuthRepository){}
 getById(id:string){return this.repository.findById(id);}
 getList(){return this.repository.findMany();}
 // TODO: Implement auth business rules
}
