import { describe, expect, it, vi } from 'vitest';
import { AuditService } from '@/server/services/AuditService';
import type { IAuditRepository } from '@/server/repositories/IAuditRepository';
describe('AuditService',()=>{it('records immutable audit data through repository',async()=>{const created={id:'log1',action:'CREATE_ACCOUNT',entity:'Account',entityId:'a1',ipAddress:'127.0.0.1',accountId:null,username:null,createdAt:new Date().toISOString()};const repo:IAuditRepository={findById:vi.fn(),findMany:vi.fn(),create:vi.fn().mockResolvedValue(created)};const service=new AuditService(repo);await expect(service.record({action:'CREATE_ACCOUNT',entity:'Account',entityId:'a1',ipAddress:'127.0.0.1'})).resolves.toEqual(created);expect(repo.create).toHaveBeenCalledOnce();});});
