import type { IAdministrationRepository } from '@/server/repositories/IAdministrationRepository';
import type { IAdministrationService } from './IAdministrationService';
import type { CreateAdministrationInput } from '@/features/administration/types/administration.types';
export class AdministrationService implements IAdministrationService {
 constructor(private readonly repository:IAdministrationRepository){}
 getSnapshot(){return this.repository.getSnapshot();}
 create(input: CreateAdministrationInput){return this.repository.create({ ...input, name: input.name.trim() });}
}
