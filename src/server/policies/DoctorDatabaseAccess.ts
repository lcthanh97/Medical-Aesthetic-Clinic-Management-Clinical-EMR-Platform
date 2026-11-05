import type { AuthActor } from '@/server/services/AuthService';

const VERIFIED_NEON_HOST = 'ep-hidden-mouse-aewp1c1t.c-2.us-east-2.aws.neon.tech';
const VERIFIED_NEON_DATABASE = '/neondb';

export function isLocalDoctorTestDatabase(): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  try {
    const database = new URL(process.env.DATABASE_URL ?? '');
    return ['127.0.0.1', 'localhost'].includes(database.hostname) &&
      database.port === '55432' && database.pathname === '/emr_test';
  } catch {
    return false;
  }
}

export function isVerifiedNeonDoctorReadEnvironment(): boolean {
  if (process.env.NODE_ENV === 'production' || process.env.DOCTOR_NEON_READ_ENABLED !== 'true') return false;
  try {
    const database = new URL(process.env.DATABASE_URL ?? '');
    return database.protocol === 'postgresql:' &&
      database.hostname === VERIFIED_NEON_HOST &&
      database.pathname === VERIFIED_NEON_DATABASE &&
      !database.hostname.includes('-pooler') &&
      ['require', 'verify-full'].includes(database.searchParams.get('sslmode') ?? '');
  } catch {
    return false;
  }
}

export function isDoctorReadEnvironment(): boolean {
  return process.env.EMR_AUTHORIZATION_ENABLED === 'true' &&
    (isLocalDoctorTestDatabase() || isVerifiedNeonDoctorReadEnvironment());
}

export function isDoctorDemoWriteAllowed(actor: AuthActor, visitId: string): boolean {
  if (isLocalDoctorTestDatabase()) return true;
  if (!isVerifiedNeonDoctorReadEnvironment() || process.env.DOCTOR_NEON_DEMO_WRITE_ENABLED !== 'true') return false;

  const demoRoleName = process.env.DOCTOR_NEON_DEMO_ROLE_NAME;
  const demoAccountId = process.env.DOCTOR_NEON_DEMO_ACCOUNT_ID;
  const demoEmployeeId = process.env.DOCTOR_NEON_DEMO_EMPLOYEE_ID;
  const demoVisitId = process.env.DOCTOR_NEON_DEMO_VISIT_ID;
  return Boolean(
    demoRoleName && demoAccountId && demoEmployeeId && demoVisitId &&
    actor.accountId === demoAccountId &&
    actor.employeeId === demoEmployeeId &&
    actor.rolePermissions.some(({ roleName, permissionCodes }) =>
      roleName === demoRoleName && permissionCodes.includes('EMR_WRITE'),
    ) &&
    visitId === demoVisitId,
  );
}

export const doctorNeonRuntime = {
  host: VERIFIED_NEON_HOST,
  database: VERIFIED_NEON_DATABASE.slice(1),
  demoRoleName: 'Bác sĩ kiểm thử',
} as const;
