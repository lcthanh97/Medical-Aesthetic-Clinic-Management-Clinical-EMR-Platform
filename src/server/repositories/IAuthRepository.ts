import type { AccountViewModel, CreateAccountInput, RoleSummary, UpdateAccountInput } from '@/features/auth/types/auth.types';

export interface IAuthRepository {
  findById(id: string): Promise<AccountViewModel | null>;
  findMany(query?: string): Promise<AccountViewModel[]>;
  findRoles(): Promise<RoleSummary[]>;
  create(input: CreateAccountInput & { passwordHash: string }): Promise<AccountViewModel>;
  update(id: string, input: UpdateAccountInput & { passwordHash?: string }): Promise<AccountViewModel>;
}
