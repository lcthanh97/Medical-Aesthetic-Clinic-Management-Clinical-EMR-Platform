import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AuthActor } from '@/server/services/AuthService';
import {
  isDoctorDemoWriteAllowed,
  isDoctorReadEnvironment,
  isVerifiedNeonDoctorReadEnvironment,
} from '@/server/policies/DoctorDatabaseAccess';

const keys = [
  'DATABASE_URL',
  'EMR_AUTHORIZATION_ENABLED',
  'DOCTOR_NEON_READ_ENABLED',
  'DOCTOR_NEON_DEMO_WRITE_ENABLED',
  'DOCTOR_NEON_DEMO_ROLE_NAME',
  'DOCTOR_NEON_DEMO_ACCOUNT_ID',
  'DOCTOR_NEON_DEMO_EMPLOYEE_ID',
  'DOCTOR_NEON_DEMO_VISIT_ID',
] as const;
const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

function setNeonEnvironment() {
  vi.stubEnv('NODE_ENV', 'development');
  process.env.DATABASE_URL = 'postgresql://user:pass@ep-hidden-mouse-aewp1c1t.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';
  process.env.EMR_AUTHORIZATION_ENABLED = 'true';
  process.env.DOCTOR_NEON_READ_ENABLED = 'true';
}

afterEach(() => {
  vi.unstubAllEnvs();
  for (const key of keys) {
    const value = original[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe('doctor database access guard', () => {
  it('enables reads only for the verified direct Neon endpoint, database, TLS, and explicit local flag', () => {
    setNeonEnvironment();
    expect(isDoctorReadEnvironment()).toBe(true);

    process.env.DATABASE_URL = (process.env.DATABASE_URL ?? '').replace('ep-hidden-mouse-aewp1c1t.', 'ep-hidden-mouse-aewp1c1t-pooler.');
    expect(isVerifiedNeonDoctorReadEnvironment()).toBe(false);

    setNeonEnvironment();
    process.env.DATABASE_URL = (process.env.DATABASE_URL ?? '').replace('/neondb?', '/otherdb?');
    expect(isVerifiedNeonDoctorReadEnvironment()).toBe(false);

    setNeonEnvironment();
    process.env.DOCTOR_NEON_READ_ENABLED = 'false';
    expect(isDoctorReadEnvironment()).toBe(false);
  });

  it('never enables the Neon doctor mode under NODE_ENV=production', () => {
    setNeonEnvironment();
    vi.stubEnv('NODE_ENV', 'production');
    expect(isDoctorReadEnvironment()).toBe(false);
  });

  it('limits Neon writes to the configured demo account, employee, role, and Visit', () => {
    setNeonEnvironment();
    process.env.DOCTOR_NEON_DEMO_WRITE_ENABLED = 'true';
    process.env.DOCTOR_NEON_DEMO_ROLE_NAME = 'Bác sĩ kiểm thử';
    process.env.DOCTOR_NEON_DEMO_ACCOUNT_ID = 'demo-account';
    process.env.DOCTOR_NEON_DEMO_EMPLOYEE_ID = 'demo-employee';
    process.env.DOCTOR_NEON_DEMO_VISIT_ID = 'demo-visit';

    const actor: AuthActor = {
      accountId: 'demo-account',
      employeeId: 'demo-employee',
      sessionId: 'session',
      username: 'demo',
      employeeName: 'Demo',
      roleNames: ['Bác sĩ kiểm thử'],
      rolePermissions: [{ roleName: 'Bác sĩ kiểm thử', permissionCodes: ['EMR_READ', 'EMR_WRITE'] }],
    };

    expect(isDoctorDemoWriteAllowed(actor, 'demo-visit')).toBe(true);
    expect(isDoctorDemoWriteAllowed(actor, 'other-visit')).toBe(false);
    expect(isDoctorDemoWriteAllowed(actor, '')).toBe(false);
    expect(isDoctorDemoWriteAllowed({ ...actor, accountId: 'other-account' }, 'demo-visit')).toBe(false);
    process.env.DOCTOR_NEON_DEMO_WRITE_ENABLED = 'false';
    expect(isDoctorDemoWriteAllowed(actor, 'demo-visit')).toBe(false);
  });
});
