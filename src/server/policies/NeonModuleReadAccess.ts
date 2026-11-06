import { doctorNeonRuntime } from './DoctorDatabaseAccess';

export function isNeonModuleReadEnabled(module: 'REPORTS' | 'NOTIFICATIONS'): boolean {
  if (process.env[`${module}_NEON_READ_ENABLED`] !== 'true') return false;
  try {
    const database = new URL(process.env.DATABASE_URL ?? '');
    const direct = doctorNeonRuntime.host;
    const pooled = direct.replace('.', '-pooler.');
    return database.protocol === 'postgresql:'
      && [direct, pooled].includes(database.hostname)
      && database.pathname === `/${doctorNeonRuntime.database}`
      && ['require', 'verify-full'].includes(database.searchParams.get('sslmode') ?? '');
  } catch {
    return false;
  }
}
