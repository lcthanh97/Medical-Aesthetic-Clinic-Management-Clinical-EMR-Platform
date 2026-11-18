import { describe, expect, it, vi } from 'vitest';
vi.mock('@/infrastructure/database/repositories/PrismaFollowUpRepository', () => ({ PrismaFollowUpRepository: class { getDerivedSignals = vi.fn(async () => ({ notified: false, booked: false, completed: false })); } }));
vi.mock('@/infrastructure/database/prisma', () => ({ default: {} }));
vi.mock('@/server/auth/patient-session', () => ({ getPatientSession: vi.fn(async () => null) }));
vi.mock('@/server/services/FollowUpService', () => ({ deriveFollowUpStatus: vi.fn(() => null) }));
vi.mock('@/server/services/FollowUpApi', () => ({ followUpSameOrigin: vi.fn(() => true) }));
import { confirmPatientFollowUp, createPatientFollowUpHandlers } from '@/app/api/patients/follow-ups/[[...segments]]/handlers';

describe('patient follow-up handlers', () => {
  it('only confirms a plan when it belongs to the session patient and has an eligible linked appointment', async () => {
    const writePatientConfirmation = vi.fn(async () => undefined);
    const tx = {
      findConfirmedPlan: vi.fn(async (patientId: string, planId: string) => patientId === 'patient-a' && planId === 'plan-a' ? { id: planId, appointmentId: 'appointment-a' } : null),
      hasPatientConfirmation: vi.fn(async () => false),
      writePatientConfirmation,
    };

    await expect(confirmPatientFollowUp(tx, 'patient-b', 'plan-a')).resolves.toBe('NOT_FOUND');
    await expect(confirmPatientFollowUp(tx, 'patient-a', 'plan-a')).resolves.toBe('CONFIRMED');
    expect(writePatientConfirmation).toHaveBeenCalledWith({ patientId: 'patient-a', planId: 'plan-a', appointmentId: 'appointment-a' });
  });

  it('does not confirm a plan without an eligible appointment and treats repeat confirmation as idempotent', async () => {
    const tx = {
      findConfirmedPlan: vi.fn(async (_patientId: string, planId: string) => ({ id: planId, appointmentId: null })),
      hasPatientConfirmation: vi.fn(async () => true),
      writePatientConfirmation: vi.fn(async () => undefined),
    };
    await expect(confirmPatientFollowUp(tx, 'patient-a', 'plan-a')).resolves.toBe('ALREADY_CONFIRMED');
    tx.hasPatientConfirmation.mockResolvedValue(false);
    await expect(confirmPatientFollowUp(tx, 'patient-a', 'plan-a')).resolves.toBe('NO_ELIGIBLE_APPOINTMENT');
    expect(tx.writePatientConfirmation).not.toHaveBeenCalled();
  });

  it('keeps unauthenticated requests private and does not query patient plans', async () => {
    const listPlans = vi.fn(async () => []);
    const handlers = createPatientFollowUpHandlers({
      getSession: async () => null,
      listPlans,
      confirmPlan: vi.fn(),
      isSameOrigin: () => true,
    });
    const response = await handlers.GET();
    expect(response.status).toBe(401);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(listPlans).not.toHaveBeenCalled();
  });
});
