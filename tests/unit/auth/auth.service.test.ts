import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '@/server/services/AuthService';
import type { IAuthRepository } from '@/server/repositories/IAuthRepository';
const account = { id:'a1', username:'doctor.one', email:null, status:'ACTIVE', employeeName:null, roles:[], createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() };
function repository(): IAuthRepository { return { findById:vi.fn(), findMany:vi.fn(), findRoles:vi.fn(), create:vi.fn().mockResolvedValue(account), update:vi.fn().mockResolvedValue(account) }; }
describe('AuthService',()=>{
  it('normalizes username and hashes password before persistence', async()=>{const repo=repository();const service=new AuthService(repo);await service.create({username:' Doctor.One ',password:'StrongPass1!'});expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({username:'doctor.one',passwordHash:expect.stringMatching(/^scrypt:/)}));});
  it('rejects weak passwords',async()=>{const service=new AuthService(repository());await expect(service.create({username:'doctor.one',password:'short'})).rejects.toThrow('ít nhất 8');});
});
