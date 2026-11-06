import prisma from '@/infrastructure/database/prisma';
import type { IAuthRepository } from '@/server/repositories/IAuthRepository';

const accountAuthSelect = {
  id: true,
  username: true,
  passwordHash: true,
  status: true,
  employee: { select: { id: true, fullName: true } },
  roles: {
    select: {
      role: {
        select: {
          name: true,
          permissions: { select: { permission: { select: { code: true } } } },
        },
      },
    },
  },
} as const;

export class PrismaAuthRepository implements IAuthRepository {
  async findAccountByUsername(username: string) {
    return prisma.account.findUnique({ where: { username }, select: accountAuthSelect });
  }

  async findAccountById(accountId: string) {
    return prisma.account.findUnique({ where: { id: accountId }, select: accountAuthSelect });
  }

  beginLoginAttempt(fingerprint: string, since: Date, limit: number, at: Date) {
    return prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`WITH login_lock AS MATERIALIZED (
        SELECT pg_advisory_xact_lock(1819043144, hashtext(${fingerprint}))
      ) SELECT 1 FROM login_lock`;
      const recentAttempts = await transaction.auditLog.count({
        where: {
          entity: 'AUTH', entityId: fingerprint, createdAt: { gte: since },
          action: { in: ['LOGIN_ATTEMPT', 'LOGIN_FAILED'] },
        },
      });
      if (recentAttempts >= limit) return null;
      const attempt = await transaction.auditLog.create({
        data: { action: 'LOGIN_ATTEMPT', entity: 'AUTH', entityId: fingerprint, createdAt: at },
        select: { id: true },
      });
      return attempt.id;
    }, { maxWait: 10_000, timeout: 15_000 });
  }

  async completeLoginAttempt(attemptId: string, succeeded: boolean) {
    await prisma.auditLog.updateMany({
      where: { id: attemptId, action: 'LOGIN_ATTEMPT', entity: 'AUTH' },
      data: { action: succeeded ? 'LOGIN_SUCCEEDED' : 'LOGIN_FAILED' },
    });
  }

  async createSession(accountId: string, tokenHash: string, expiresAt: Date) {
    const session = await prisma.refreshToken.create({
      data: { accountId, tokenHash, expiresAt }, select: { id: true },
    });
    return session.id;
  }

  async findSessionByTokenHash(tokenHash: string) {
    return prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { account: { select: accountAuthSelect } },
    });
  }

  async extendSession(id: string, now: Date, expiresAt: Date) {
    const result = await prisma.refreshToken.updateMany({
      where: { id, revokedAt: null, expiresAt: { gt: now } },
      data: { expiresAt },
    });
    return result.count === 1;
  }

  async revokeSession(tokenHash: string, at: Date) {
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: at },
    });
  }
}
