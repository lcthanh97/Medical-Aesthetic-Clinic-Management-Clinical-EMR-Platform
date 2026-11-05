import type { AdministrationSnapshot, CreateAdministrationInput } from '@/features/administration/types/administration.types';
export interface IAdministrationService {
  getSnapshot(): Promise<AdministrationSnapshot>;
  create(input: CreateAdministrationInput): Promise<{ id: string; name: string }>;
}
