import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  process.env.EMR_AUTHORIZATION_ENABLED = 'true';
  process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:55432/emr_test';
  return {
    actor: null as any,
    service: {
      getList: vi.fn(),
      getPatientFullEMR: vi.fn(),
      getAssignedVisit: vi.fn(),
      getTreatmentImageTimeline: vi.fn(),
      getTreatmentImageDetails: vi.fn(),
      compareTreatmentImages: vi.fn(),
      createPatient: vi.fn(),
      updatePatient: vi.fn(),
      saveMedicalRecord: vi.fn(),
      addPatientAllergy: vi.fn(),
      addPatientHistory: vi.fn(),
      createQuickVisit: vi.fn(),
    },
  };
});

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: () => ({ value: 'synthetic-session-cookie' }) })),
}));
vi.mock('@/infrastructure/database/repositories/PrismaAuthRepository', () => ({ PrismaAuthRepository: vi.fn() }));
vi.mock('@/server/services/AuthService', () => ({
  AuthService: vi.fn(function AuthServiceMock() {
    return { getSession: vi.fn(async () => mocks.actor) };
  }),
}));
vi.mock('@/infrastructure/database/repositories/PrismaEmrRepository', () => ({ PrismaEmrRepository: vi.fn() }));
vi.mock('@/server/services/EmrService', () => ({
  EmrService: vi.fn(function EmrServiceMock() { return mocks.service; }),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import {
  addPatientAllergy,
  addPatientHistory,
  createPatient,
  createQuickVisit,
  getPatientFullEMR,
  getAssignedVisitExamination,
  getPatients,
  getTreatmentImageTimeline,
  getTreatmentImageDetails,
  compareTreatmentImages,
  saveMedicalRecord,
  saveExaminationMedicalRecord,
  updatePatient,
} from '@/features/emr/actions';

const dermatologist = {
  accountId: 'account-1', sessionId: 'session-1', username: 'synthetic.doctor', employeeId: 'employee-1', employeeName: 'Synthetic Doctor',
  roleNames: ['Bác sĩ da liễu'],
  rolePermissions: [{ roleName: 'Bác sĩ da liễu', permissionCodes: ['EMR_READ', 'EMR_WRITE'] }],
};

describe('EMR Server Actions authorization boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.actor = null;
  });

  it('fails closed without a server-verified session before calling any EMR service', async () => {
    const results = await Promise.all([
      getPatients(), getPatientFullEMR('patient-1'), saveMedicalRecord('visit-1', {}, null),
      getTreatmentImageTimeline('patient-1'), getTreatmentImageDetails('patient-1', 'image-1'),
      compareTreatmentImages('patient-1', ['image-1', 'image-2']),
      createPatient({ fullName: 'Synthetic' }), updatePatient('patient-1', {}),
      addPatientAllergy('patient-1', { substance: 'Synthetic' }),
      addPatientHistory('patient-1', { type: 'Synthetic', content: 'Synthetic' }),
      createQuickVisit('patient-1', {}),
    ]);

    expect(results.every((result) => result.success === false)).toBe(true);
    expect(Object.values(mocks.service).every((operation) => operation.mock.calls.length === 0)).toBe(true);
  });

  it('lists and reads only via employee-scoped service methods for an approved reader', async () => {
    mocks.actor = dermatologist;
    mocks.service.getList.mockResolvedValue([{ id: 'patient-1', visits: [{ id: 'visit-1' }] }]);
    mocks.service.getPatientFullEMR.mockResolvedValue({ id: 'patient-1', visits: [{ id: 'visit-1' }] });

    const list = await getPatients('synthetic search');
    const detail = await getPatientFullEMR('patient-1');

    expect(mocks.service.getList).toHaveBeenCalledWith('employee-1', 'synthetic search');
    expect(mocks.service.getPatientFullEMR).toHaveBeenCalledWith('patient-1', 'employee-1', {
      prescriptions: false, treatmentPlans: false, clinicalOrders: false,
    });
    expect(list).toMatchObject({ success: true, canWrite: true });
    expect(list).toMatchObject({ canReadImages: false, canReadPrescriptions: false, canReadTreatmentPlans: false });
    expect(detail.success).toBe(true);
  });

  it('derives related-data scopes from the server session permissions, never from client input', async () => {
    mocks.actor = {
      ...dermatologist,
      rolePermissions: [{
        roleName: dermatologist.roleNames[0],
        permissionCodes: ['EMR_READ', 'IMAGE_READ', 'PRESCRIPTION_READ', 'TREATMENT_READ'],
      }],
    };
    mocks.service.getPatientFullEMR.mockResolvedValue({ id: 'patient-1', visits: [{ id: 'visit-1' }] });

    const result = await getPatientFullEMR('patient-1');

    expect(result.success).toBe(true);
    expect(mocks.service.getPatientFullEMR).toHaveBeenCalledWith('patient-1', 'employee-1', {
      prescriptions: true, treatmentPlans: true, clinicalOrders: true,
    });
  });

  it('loads only the requested assigned Visit and derives write/read capabilities from the verified session', async () => {
    mocks.actor = dermatologist;
    mocks.service.getAssignedVisit.mockResolvedValue({ id: 'visit-1', medicalRecord: null });

    const result = await getAssignedVisitExamination('visit-1');

    expect(mocks.service.getAssignedVisit).toHaveBeenCalledWith('visit-1', {
      accountId: 'account-1', employeeId: 'employee-1', sessionId: 'session-1',
    }, { prescriptions: false, treatmentPlans: false, clinicalOrders: false });
    expect(result).toMatchObject({ success: true, canWrite: true, canReadClinicalOrders: false, canReadPrescriptions: false });
  });

  it('fails closed for examination when the server session lacks an approved EMR reader role', async () => {
    mocks.actor = { ...dermatologist, rolePermissions: [{ roleName: 'Lá»… tÃ¢n', permissionCodes: ['EMR_READ'] }] };

    const result = await getAssignedVisitExamination('visit-1');

    expect(result.success).toBe(false);
    expect(mocks.service.getAssignedVisit).not.toHaveBeenCalled();
  });

  it('keeps the examination write action disabled outside the isolated local test database', async () => {
    mocks.actor = dermatologist;
    process.env.DATABASE_URL = 'postgresql://test:test@neon.example:5432/neondb';

    const result = await saveExaminationMedicalRecord('visit-1', { notes: 'Synthetic note' }, null);

    expect(result.success).toBe(false);
    expect(mocks.service.saveMedicalRecord).not.toHaveBeenCalled();
    process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:55432/emr_test';
  });

  it('allows resident read but denies write even if another unapproved role carries EMR_WRITE', async () => {
    mocks.actor = {
      ...dermatologist,
      roleNames: ['Bác sĩ nội trú', 'Lễ tân'],
      rolePermissions: [
        { roleName: 'Bác sĩ nội trú', permissionCodes: ['EMR_READ'] },
        { roleName: 'Lễ tân', permissionCodes: ['EMR_WRITE'] },
      ],
    };
    mocks.service.getList.mockResolvedValue([]);

    const list = await getPatients();
    const write = await saveMedicalRecord('visit-1', { notes: 'Synthetic' }, null);

    expect(list).toMatchObject({ success: true, canWrite: false });
    expect(write.success).toBe(false);
    expect(mocks.service.saveMedicalRecord).not.toHaveBeenCalled();
  });

  it('denies an approved role without the matching database permission', async () => {
    mocks.actor = {
      ...dermatologist,
      rolePermissions: [{ roleName: 'Bác sĩ da liễu', permissionCodes: ['EMR_READ'] }],
    };

    const result = await saveMedicalRecord('visit-1', { notes: 'Synthetic' }, null);
    expect(result.success).toBe(false);
    expect(mocks.service.saveMedicalRecord).not.toHaveBeenCalled();
  });

  it('requires IMAGE_READ in a verified role and scopes timeline, details, and comparison to the selected patient', async () => {
    mocks.actor = {
      ...dermatologist,
      rolePermissions: [{ roleName: 'Bác sĩ da liễu', permissionCodes: ['EMR_READ', 'IMAGE_READ'] }],
    };
    const syntheticImage = { id: 'image-1', planId: 'plan-1', visitId: 'visit-1', imageType: 'synthetic', phase: 'synthetic', capturedAt: new Date(), createdAt: new Date(), bodyArea: null, description: null, sessionId: null, plan: { id: 'plan-1', name: 'Synthetic plan' }, session: null };
    mocks.service.getTreatmentImageTimeline.mockResolvedValue([syntheticImage]);
    mocks.service.getTreatmentImageDetails.mockResolvedValue(syntheticImage);
    mocks.service.compareTreatmentImages.mockResolvedValue([syntheticImage, { ...syntheticImage, id: 'image-2' }]);

    const list = await getTreatmentImageTimeline('patient-1', { phase: 'synthetic' });
    const detail = await getTreatmentImageDetails('patient-1', 'image-1');
    const comparison = await compareTreatmentImages('patient-1', ['image-1', 'image-2']);

    expect(mocks.service.getTreatmentImageTimeline).toHaveBeenCalledWith(
      'patient-1', { accountId: 'account-1', employeeId: 'employee-1', sessionId: 'session-1' }, { phase: 'synthetic' },
    );
    expect(mocks.service.getTreatmentImageDetails).toHaveBeenCalledWith(
      'patient-1', 'image-1', { accountId: 'account-1', employeeId: 'employee-1', sessionId: 'session-1' },
    );
    expect(mocks.service.compareTreatmentImages).toHaveBeenCalledWith(
      'patient-1', ['image-1', 'image-2'], { accountId: 'account-1', employeeId: 'employee-1', sessionId: 'session-1' },
    );
    expect(list.success && 'imageUrl' in list.data[0]).toBe(false);
    expect(detail.success).toBe(true);
    expect(comparison).toMatchObject({ success: true, data: { sameBodyArea: false } });
  });

  it('denies image timeline to EMR readers without IMAGE_READ and rejects invalid filters', async () => {
    mocks.actor = dermatologist;
    const denied = await getTreatmentImageTimeline('patient-1');
    const invalidFilter = await getTreatmentImageTimeline('patient-1', { phase: ' '.repeat(201) });
    expect(denied.success).toBe(false);
    expect(invalidFilter.success).toBe(false);
    expect(mocks.service.getTreatmentImageTimeline).not.toHaveBeenCalled();
  });

  it('passes only server-derived actor scope and approved writer roles to the guarded write service', async () => {
    mocks.actor = dermatologist;
    mocks.service.saveMedicalRecord.mockResolvedValue({ id: 'record-1', visitId: 'visit-1' });

    const result = await saveMedicalRecord('visit-1', { notes: 'Synthetic' }, null);

    expect(mocks.service.saveMedicalRecord).toHaveBeenCalledWith(
      'visit-1',
      { accountId: 'account-1', employeeId: 'employee-1', sessionId: 'session-1' },
      ['Bác sĩ da liễu', 'Bác sĩ điều trị'],
      { notes: 'Synthetic' },
      null,
    );
    expect(result.success).toBe(true);
  });

  it('keeps allergy, history, patient-wide mutations and Visit creation blocked', async () => {
    mocks.actor = dermatologist;
    const results = await Promise.all([
      createPatient({ fullName: 'Synthetic' }), updatePatient('patient-1', {}),
      addPatientAllergy('patient-1', { substance: 'Synthetic' }),
      addPatientHistory('patient-1', { type: 'Synthetic', content: 'Synthetic' }),
      createQuickVisit('patient-1', { employeeId: 'client-supplied' }),
    ]);

    expect(results.every((result) => result.success === false)).toBe(true);
    expect(mocks.service.createPatient).not.toHaveBeenCalled();
    expect(mocks.service.updatePatient).not.toHaveBeenCalled();
    expect(mocks.service.addPatientAllergy).not.toHaveBeenCalled();
    expect(mocks.service.addPatientHistory).not.toHaveBeenCalled();
    expect(mocks.service.createQuickVisit).not.toHaveBeenCalled();
  });
});
