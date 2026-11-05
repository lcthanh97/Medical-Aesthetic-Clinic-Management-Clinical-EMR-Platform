import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IEmrRepository } from '@/server/repositories/IEmrRepository';
import { EmrService } from '@/server/services/EmrService';
import { PrismaEmrRepository } from '@/infrastructure/database/repositories/PrismaEmrRepository';

const tx = vi.hoisted(() => ({
  refreshToken: { findFirst: vi.fn() },
  visit: { findFirst: vi.fn() },
  medicalRecord: { create: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn() },
}));
const db = vi.hoisted(() => ({
  patient: { findFirst: vi.fn(), findMany: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock('@/infrastructure/database/prisma', () => ({ prisma: db }));

const ACTOR = { accountId: 'account-1', employeeId: 'employee-1', sessionId: 'session-1' };
const WRITE_ROLES = ['Bác sĩ da liễu', 'Bác sĩ điều trị'];

describe('EmrService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.$transaction.mockImplementation(async (callback: (transaction: typeof tx) => unknown) => callback(tx));
    tx.refreshToken.findFirst.mockResolvedValue({ id: 'session-1' });
    tx.visit.findFirst.mockResolvedValue({ id: 'visit-1' });
  });

  it('rejects a medical record without a visit id before reaching persistence', async () => {
    const saveMedicalRecord = vi.fn();
    const service = new EmrService({ saveMedicalRecord } as unknown as IEmrRepository);

    await expect(service.saveMedicalRecord('  ', ACTOR, WRITE_ROLES, {}, null)).rejects.toThrow('Thiếu mã lượt khám');
    expect(saveMedicalRecord).not.toHaveBeenCalled();
  });

  it('rejects writes without a trusted employee scope', async () => {
    const saveMedicalRecord = vi.fn();
    const service = new EmrService({ saveMedicalRecord } as unknown as IEmrRepository);

    await expect(service.saveMedicalRecord('visit-1', { ...ACTOR, employeeId: '' }, WRITE_ROLES, {}, null)).rejects.toThrow('Employee is required');
    expect(saveMedicalRecord).not.toHaveBeenCalled();
  });

  it('rejects non-string values in fields supported by MedicalRecord', async () => {
    const saveMedicalRecord = vi.fn();
    const service = new EmrService({ saveMedicalRecord } as unknown as IEmrRepository);

    await expect(
      service.saveMedicalRecord('visit-1', ACTOR, WRITE_ROLES, { preliminaryDiagnosis: 12 as unknown as string }, null)
    ).rejects.toThrow('Chẩn đoán sơ bộ phải là chuỗi');
    expect(saveMedicalRecord).not.toHaveBeenCalled();
  });

  it('delegates valid fields with the server-derived actor and approved-role scope', async () => {
    const expected = { id: 'record-1', visitId: 'visit-1' };
    const snapshot = { preliminaryDiagnosis: null, finalDiagnosis: null, notes: null };
    const saveMedicalRecord = vi.fn().mockResolvedValue(expected);
    const service = new EmrService({ saveMedicalRecord } as unknown as IEmrRepository);
    const input = { preliminaryDiagnosis: 'Synthetic', finalDiagnosis: '', notes: 'Synthetic note' };

    await expect(service.saveMedicalRecord('visit-1', ACTOR, WRITE_ROLES, input, snapshot)).resolves.toEqual(expected);
    expect(saveMedicalRecord).toHaveBeenCalledWith('visit-1', ACTOR, WRITE_ROLES, input, snapshot);
  });

  it('requires an employee id before querying the patient list', async () => {
    const findManyForEmployee = vi.fn();
    const service = new EmrService({ findManyForEmployee } as unknown as IEmrRepository);

    await expect(service.getList('', 'synthetic')).rejects.toThrow('Employee is required');
    expect(findManyForEmployee).not.toHaveBeenCalled();
  });

  it('requires a non-empty patient id before loading an assigned-Visit EMR', async () => {
    const getPatientFullEMRForEmployee = vi.fn();
    const service = new EmrService({ getPatientFullEMRForEmployee } as unknown as IEmrRepository);

    await expect(service.getPatientFullEMR('', 'employee-1')).rejects.toThrow('Thiếu mã bệnh nhân');
    expect(getPatientFullEMRForEmployee).not.toHaveBeenCalled();
  });

  it('requires a trusted actor and visit id before loading an examination Visit', async () => {
    const getAssignedVisitForEmployee = vi.fn();
    const service = new EmrService({ getAssignedVisitForEmployee } as unknown as IEmrRepository);

    await expect(service.getAssignedVisit('', ACTOR)).rejects.toThrow('Thiếu mã lượt khám.');
    await expect(service.getAssignedVisit('visit-1', { ...ACTOR, sessionId: '' })).rejects.toThrow('Session is required');
    expect(getAssignedVisitForEmployee).not.toHaveBeenCalled();
  });
});

describe('PrismaEmrRepository access scope and MedicalRecord concurrency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.$transaction.mockImplementation(async (callback: (transaction: typeof tx) => unknown) => callback(tx));
    tx.refreshToken.findFirst.mockResolvedValue({ id: 'session-1' });
    tx.visit.findFirst.mockResolvedValue({ id: 'visit-1' });
  });

  it('filters the patient search to assigned Visits and excludes patient-wide sensitive relations', async () => {
    const repository = new PrismaEmrRepository();
    db.patient.findMany.mockResolvedValue([]);

    await repository.findManyForEmployee('employee-1', 'synthetic');

    expect(db.patient.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ visits: { some: { employeeId: 'employee-1' } } }),
      select: expect.not.objectContaining({ allergies: expect.anything(), histories: expect.anything(), treatmentPlans: expect.anything() }),
    }));
  });

  it('returns only visits assigned to the employee and only their MedicalRecord', async () => {
    const repository = new PrismaEmrRepository();
    db.patient.findFirst.mockResolvedValue(null);

    await repository.getPatientFullEMRForEmployee('patient-1', 'employee-1');

    expect(db.patient.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'patient-1', visits: { some: { employeeId: 'employee-1' } } },
      select: expect.objectContaining({
        visits: expect.objectContaining({
          where: { employeeId: 'employee-1' },
          select: expect.objectContaining({ medicalRecord: expect.any(Object) }),
        }),
      }),
    }));
  });

  it('selects demographics and only permission-scoped data attached to assigned Visits', async () => {
    const plan = { id: 'plan-1', visitId: 'visit-1', name: 'Synthetic plan', stages: [] };
    db.patient.findFirst.mockResolvedValue({
      id: 'patient-1', fullName: 'Synthetic patient', patientCode: 'SYN-1', dateOfBirth: null, phone: null,
      visits: [{ id: 'visit-1', treatmentPlans: [plan] }],
    });
    const repository = new PrismaEmrRepository();

    const result = await repository.getPatientFullEMRForEmployee('patient-1', 'employee-1', {
      prescriptions: true, treatmentPlans: true, clinicalOrders: true,
    });

    expect(result?.treatmentPlans).toEqual([plan]);
    expect(db.patient.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'patient-1', visits: { some: { employeeId: 'employee-1' } } },
      select: expect.objectContaining({
        dateOfBirth: true,
        phone: true,
        visits: expect.objectContaining({
          where: { employeeId: 'employee-1' },
          select: expect.objectContaining({
            prescriptions: expect.any(Object),
            orders: expect.any(Object),
            treatmentPlans: expect.any(Object),
          }),
        }),
      }),
    }));
    const query = db.patient.findFirst.mock.calls[0][0];
    expect(query.select).not.toHaveProperty('allergies');
    expect(query.select).not.toHaveProperty('histories');
  });

  it('reads examination data only for a session-linked, active account assigned to that Visit', async () => {
    const visit = { id: 'visit-1', patientId: 'patient-1', medicalRecord: null };
    tx.visit.findFirst.mockResolvedValue(visit);
    const repository = new PrismaEmrRepository();

    await expect(repository.getAssignedVisitForEmployee('visit-1', ACTOR, { prescriptions: false, treatmentPlans: false, clinicalOrders: true })).resolves.toEqual(visit);

    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
    expect(tx.refreshToken.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'session-1', accountId: 'account-1', revokedAt: null, expiresAt: expect.any(Object) }),
    }));
    expect(tx.visit.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: 'visit-1', employeeId: 'employee-1',
        employee: expect.objectContaining({ is: expect.objectContaining({
          accountId: 'account-1',
          account: expect.objectContaining({ is: expect.objectContaining({
            status: 'ACTIVE', roles: expect.objectContaining({ some: expect.any(Object) }),
          }) }),
        }) }),
      }),
      select: expect.objectContaining({ patient: expect.any(Object), medicalRecord: expect.any(Object), orders: expect.any(Object) }),
    }));
    const query = tx.visit.findFirst.mock.calls[0][0];
    expect(query.select).not.toHaveProperty('patient.allergies');
    expect(query.select).not.toHaveProperty('patient.histories');
  });

  it('rechecks active Account, exact employee assignment and same-role EMR_WRITE in a serializable transaction before create', async () => {
    const expected = { id: 'record-1', visitId: 'visit-1' };
    tx.medicalRecord.create.mockResolvedValue(expected);
    const repository = new PrismaEmrRepository();

    await expect(repository.saveMedicalRecord('visit-1', ACTOR, WRITE_ROLES, { notes: 'Synthetic' }, null)).resolves.toEqual(expected);

    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
    expect(tx.refreshToken.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'session-1', accountId: 'account-1', revokedAt: null }),
    }));
    expect(tx.visit.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: 'visit-1', employeeId: 'employee-1',
        employee: expect.objectContaining({ is: expect.objectContaining({
          accountId: 'account-1',
          account: expect.objectContaining({ is: expect.objectContaining({
            status: 'ACTIVE',
            roles: expect.objectContaining({ some: expect.objectContaining({ role: expect.any(Object) }) }),
          }) }),
        }) }),
      }),
    }));
    expect(tx.medicalRecord.create).toHaveBeenCalledWith({
      data: { visitId: 'visit-1', preliminaryDiagnosis: '', finalDiagnosis: '', notes: 'Synthetic' },
    });
  });

  it('does not write when the assigned Visit authorization query fails', async () => {
    tx.visit.findFirst.mockResolvedValue(null);
    const repository = new PrismaEmrRepository();

    await expect(repository.saveMedicalRecord('visit-2', ACTOR, WRITE_ROLES, { notes: 'Synthetic' }, null)).rejects.toThrow('EMR access denied');
    expect(tx.medicalRecord.create).not.toHaveBeenCalled();
    expect(tx.medicalRecord.updateMany).not.toHaveBeenCalled();
  });

  it('updates only when the persisted fields still match the loaded snapshot', async () => {
    const expected = { id: 'record-1', visitId: 'visit-1', preliminaryDiagnosis: 'Old', finalDiagnosis: null, notes: 'Old' };
    tx.medicalRecord.updateMany.mockResolvedValue({ count: 1 });
    tx.medicalRecord.findUnique.mockResolvedValue(expected);
    const repository = new PrismaEmrRepository();

    await expect(repository.saveMedicalRecord('visit-1', ACTOR, WRITE_ROLES, { notes: 'New' }, {
      preliminaryDiagnosis: 'Old', finalDiagnosis: null, notes: 'Old',
    })).resolves.toEqual(expected);
    expect(tx.medicalRecord.updateMany).toHaveBeenCalledWith({
      where: { visitId: 'visit-1', preliminaryDiagnosis: 'Old', finalDiagnosis: null, notes: 'Old' },
      data: { preliminaryDiagnosis: undefined, finalDiagnosis: undefined, notes: 'New' },
    });
  });

  it('reports a concurrent update instead of overwriting a newer record', async () => {
    tx.medicalRecord.updateMany.mockResolvedValue({ count: 0 });
    const repository = new PrismaEmrRepository();

    await expect(repository.saveMedicalRecord('visit-1', ACTOR, WRITE_ROLES, { notes: 'Stale edit' }, {
      preliminaryDiagnosis: null, finalDiagnosis: null, notes: 'Original',
    })).rejects.toThrow('Bệnh án đã thay đổi ở nơi khác');
    expect(tx.medicalRecord.findUnique).not.toHaveBeenCalled();
  });

  it('maps a concurrent create to a reloadable conflict', async () => {
    tx.medicalRecord.create.mockRejectedValue({ code: 'P2002' });
    const repository = new PrismaEmrRepository();

    await expect(repository.saveMedicalRecord('visit-1', ACTOR, WRITE_ROLES, {}, null)).rejects.toThrow('Bệnh án đã được tạo ở nơi khác');
  });
});
