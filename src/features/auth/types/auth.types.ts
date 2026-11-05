export interface RoleSummary {
  id: string;
  name: string;
  permissions: string[];
}

export interface AccountViewModel {
  id: string;
  username: string;
  email: string | null;
  status: string;
  employeeName: string | null;
  roles: RoleSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountInput {
  username: string;
  email?: string;
  password: string;
  roleIds?: string[];
}

export interface UpdateAccountInput {
  email?: string | null;
  status?: 'ACTIVE' | 'LOCKED' | 'DISABLED';
  password?: string;
  roleIds?: string[];
}
