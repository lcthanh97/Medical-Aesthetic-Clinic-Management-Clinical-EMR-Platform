import type { AuthActor } from '@/server/services/AuthService';

export interface ResourceContext {
  actor: AuthActor;
  permissionCode: string;
  visitEmployeeId: string | null;
}

const APPROVED_EMR_ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  'Bác sĩ da liễu': ['EMR_READ', 'EMR_WRITE'],
  'Bác sĩ điều trị': ['EMR_READ', 'EMR_WRITE'],
  'Bác sĩ nội trú': ['EMR_READ'],
  'Bác sĩ tư vấn': ['EMR_READ'],
};

function isApprovedRole(roleName: string, permissionCode: string): boolean {
  if (APPROVED_EMR_ROLE_PERMISSIONS[roleName]?.includes(permissionCode)) return true;
  return process.env.DOCTOR_NEON_DEMO_ROLE_NAME === roleName &&
    (permissionCode === 'EMR_READ' || permissionCode === 'EMR_WRITE');
}

export class AuthorizationService {
  hasPermission(actor: AuthActor, permissionCode: string): boolean {
    if (!actor.accountId || !actor.employeeId) return false;
    if (permissionCode !== 'EMR_READ' && permissionCode !== 'EMR_WRITE') return false;
    return actor.rolePermissions.some(({ roleName, permissionCodes }) =>
      isApprovedRole(roleName, permissionCode) &&
      permissionCodes.includes(permissionCode),
    );
  }

  can(context: ResourceContext): boolean {
    if (!context.visitEmployeeId || !this.hasPermission(context.actor, context.permissionCode)) return false;
    return context.actor.employeeId === context.visitEmployeeId;
  }

  allowedRoleNames(permissionCode: string): string[] {
    if (permissionCode !== 'EMR_READ' && permissionCode !== 'EMR_WRITE') return [];
    return Object.entries(APPROVED_EMR_ROLE_PERMISSIONS)
      .filter(([, permissionCodes]) => permissionCodes.includes(permissionCode))
      .map(([roleName]) => roleName)
      .concat(process.env.DOCTOR_NEON_DEMO_ROLE_NAME ? [process.env.DOCTOR_NEON_DEMO_ROLE_NAME] : []);
  }
}
