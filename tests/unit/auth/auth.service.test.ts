import { beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { AuthService, hashNewPassword, hashSessionToken, verifyPassword } from '@/server/services/AuthService';
import type { AuthAccountRecord, AuthSessionRecord, IAuthRepository } from '@/server/repositories/IAuthRepository';
import { AuthorizationService } from '@/server/policies/AuthorizationService';

const NOW = new Date('2026-11-04T12:00:00.000Z');
const RATE_LIMIT_SECRET = 'test-only-rate-limit-secret-that-is-at-least-32-bytes';

function createAccount(overrides: Partial<AuthAccountRecord> = {}): AuthAccountRecord {
  return {
    id: 'account-1',
    username: 'doctor.test',
    passwordHash: '$2b$04$placeholder',
    status: 'ACTIVE',
    employee: { id: 'employee-1', fullName: 'Synthetic Doctor' },
    roles: [{ role: { name: 'Synthetic Role', permissions: [{ permission: { code: 'EMR_READ' } }] } }],
    ...overrides,
  };
}

function createRepository(account: AuthAccountRecord | null = createAccount(), session: AuthSessionRecord | null = null) {
  let attemptSequence = 0;
  return {
    findAccountByUsername: vi.fn(async () => account),
    beginLoginAttempt: vi.fn(async (_fingerprint: string, _since: Date, _limit: number, _at: Date): Promise<string | null> => `attempt-${++attemptSequence}`),
    completeLoginAttempt: vi.fn(async (_attemptId: string, _succeeded: boolean) => {}),
    createSession: vi.fn(async (_accountId: string, _tokenHash: string, _expiresAt: Date) => 'session-1'),
    findSessionByTokenHash: vi.fn(async () => session),
    extendSession: vi.fn(async () => true),
    revokeSession: vi.fn(async () => {}),
  } satisfies IAuthRepository;
}

describe('AuthService', () => {
  let passwordHash: string;

  beforeEach(async () => {
    passwordHash = await bcrypt.hash('Synthetic-password-123!', 4);
  });

  it('authenticates an active bcrypt account and stores only a hash of the random session token', async () => {
    const account = createAccount({ passwordHash });
    const repository = createRepository(account);
    const service = new AuthService(repository, RATE_LIMIT_SECRET, () => NOW);

    const result = await service.login(' doctor.test ', 'Synthetic-password-123!');

    expect(result.kind).toBe('authenticated');
    if (result.kind !== 'authenticated') return;
    expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(repository.createSession).toHaveBeenCalledWith(
      account.id,
      hashSessionToken(result.token),
      new Date(NOW.getTime() + 30 * 60 * 1000),
    );
    expect(repository.createSession.mock.calls[0][1]).not.toBe(result.token);
    expect(result.actor).toMatchObject({
      accountId: account.id,
      employeeId: 'employee-1',
      rolePermissions: [{ roleName: 'Synthetic Role', permissionCodes: ['EMR_READ'] }],
    });
  });

  it('returns the same invalid result for unknown, disabled, and wrong-password accounts', async () => {
    const unknownRepository = createRepository(null);
    const disabledRepository = createRepository(createAccount({ passwordHash, status: 'DISABLED' }));
    const wrongPasswordRepository = createRepository(createAccount({ passwordHash }));

    const results = await Promise.all([
      new AuthService(unknownRepository, RATE_LIMIT_SECRET, () => NOW).login('absent', 'wrong'),
      new AuthService(disabledRepository, RATE_LIMIT_SECRET, () => NOW).login('doctor.test', 'Synthetic-password-123!'),
      new AuthService(wrongPasswordRepository, RATE_LIMIT_SECRET, () => NOW).login('doctor.test', 'wrong'),
    ]);

    expect(results).toEqual([{ kind: 'invalid' }, { kind: 'invalid' }, { kind: 'invalid' }]);
    expect(unknownRepository.completeLoginAttempt).toHaveBeenCalledWith('attempt-1', false);
    expect(disabledRepository.completeLoginAttempt).toHaveBeenCalledWith('attempt-1', false);
    expect(wrongPasswordRepository.completeLoginAttempt).toHaveBeenCalledWith('attempt-1', false);
  });

  it('blocks login after the configured number of recent failures', async () => {
    const repository = createRepository();
    let failures = 0;
    let pending = 0;
    repository.beginLoginAttempt.mockImplementation(async (_fingerprint, _since, limit) => {
      if (failures + pending >= limit) return null;
      pending += 1;
      return `attempt-${failures + pending}`;
    });
    repository.completeLoginAttempt.mockImplementation(async (_attemptId, succeeded) => {
      pending -= 1;
      if (!succeeded) failures += 1;
    });
    const service = new AuthService(repository, RATE_LIMIT_SECRET, () => NOW);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(await service.login('doctor.test', 'wrong')).toEqual({ kind: 'invalid' });
    }
    expect(await service.login('doctor.test', 'wrong')).toEqual({ kind: 'rate-limited' });
    expect(repository.completeLoginAttempt).toHaveBeenCalledTimes(5);
    expect(repository.findAccountByUsername).toHaveBeenCalledTimes(5);
  });

  it('rejects legacy formats outside bcrypt and Argon2id without throwing', async () => {
    expect(await verifyPassword('password', 'not-a-supported-hash')).toBe(false);
    expect(await verifyPassword('password', '$argon2i$unsupported')).toBe(false);
  });

  it('creates Argon2id hashes for new-password flows without rehashing existing accounts', async () => {
    const hash = await hashNewPassword('Synthetic-new-password-123!');
    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(await verifyPassword('Synthetic-new-password-123!', hash)).toBe(true);
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });

  it('renews an active session while enforcing revocation and absolute expiry', async () => {
    const account = createAccount({ passwordHash });
    const validSession: AuthSessionRecord = {
      id: 'session-1', tokenHash: hashSessionToken('a'.repeat(43)),
      createdAt: new Date(NOW.getTime() - 60_000), expiresAt: new Date(NOW.getTime() + 60_000),
      revokedAt: null, account,
    };
    const repository = createRepository();
    repository.findSessionByTokenHash.mockResolvedValue(validSession);
    const service = new AuthService(repository, RATE_LIMIT_SECRET, () => NOW);

    const actor = await service.getSession('a'.repeat(43));
    expect(actor?.employeeId).toBe('employee-1');
    expect(repository.extendSession).toHaveBeenCalledWith('session-1', NOW, new Date(NOW.getTime() + 30 * 60 * 1000));

    repository.findSessionByTokenHash.mockResolvedValue({ ...validSession, revokedAt: NOW });
    expect(await service.getSession('a'.repeat(43))).toBeNull();

    repository.findSessionByTokenHash.mockResolvedValue({
      ...validSession, createdAt: new Date(NOW.getTime() - 8 * 60 * 60 * 1000),
    });
    expect(await service.getSession('a'.repeat(43))).toBeNull();
    expect(repository.revokeSession).toHaveBeenCalledWith(validSession.tokenHash, NOW);
  });

  it('revokes a session at logout and denies it after its account is disabled', async () => {
    const account = createAccount({ passwordHash });
    const session: AuthSessionRecord = {
      id: 'session-2', tokenHash: hashSessionToken('b'.repeat(43)),
      createdAt: new Date(NOW.getTime() - 60_000), expiresAt: new Date(NOW.getTime() + 60_000),
      revokedAt: null, account: createAccount({ status: 'DISABLED' }),
    };
    const repository = createRepository(account);
    repository.findSessionByTokenHash.mockResolvedValue(session);
    const service = new AuthService(repository, RATE_LIMIT_SECRET, () => NOW);

    expect(await service.getSession('b'.repeat(43))).toBeNull();
    await service.logout('b'.repeat(43));
    expect(repository.revokeSession).toHaveBeenCalledWith(session.tokenHash, NOW);
  });
});

