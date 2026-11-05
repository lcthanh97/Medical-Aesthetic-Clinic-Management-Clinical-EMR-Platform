import { describe, expect, it, vi } from 'vitest';
import type { IPrescriptionsRepository, PrescriptionRecord } from '@/server/repositories/IPrescriptionsRepository';
import { PrescriptionsService } from '@/server/services/PrescriptionsService';
import type { AuthActor } from '@/server/services/AuthService';
import { PrescriptionsValidator } from '@/server/validators/PrescriptionsValidator';

const record: PrescriptionRecord = {
  id: 'rx-1',
  visitId: 'visit-1',
  employeeId: 'employee-1',
  status: 'DRAFT',
  employee: { fullName: 'Synthetic doctor' },
  visit: {
    id: 'visit-1', employeeId: 'employee-1', visitDate: new Date('2026-01-01T00:00:00Z'), status: 'SCHEDULED',
    patient: { id: 'patient-1', patientCode: 'TEST-1', fullName: 'Synthetic patient' },
  },
  items: [{
    id: 'item-1', medicineId: 'medicine-1', quantity: { toString: () => '2.5' }, dosage: 'Doctor supplied instruction',
    medicine: { id: 'medicine-1', name: 'Synthetic medicine', unit: 'tablet', status: 'ACTIVE' },
  }],
};

function actor(permissionCodes: string[], roleName = 'Synthetic role'): AuthActor {
  return {
    accountId: 'account-1', sessionId: 'session-1', username: 'synthetic', employeeId: 'employee-1', employeeName: 'Synthetic doctor',
    roleNames: [roleName], rolePermissions: [{ roleName, permissionCodes }],
  };
}

function repository(): IPrescriptionsRepository {
  return {
    findByIdForEmployee: vi.fn(async () => record),
    findManyForEmployee: vi.fn(async () => [record]),
    findAssignedVisits: vi.fn(async () => [{
      id: 'visit-1', visitDate: new Date('2026-01-01T00:00:00Z'), status: 'SCHEDULED', patient: record.visit.patient,
    }]),
    findActiveMedicines: vi.fn(async () => [{ id: 'medicine-1', name: 'Synthetic medicine', unit: 'tablet', status: 'ACTIVE' }]),
    createForAssignedVisit: vi.fn(async () => 'rx-1'),
    replaceOwnDraftItems: vi.fn(async () => undefined),
  };
}

describe('PrescriptionsService', () => {
  it('limits listing to the authenticated employee and maps only prescription-safe fields', async () => {
    const repo = repository();
    const service = new PrescriptionsService(repo);
    const result = await service.getList(actor(['PRESCRIPTION_READ']), 'synthetic');

    expect(repo.findManyForEmployee).toHaveBeenCalledWith('employee-1', 'synthetic');
    expect(result.canWrite).toBe(false);
    expect(result.prescriptions[0]).toMatchObject({
      id: 'rx-1', status: 'DRAFT', employeeName: 'Synthetic doctor', canEdit: false,
      visit: { patient: { patientCode: 'TEST-1', fullName: 'Synthetic patient' } },
      items: [{ quantity: '2.5', medicine: { name: 'Synthetic medicine', unit: 'tablet' } }],
    });
    expect(result.prescriptions[0]).not.toHaveProperty('unitCost');
    expect(result.prescriptions[0].items[0].medicine).not.toHaveProperty('unitCost');
  });

  it('requires the requested permission from a role on the authenticated actor', async () => {
    const service = new PrescriptionsService(repository());
    await expect(service.getList(actor(['EMR_READ']))).rejects.toThrow('PRESCRIPTION_ACCESS_DENIED');
    await expect(service.getMedicines(actor(['PRESCRIPTION_READ']))).rejects.toThrow('PRESCRIPTION_ACCESS_DENIED');
  });

  it('does not combine read and write grants from different roles', async () => {
    const splitRoleActor: AuthActor = {
      ...actor(['PRESCRIPTION_READ'], 'Reader'),
      roleNames: ['Reader', 'Writer'],
      rolePermissions: [
        { roleName: 'Reader', permissionCodes: ['PRESCRIPTION_READ'] },
        { roleName: 'Writer', permissionCodes: ['PRESCRIPTION_WRITE'] },
      ],
    };
    const service = new PrescriptionsService(repository());
    const result = await service.getList(splitRoleActor);
    expect(result.canWrite).toBe(false);
    await expect(service.create(splitRoleActor, {
      visitId: 'visit-1', items: [{ medicineId: 'medicine-1', quantity: 1, dosage: 'Synthetic' }],
    })).rejects.toThrow('PRESCRIPTION_ACCESS_DENIED');
  });

  it('uses the server session employee for writes and reads the saved record back', async () => {
    const repo = repository();
    const service = new PrescriptionsService(repo);
    const result = await service.create(actor(['PRESCRIPTION_READ', 'PRESCRIPTION_WRITE']), {
      visitId: 'visit-1', items: [{ medicineId: 'medicine-1', quantity: 2, dosage: 'Doctor supplied instruction' }],
    });

    expect(repo.createForAssignedVisit).toHaveBeenCalledWith('employee-1', 'visit-1', [
      { medicineId: 'medicine-1', quantity: 2, dosage: 'Doctor supplied instruction' },
    ]);
    expect(repo.findByIdForEmployee).toHaveBeenCalledWith('rx-1', 'employee-1');
    expect(result.canEdit).toBe(true);
  });

  it('requires a role containing prescription permission instead of EMR permissions', async () => {
    const service = new PrescriptionsService(repository());
    await expect(service.getById(actor(['EMR_READ']), 'rx-1')).rejects.toThrow('PRESCRIPTION_ACCESS_DENIED');
  });
});

describe('PrescriptionsValidator', () => {
  const validator = new PrescriptionsValidator();

  it('accepts a positive decimal quantity and doctor-entered dosage text', () => {
    expect(validator.parseCreate({
      visitId: 'visit-1', items: [{ medicineId: 'medicine-1', quantity: 0.5, dosage: 'Entered by prescriber' }],
    })).toEqual({ visitId: 'visit-1', items: [{ medicineId: 'medicine-1', quantity: 0.5, dosage: 'Entered by prescriber' }] });
  });

  it('rejects empty lists, invalid quantity, blank dosage, and client-supplied prescriber/status fields', () => {
    expect(() => validator.parseCreate({ visitId: 'visit-1', items: [] })).toThrow();
    expect(() => validator.parseCreate({ visitId: 'visit-1', items: [{ medicineId: 'm1', quantity: 0, dosage: 'x' }] })).toThrow();
    expect(() => validator.parseCreate({ visitId: 'visit-1', items: [{ medicineId: 'm1', quantity: 1, dosage: ' ' }] })).toThrow();
    expect(() => validator.parseCreate({ visitId: 'visit-1', employeeId: 'client-employee', status: 'APPROVED', items: [{ medicineId: 'm1', quantity: 1, dosage: 'x' }] })).toThrow();
  });
});
