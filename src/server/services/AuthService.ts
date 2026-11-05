import { createHmac, createHash, randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import bcrypt from 'bcryptjs';
import type { AuthAccountRecord, AuthSessionRecord, IAuthRepository } from '@/server/repositories/IAuthRepository';

const IDLE_SESSION_MS = 30 * 60 * 1000;
const ABSOLUTE_SESSION_MS = 8 * 60 * 60 * 1000;
const LOGIN_FAILURE_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_FAILURE_LIMIT = 5;

export interface AuthActor {
  accountId: string;
  sessionId: string;
  username: string;
  employeeId: string | null;
  employeeName: string | null;
  roleNames: string[];
  rolePermissions: Array<{ roleName: string; permissionCodes: string[] }>;
}

export type LoginResult =
  | { kind: 'authenticated'; token: string; actor: AuthActor }
  | { kind: 'invalid' }
  | { kind: 'rate-limited' };

export class AuthConfigurationError extends Error {}

let dummyBcryptHash: Promise<string> | undefined;

function getDummyBcryptHash(): Promise<string> {
  dummyBcryptHash ??= bcrypt.hash(randomBytes(32).toString('hex'), 12);
  return dummyBcryptHash;
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function toActor(account: AuthAccountRecord, sessionId: string): AuthActor {
  const rolePermissions = account.roles.map(({ role }) => ({
    roleName: role.name,
    permissionCodes: [...new Set(role.permissions.map(({ permission }) => permission.code))],
  }));

  return {
    accountId: account.id,
    sessionId,
    username: account.username,
    employeeId: account.employee?.id ?? null,
    employeeName: account.employee?.fullName ?? null,
    roleNames: [...new Set(rolePermissions.map(({ roleName }) => roleName))],
    rolePermissions,
  };
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  try {
    if (/^\$2[aby]\$/.test(passwordHash)) return await bcrypt.compare(password, passwordHash);
    if (passwordHash.startsWith('$argon2id$')) return await argon2.verify(passwordHash, password);
    await bcrypt.compare(password, await getDummyBcryptHash());
    return false;
  } catch {
    return false;
  }
}

export async function hashNewPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
}

export class AuthService {
  constructor(
    private readonly repository: IAuthRepository,
    private readonly rateLimitSecret = process.env.AUTH_RATE_LIMIT_SECRET,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private loginFingerprint(username: string): string {
    if (!this.rateLimitSecret || this.rateLimitSecret.length < 32) {
      throw new AuthConfigurationError('AUTH_RATE_LIMIT_SECRET must contain at least 32 characters.');
    }
    return `login:${createHmac('sha256', this.rateLimitSecret).update(username, 'utf8').digest('hex')}`;
  }

  async login(username: string, password: string): Promise<LoginResult> {
    const normalizedUsername = username.trim();
    const fingerprint = this.loginFingerprint(normalizedUsername);
    const now = this.now();
    const attemptId = await this.repository.beginLoginAttempt(
      fingerprint,
      new Date(now.getTime() - LOGIN_FAILURE_WINDOW_MS),
      LOGIN_FAILURE_LIMIT,
      now,
    );

    if (!attemptId) return { kind: 'rate-limited' };

    const account = await this.repository.findAccountByUsername(normalizedUsername);
    const passwordMatches = account
      ? await verifyPassword(password, account.passwordHash)
      : await bcrypt.compare(password, await getDummyBcryptHash());

    if (!account || account.status !== 'ACTIVE' || !passwordMatches) {
      await this.repository.completeLoginAttempt(attemptId, false);
      return { kind: 'invalid' };
    }

    await this.repository.completeLoginAttempt(attemptId, true);

    const token = randomBytes(32).toString('base64url');
    const tokenHash = hashSessionToken(token);
    const absoluteExpiry = new Date(now.getTime() + ABSOLUTE_SESSION_MS);
    const idleExpiry = new Date(now.getTime() + IDLE_SESSION_MS);
    const sessionId = await this.repository.createSession(account.id, tokenHash, idleExpiry < absoluteExpiry ? idleExpiry : absoluteExpiry);

    return { kind: 'authenticated', token, actor: toActor(account, sessionId) };
  }

  async getSession(token: string | null | undefined): Promise<AuthActor | null> {
    if (!token || !/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;

    const now = this.now();
    const session = await this.repository.findSessionByTokenHash(hashSessionToken(token));
    if (!session || session.revokedAt || session.expiresAt <= now) return null;

    if (session.createdAt.getTime() + ABSOLUTE_SESSION_MS <= now.getTime()) {
      await this.repository.revokeSession(session.tokenHash, now);
      return null;
    }

    if (session.account.status !== 'ACTIVE') {
      await this.repository.revokeSession(session.tokenHash, now);
      return null;
    }

    const absoluteExpiry = new Date(session.createdAt.getTime() + ABSOLUTE_SESSION_MS);
    const idleExpiry = new Date(now.getTime() + IDLE_SESSION_MS);
    const nextExpiry = idleExpiry < absoluteExpiry ? idleExpiry : absoluteExpiry;
    if (!(await this.repository.extendSession(session.id, now, nextExpiry))) return null;

    return toActor(session.account, session.id);
  }

  async logout(token: string | null | undefined): Promise<void> {
    if (token && /^[A-Za-z0-9_-]{40,60}$/.test(token)) {
      await this.repository.revokeSession(hashSessionToken(token), this.now());
    }
  }
}

export type { AuthSessionRecord };
