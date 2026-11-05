export interface AuthViewModel {
  username: string;
  employeeName: string | null;
  roleNames: string[];
}

export interface AuthResponse {
  success: boolean;
  user?: AuthViewModel | null;
  error?: string;
}
