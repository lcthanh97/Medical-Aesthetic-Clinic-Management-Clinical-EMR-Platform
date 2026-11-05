import { describe, expect, it, vi } from 'vitest';
import { AdministrationService } from '@/server/services/AdministrationService';
import type { IAdministrationRepository } from '@/server/repositories/IAdministrationRepository';
describe('AdministrationService',()=>{it('trims names before creating configuration',async()=>{const repo:IAdministrationRepository={getSnapshot:vi.fn(),create:vi.fn().mockResolvedValue({id:'f1',name:'Cơ sở Quận 1'})};const service=new AdministrationService(repo);await service.create({type:'facility',name:'  Cơ sở Quận 1  '});expect(repo.create).toHaveBeenCalledWith({type:'facility',name:'Cơ sở Quận 1'});});});
