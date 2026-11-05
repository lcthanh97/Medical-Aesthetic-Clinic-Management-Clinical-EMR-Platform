import type { IAuthRepository } from '@/server/repositories/IAuthRepository';
import type { IAuthService } from './IAuthService';
import type { CreateAccountInput, UpdateAccountInput } from '@/features/auth/types/auth.types';
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${derived.toString('hex')}`;
}

export class AuthService implements IAuthService {
 constructor(private readonly repository:IAuthRepository){}
 getById(id:string){return this.repository.findById(id);}
 getList(query?: string){return this.repository.findMany(query);}
 getRoles(){return this.repository.findRoles();}
 async create(input: CreateAccountInput) {
   const username = input.username.trim().toLowerCase();
   if (!/^[a-z0-9._-]{4,40}$/.test(username)) throw new Error('Tên đăng nhập phải từ 4-40 ký tự và không chứa khoảng trắng.');
   if (input.password.length < 8) throw new Error('Mật khẩu phải có ít nhất 8 ký tự.');
   return this.repository.create({ ...input, username, email: input.email?.trim().toLowerCase(), passwordHash: await hashPassword(input.password) });
 }
 async update(id: string, input: UpdateAccountInput) {
   if (input.password && input.password.length < 8) throw new Error('Mật khẩu phải có ít nhất 8 ký tự.');
   return this.repository.update(id, { ...input, email: input.email?.trim().toLowerCase(), passwordHash: input.password ? await hashPassword(input.password) : undefined });
 }
}
