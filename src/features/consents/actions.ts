'use server';

import { cookies } from 'next/headers';
import { PrismaAuthRepository } from '@/infrastructure/database/repositories/PrismaAuthRepository';
import { PrismaConsentsRepository } from '@/infrastructure/database/repositories/PrismaConsentsRepository';
import { AuthorizationService } from '@/server/policies/AuthorizationService';
import { isDoctorReadEnvironment } from '@/server/policies/DoctorDatabaseAccess';
import { AuthService, type AuthActor } from '@/server/services/AuthService';
import { ConsentsService } from '@/server/services/ConsentsService';
import { DoctorConsentFiltersSchema } from './schemas/consents.schema';

const service = new ConsentsService(new PrismaConsentsRepository());
const authService = new AuthService(new PrismaAuthRepository());
const authorization = new AuthorizationService();
const SESSION_COOKIE = 'clinic_session';
const EMR_AUTHORIZATION_ENABLED = process.env.EMR_AUTHORIZATION_ENABLED === 'true';
const ACCESS_DENIED = 'Không thể tải cam kết trong phạm vi Visit được phép.';

function isLocalConsentTestDatabase() {
  return EMR_AUTHORIZATION_ENABLED && isDoctorReadEnvironment();
}

async function getActor(): Promise<AuthActor | null> {
  if (!isLocalConsentTestDatabase()) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return authService.getSession(token);
}

export async function getDoctorTreatmentConsents(filters: unknown = {}) {
  try {
    const parsed = DoctorConsentFiltersSchema.safeParse(filters);
    if (!parsed.success) return { success: false as const, error: ACCESS_DENIED };
    const actor = await getActor();
    if (!actor?.employeeId || !authorization.hasPermission(actor, 'EMR_READ')) {
      return { success: false as const, error: ACCESS_DENIED };
    }
    const data = await service.getAssignedTreatmentConsents(actor, parsed.data);
    return { success: true as const, data: JSON.parse(JSON.stringify(data)) };
  } catch {
    return { success: false as const, error: ACCESS_DENIED };
  }
}
