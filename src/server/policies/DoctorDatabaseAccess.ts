import type { AuthActor } from '@/server/services/AuthService';

const VERIFIED_NEON_HOST = 'ep-hidden-mouse-aewp1c1t.c-2.us-east-2.aws.neon.tech';
const VERIFIED_NEON_POOLER_HOST = 'ep-hidden-mouse-aewp1c1t-pooler.c-2.us-east-2.aws.neon.tech';
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
  // Real Neon reads are permitted in production only when explicitly enabled.
  // Host, database, TLS, session, role permission, and Visit scope are still checked.
  if (process.env.DOCTOR_NEON_READ_ENABLED !== 'true') return false;
  try {
    const database = new URL(process.env.DATABASE_URL ?? '');
    return database.protocol === 'postgresql:' &&
      [VERIFIED_NEON_HOST, VERIFIED_NEON_POOLER_HOST].includes(database.hostname) &&
      database.pathname === VERIFIED_NEON_DATABASE &&
      ['require', 'verify-full'].includes(database.searchParams.get('sslmode') ?? '');
  } catch {
    return false;
  }
}

export function isDoctorEmrReadEnvironment(): boolean {
  return isDoctorReadEnvironment();
}

/**
 * Explicitly scoped exception for draft prescriptions by one configured demo
 * doctor. In development, this remains limited to the verified Neon database.
 */
export function isNeonPrescriptionDemoWriteEnvironment(): boolean {
  if (!['production', 'development'].includes(process.env.NODE_ENV ?? '') ||
      process.env.DOCTOR_NEON_PRESCRIPTION_DRAFT_WRITE_ENABLED !== 'true') return false;
  if (process.env.NODE_ENV === 'development' &&
      (process.env.EMR_AUTHORIZATION_ENABLED !== 'true' || process.env.DOCTOR_NEON_READ_ENABLED !== 'true')) return false;
  try {
    const database = new URL(process.env.DATABASE_URL ?? '');
    return database.protocol === 'postgresql:' &&
      [VERIFIED_NEON_HOST, VERIFIED_NEON_POOLER_HOST].includes(database.hostname) &&
      database.pathname === VERIFIED_NEON_DATABASE &&
      ['require', 'verify-full'].includes(database.searchParams.get('sslmode') ?? '');
  } catch {
    return false;
  }
}

export function isNeonPrescriptionDemoWriter(actor: AuthActor): boolean {
  if (!isNeonPrescriptionDemoWriteEnvironment()) return false;
  const accountId = process.env.DOCTOR_NEON_PRESCRIPTION_ACCOUNT_ID;
  const employeeId = process.env.DOCTOR_NEON_PRESCRIPTION_EMPLOYEE_ID;
  return Boolean(
    accountId && employeeId &&
    actor.accountId === accountId &&
    actor.employeeId === employeeId &&
    actor.rolePermissions.some(({ permissionCodes }) =>
      permissionCodes.includes('PRESCRIPTION_READ') && permissionCodes.includes('PRESCRIPTION_WRITE'),
    ),
  );
}

export function isNeonPrescriptionDemoVisitAllowed(actor: AuthActor, visitId: string): boolean {
  if (!isNeonPrescriptionDemoWriter(actor) || !visitId) return false;
  const allowedVisitIds = new Set(
    (process.env.DOCTOR_NEON_PRESCRIPTION_VISIT_IDS ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  );
  return allowedVisitIds.has(visitId);
}

export function isDoctorReadEnvironment(): boolean {
  return process.env.EMR_AUTHORIZATION_ENABLED === 'true' &&
    (isLocalDoctorTestDatabase() || isVerifiedNeonDoctorReadEnvironment());
}

export function isDoctorDemoWriteAllowed(actor: AuthActor, visitId: string): boolean {
  return isDoctorDemoWriteAllowedForVisits(actor, visitId, [process.env.DOCTOR_NEON_DEMO_VISIT_ID]);
}

export function isDoctorDemoMedicalRecordWriteAllowed(actor: AuthActor, visitId: string): boolean {
  return isDoctorDemoWriteAllowedForVisits(actor, visitId, [
    process.env.DOCTOR_NEON_DEMO_VISIT_ID,
    process.env.DOCTOR_NEON_DEMO_ADDITIONAL_EMR_VISIT_ID,
  ]);
}

function isDoctorDemoWriteAllowedForVisits(actor: AuthActor, visitId: string, allowedVisits: Array<string | undefined>): boolean {
  if (isLocalDoctorTestDatabase()) return true;
  if (process.env.NODE_ENV === 'production') return false;
  if (!isVerifiedNeonDoctorReadEnvironment() || process.env.DOCTOR_NEON_DEMO_WRITE_ENABLED !== 'true') return false;

  const demoRoleName = process.env.DOCTOR_NEON_DEMO_ROLE_NAME;
  const demoAccountId = process.env.DOCTOR_NEON_DEMO_ACCOUNT_ID;
  const demoEmployeeId = process.env.DOCTOR_NEON_DEMO_EMPLOYEE_ID;
  return Boolean(
    demoRoleName && demoAccountId && demoEmployeeId && visitId &&
    actor.accountId === demoAccountId &&
    actor.employeeId === demoEmployeeId &&
    actor.rolePermissions.some(({ roleName, permissionCodes }) =>
      roleName === demoRoleName && permissionCodes.includes('EMR_WRITE'),
    ) &&
    allowedVisits.includes(visitId),
  );
}

export const doctorNeonRuntime = {
  host: VERIFIED_NEON_HOST,
  database: VERIFIED_NEON_DATABASE.slice(1),
  demoRoleName: 'Bác sĩ kiểm thử',
} as const;
