import { describe, expect, it, vi } from 'vitest';
import { DoctorConsentFiltersSchema } from '@/features/consents/schemas/consents.schema';
import type { AssignedConsentRecord, IConsentsRepository } from '@/server/repositories/IConsentsRepository';
import type { AuthActor } from '@/server/services/AuthService';
import { AuthorizationService } from '@/server/policies/AuthorizationService';
import { ConsentsService } from '@/server/services/ConsentsService';

const approvedRole = new AuthorizationService().allowedRoleNames('EMR_READ')[0];
const actor: AuthActor = {
  accountId: 'account-1',
  sessionId: 'session-1',
  username: 'doctor',
  employeeId: 'employee-1',
  employeeName: 'Doctor',
  roleNames: [approvedRole],
  rolePermissions: [{ roleName: approvedRole, permissionCodes: ['EMR_READ'] }],
};

function row(id: string): AssignedConsentRecord {
  return {
    id,
    visitId: 'visit-1',
    treatmentPlanId: 'plan-1',
    planVersion: 1,
    signerName: 'Synthetic signer',
    signedAt: new Date('2026-01-01T10:00:00.000Z'),
    createdAt: new Date('2026-01-01T10:00:00.000Z'),
    template: { id: 'template-1', name: 'Synthetic template', version: 1, content: 'Synthetic content' },
    visit: {
      id: 'visit-1', visitDate: new Date('2026-01-01T09:00:00.000Z'), patientId: 'patient-1',
      patient: { id: 'patient-1', patientCode: 'TEST-1', fullName: 'Synthetic patient' },
    },
    plan: { id: 'plan-1', name: 'Synthetic plan', visitId: 'visit-1', patientId: 'patient-1' },
    patient: { id: 'patient-1', fullName: 'Synthetic patient' },
    employee: { fullName: 'Synthetic doctor' },
  };
}

function repository(rows: AssignedConsentRecord[]): IConsentsRepository {
  return {
    findById: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(),
    findManyForAssignedEmployee: vi.fn().mockResolvedValue({ items: rows, capped: false }),
  };
}

describe('ConsentsService', () => {
  it('fails closed when actor lacks approved EMR_READ permission', async () => {
    const repo = repository([row('consent-1')]);
    const service = new ConsentsService(repo);
    const unapproved: AuthActor = { ...actor, rolePermissions: [{ roleName: 'Unapproved', permissionCodes: ['EMR_READ'] }] };

    await expect(service.getAssignedTreatmentConsents(unapproved, DoctorConsentFiltersSchema.parse({})))
      .rejects.toThrow('CONSENT_ACCESS_DENIED');
    expect(repo.findManyForAssignedEmployee).not.toHaveBeenCalled();
  });

  it('passes assigned actor scope to repository and paginates results', async () => {
    const repo = repository(Array.from({ length: 30 }, (_, index) => row(`consent-${index}`)));
    const service = new ConsentsService(repo);
    const result = await service.getAssignedTreatmentConsents(actor, DoctorConsentFiltersSchema.parse({ page: 2 }));

    expect(repo.findManyForAssignedEmployee).toHaveBeenCalledWith(
      { accountId: actor.accountId, employeeId: actor.employeeId, sessionId: actor.sessionId },
      expect.objectContaining({ page: 2 }),
    );
    expect(result.total).toBe(30);
    expect(result.pageSize).toBe(25);
    expect(result.items).toHaveLength(5);
  });
});