describe('AuthorizationService', () => {
  const authorization = new AuthorizationService();
  const actor = {
    accountId: 'account-1', username: 'doctor.test', employeeId: 'employee-1', employeeName: 'Synthetic Doctor',
    sessionId: 'session-1',
    roleNames: ['Bác sĩ da liễu'],
    rolePermissions: [{ roleName: 'Bác sĩ da liễu', permissionCodes: ['EMR_READ', 'EMR_WRITE'] }],
  };

  it('allows a dermatologist with same-role DB permission only for the assigned Visit', () => {
    expect(authorization.can({ actor, permissionCode: 'EMR_READ', visitEmployeeId: 'employee-1' })).toBe(true);
    expect(authorization.can({ actor, permissionCode: 'EMR_WRITE', visitEmployeeId: 'employee-1' })).toBe(true);
    expect(authorization.can({ actor, permissionCode: 'EMR_READ', visitEmployeeId: 'employee-2' })).toBe(false);
    expect(authorization.can({ actor, permissionCode: 'EMR_READ', visitEmployeeId: null })).toBe(false);
    expect(authorization.can({ actor: { ...actor, employeeId: null }, permissionCode: 'EMR_READ', visitEmployeeId: 'employee-1' })).toBe(false);
  });

  it('enforces approved read-only roles and denies unapproved roles', () => {
    const resident = {
      ...actor, roleNames: ['Bác sĩ nội trú'],
      rolePermissions: [{ roleName: 'Bác sĩ nội trú', permissionCodes: ['EMR_READ', 'EMR_WRITE'] }],
    };
    const receptionist = {
      ...actor, roleNames: ['Lễ tân'],
      rolePermissions: [{ roleName: 'Lễ tân', permissionCodes: ['EMR_READ', 'EMR_WRITE'] }],
    };

    expect(authorization.can({ actor: resident, permissionCode: 'EMR_READ', visitEmployeeId: 'employee-1' })).toBe(true);
    expect(authorization.can({ actor: resident, permissionCode: 'EMR_WRITE', visitEmployeeId: 'employee-1' })).toBe(false);
    expect(authorization.can({ actor: receptionist, permissionCode: 'EMR_WRITE', visitEmployeeId: 'employee-1' })).toBe(false);
  });

  it('does not combine a physician role with a permission granted through another role', () => {
    const mixedRoles = {
      ...actor,
      roleNames: ['Bác sĩ nội trú', 'Lễ tân'],
      rolePermissions: [
        { roleName: 'Bác sĩ nội trú', permissionCodes: ['EMR_READ'] },
        { roleName: 'Lễ tân', permissionCodes: ['EMR_WRITE'] },
      ],
    };

    expect(authorization.can({ actor: mixedRoles, permissionCode: 'EMR_READ', visitEmployeeId: 'employee-1' })).toBe(true);
    expect(authorization.can({ actor: mixedRoles, permissionCode: 'EMR_WRITE', visitEmployeeId: 'employee-1' })).toBe(false);
  });
});
