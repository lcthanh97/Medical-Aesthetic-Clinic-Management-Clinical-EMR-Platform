import type { AdministrationSnapshot, CreateAdministrationInput } from '@/features/administration/types/administration.types';
export interface IAdministrationRepository {
  getSnapshot(): Promise<AdministrationSnapshot>;
  create(input: CreateAdministrationInput): Promise<{ id: string; name: string }>;
}
