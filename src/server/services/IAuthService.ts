import type { AccountViewModel, CreateAccountInput, RoleSummary, UpdateAccountInput } from '@/features/auth/types/auth.types';
export interface IAuthService {
  getById(id: string): Promise<AccountViewModel | null>;
  getList(query?: string): Promise<AccountViewModel[]>;
  getRoles(): Promise<RoleSummary[]>;
  create(input: CreateAccountInput): Promise<AccountViewModel>;
  update(id: string, input: UpdateAccountInput): Promise<AccountViewModel>;
}
