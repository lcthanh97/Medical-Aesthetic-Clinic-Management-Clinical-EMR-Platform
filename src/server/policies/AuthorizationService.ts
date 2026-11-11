import type { AuthActor } from '@/server/services/AuthService';

export interface ResourceContext {
  actor: AuthActor;
  permissionCode: string;
  visitEmployeeId: string | null;
}

export const DOCTOR_ROLE_NAME = 'Bác sĩ';
export const VISIT_WRITE_STATUSES = ['EXAMINING', 'IN_PROGRESS'] as const;
export const VISIT_SUPPLEMENT_STATUSES = ['RESULT_READY', 'WAITING_RESULT'] as const;

export class AuthorizationService {
  hasRolePermission(actor: AuthActor, permissionCode: string): boolean {
    if (!actor.accountId || !actor.employeeId || !permissionCode) return false;
    return actor.rolePermissions.some(({ roleName, permissionCodes }) =>
      roleName === DOCTOR_ROLE_NAME && permissionCodes.includes(permissionCode),
    );
  }

  hasPermission(actor: AuthActor, permissionCode: string): boolean {
    if (permissionCode !== 'EMR_READ' && permissionCode !== 'EMR_WRITE') return false;
    return this.hasRolePermission(actor, permissionCode);
  }

  canReadVisit(actor: AuthActor, visitEmployeeId: string | null): boolean {
    return Boolean(visitEmployeeId && this.hasPermission(actor, 'EMR_READ') && actor.employeeId === visitEmployeeId);
  }

  canReadPatientHistory(actor: AuthActor, hasActiveTreatmentRelationship: boolean): boolean {
    return Boolean(hasActiveTreatmentRelationship && this.hasPermission(actor, 'EMR_READ'));
  }

  canWriteVisit(actor: AuthActor, visitEmployeeId: string | null, status: string): boolean {
    return this.canReadVisit(actor, visitEmployeeId) && this.hasPermission(actor, 'EMR_WRITE') && VISIT_WRITE_STATUSES.includes(status as (typeof VISIT_WRITE_STATUSES)[number]);
  }

  canSupplementVisit(actor: AuthActor, visitEmployeeId: string | null, status: string): boolean {
    return this.canReadVisit(actor, visitEmployeeId) && this.hasPermission(actor, 'EMR_WRITE') && VISIT_SUPPLEMENT_STATUSES.includes(status as (typeof VISIT_SUPPLEMENT_STATUSES)[number]);
  }

  canUpdateMedicalRecord(actor: AuthActor, visitEmployeeId: string | null, status: string): boolean {
    return this.canWriteVisit(actor, visitEmployeeId, status) || this.canSupplementVisit(actor, visitEmployeeId, status);
  }

  can(context: ResourceContext): boolean {
    return this.canReadVisit(context.actor, context.visitEmployeeId) && this.hasPermission(context.actor, context.permissionCode);
  }

  allowedRoleNames(permissionCode: string): string[] {
    return this.hasApprovedPermissionCode(permissionCode) ? [DOCTOR_ROLE_NAME] : [];
  }

  private hasApprovedPermissionCode(permissionCode: string): boolean {
    return permissionCode === 'EMR_READ' || permissionCode === 'EMR_WRITE';
  }
}
