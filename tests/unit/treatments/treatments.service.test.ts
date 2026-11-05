import { describe, expect, it, vi } from 'vitest';
import type { AuthActor } from '@/server/services/AuthService';
import type { ITreatmentsRepository } from '@/server/repositories/ITreatmentsRepository';
import { hasAssignedTreatmentRead, hasTreatmentInventoryRead, TreatmentsService } from '@/server/services/TreatmentsService';

function actor(permissionCodes: string[], employeeId: string | null = 'employee-1'): AuthActor {
  return {
    accountId: 'account-1', sessionId: 'session-1', username: 'synthetic-doctor', employeeId,
    employeeName: 'Synthetic clinician', roleNames: ['Synthetic role'],
    rolePermissions: [{ roleName: 'Synthetic role', permissionCodes }],
  };
}

function repository(): ITreatmentsRepository {
  return {
    getAssignedVisitsForEmployee: vi.fn().mockResolvedValue([]),
    getPlansByVisitId: vi.fn().mockResolvedValue([]),
    getTreatmentSessions: vi.fn().mockResolvedValue([]),
    getProtocolTemplates: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 12, statuses: [], stageTypes: [] }),
    getSessionInventoryDetails: vi.fn().mockResolvedValue([]),
    createPlan: vi.fn(), updatePlan: vi.fn(), deletePlan: vi.fn(),
    getStepsByPlanId: vi.fn(), createStep: vi.fn(), updateStep: vi.fn(), deleteStep: vi.fn(),
  };
}

describe('TreatmentsService assigned read scope', () => {
  it('requires EMR_READ and TREATMENT_READ on the same role', () => {
    expect(hasAssignedTreatmentRead(actor(['EMR_READ', 'TREATMENT_READ']))).toBe(true);
    expect(hasAssignedTreatmentRead(actor(['EMR_READ']))).toBe(false);
    expect(hasAssignedTreatmentRead({
      ...actor([]),
      rolePermissions: [
        { roleName: 'EMR', permissionCodes: ['EMR_READ'] },
        { roleName: 'Treatment', permissionCodes: ['TREATMENT_READ'] },
      ],
    })).toBe(false);
  });

  it('rejects actors without an employee assignment before querying', async () => {
    const repo = repository();
    const service = new TreatmentsService(repo);
    expect(() => service.getAssignedVisits(actor(['EMR_READ', 'TREATMENT_READ'], null))).toThrow('TREATMENT_ACCESS_DENIED');
    expect(repo.getAssignedVisitsForEmployee).not.toHaveBeenCalled();
  });

  it('passes the authenticated employee scope into visit and plan queries', async () => {
    const repo = repository();
    const service = new TreatmentsService(repo);
    const authenticatedActor = actor(['EMR_READ', 'TREATMENT_READ']);

    await service.getAssignedVisits(authenticatedActor);
    await service.getPlansByVisitId('visit-1', authenticatedActor);

    expect(repo.getAssignedVisitsForEmployee).toHaveBeenCalledWith('employee-1');
    expect(repo.getPlansByVisitId).toHaveBeenCalledWith('visit-1', 'employee-1');
  });

  it('requires the existing EMR_READ and TREATMENT_READ permissions before opening the template library', async () => {
    const repo = repository();
    const service = new TreatmentsService(repo);
    const filters = { q: '', status: '', stageType: '', page: 1 };
    expect(() => service.getProtocolTemplates(actor(['EMR_READ']), filters)).toThrow('TREATMENT_ACCESS_DENIED');
    expect(repo.getProtocolTemplates).not.toHaveBeenCalled();
    await service.getProtocolTemplates(actor(['EMR_READ', 'TREATMENT_READ']), filters);
    expect(repo.getProtocolTemplates).toHaveBeenCalledWith(filters);
  });

  it('requires TREATMENT_READ and INVENTORY_READ on the same role for consumption details', () => {
    expect(hasTreatmentInventoryRead(actor(['EMR_READ', 'TREATMENT_READ', 'INVENTORY_READ']))).toBe(true);
    expect(hasTreatmentInventoryRead(actor(['TREATMENT_READ']))).toBe(false);
    expect(hasTreatmentInventoryRead({
      ...actor([]),
      rolePermissions: [
        { roleName: 'Treatment', permissionCodes: ['EMR_READ', 'TREATMENT_READ'] },
        { roleName: 'Inventory', permissionCodes: ['TREATMENT_READ', 'INVENTORY_READ'] },
      ],
    })).toBe(false);
  });

  it('passes only the authenticated employee to the session query', async () => {
    const repo = repository();
    const service = new TreatmentsService(repo);
    const authenticatedActor = actor(['EMR_READ', 'TREATMENT_READ']);
    await service.getTreatmentSessions(authenticatedActor, { q: '', status: '', visitId: 'visit-1' });
    expect(repo.getTreatmentSessions).toHaveBeenCalledWith('employee-1', { q: '', status: '', visitId: 'visit-1' });
  });

  it('blocks inventory details before repository access without the same-role permission', async () => {
    const repo = repository();
    const service = new TreatmentsService(repo);
    expect(() => service.getSessionInventoryDetails(actor(['EMR_READ', 'TREATMENT_READ']), ['session-1']))
      .toThrow('TREATMENT_INVENTORY_ACCESS_DENIED');
    expect(repo.getSessionInventoryDetails).not.toHaveBeenCalled();
  });
});
