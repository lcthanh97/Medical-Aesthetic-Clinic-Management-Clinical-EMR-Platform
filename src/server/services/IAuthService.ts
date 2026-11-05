import type { AuthActor, LoginResult } from './AuthService';

export interface IAuthService {
  login(username: string, password: string): Promise<LoginResult>;
  getSession(token: string | null | undefined): Promise<AuthActor | null>;
  logout(token: string | null | undefined): Promise<void>;
}
