export interface AuthAccountRecord {
  id: string;
  username: string;
  passwordHash: string;
  status: string;
  employee: { id: string; fullName: string } | null;
  roles: Array<{
    role: {
      name: string;
      permissions: Array<{ permission: { code: string } }>;
    };
  }>;
}

export interface AuthSessionRecord {
  id: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  account: AuthAccountRecord;
}

export interface IAuthRepository {
  findAccountByUsername(username: string): Promise<AuthAccountRecord | null>;
  beginLoginAttempt(fingerprint: string, since: Date, limit: number, at: Date): Promise<string | null>;
  completeLoginAttempt(attemptId: string, succeeded: boolean): Promise<void>;
  createSession(accountId: string, tokenHash: string, expiresAt: Date): Promise<string>;
  findSessionByTokenHash(tokenHash: string): Promise<AuthSessionRecord | null>;
  extendSession(id: string, now: Date, expiresAt: Date): Promise<boolean>;
  revokeSession(tokenHash: string, at: Date): Promise<void>;
}
