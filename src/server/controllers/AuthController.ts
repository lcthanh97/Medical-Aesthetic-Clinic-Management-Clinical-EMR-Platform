import type { IAuthService } from '@/server/services/IAuthService';

export class AuthController {
  constructor(private readonly service: IAuthService) {}

  login(username: string, password: string) {
    return this.service.login(username, password);
  }

  getSession(token: string | null | undefined) {
    return this.service.getSession(token);
  }

  logout(token: string | null | undefined) {
    return this.service.logout(token);
  }
}
