import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/infrastructure/database/prisma';
import { PrismaTreatmentsRepository } from '@/infrastructure/database/repositories/PrismaTreatmentsRepository';

const databaseUrl = (() => {
  try { return new URL(process.env.DATABASE_URL ?? ''); } catch { return null; }
})();
const isolatedDatabase = Boolean(
  databaseUrl && ['127.0.0.1', 'localhost'].includes(databaseUrl.hostname) &&
  databaseUrl.port === '55432' && databaseUrl.pathname === '/emr_test',
);

describe.skipIf(!isolatedDatabase)('Treatment assigned Visit PostgreSQL integration', () => {
  const suffix = randomUUID();
  const repository = new PrismaTreatmentsRepository();
  let employeeId = '';
  let otherEmployeeId = '';
  let patientId = '';
  let otherPatientId = '';
  let assignedVisitId = '';
  let otherVisitId = '';
  let planId = '';
  let stageId = '';
  let sessionId = '';
  let otherSessionId = '';
  let mismatchedPlanId = '';

  beforeAll(async () => {
    if (!isolatedDatabase) return;
    const employee = await prisma.employee.create({ data: { employeeCode: `TRT_${suffix}`, fullName: 'Synthetic treatment clinician' } });
    const otherEmployee = await prisma.employee.create({ data: { employeeCode: `TRT_OTHER_${suffix}`, fullName: 'Synthetic other clinician' } });
    const patient = await prisma.patient.create({ data: { patientCode: `TRT_${suffix}`, fullName: 'Synthetic treatment patient' } });
    const otherPatient = await prisma.patient.create({ data: { patientCode: `TRT_OTHER_${suffix}`, fullName: 'Synthetic other patient' } });
    employeeId = employee.id;
    otherEmployeeId = otherEmployee.id;
    patientId = patient.id;
    otherPatientId = otherPatient.id;
    const assignedVisit = await prisma.visit.create({ data: { patientId, employeeId, status: 'SYNTHETIC_TREATMENT_TEST' } });
    const otherVisit = await prisma.visit.create({ data: { patientId, employeeId: otherEmployeeId, status: 'SYNTHETIC_TREATMENT_TEST' } });
    assignedVisitId = assignedVisit.id;
    otherVisitId = otherVisit.id;
    const plan = await prisma.treatmentPlan.create({
      data: {
        patientId,
        visitId: assignedVisitId,
        name: 'Synthetic treatment plan',
        status: 'SYNTHETIC_READ_ONLY_TEST',
        version: 1,
        createdById: employeeId,
      },
    });
    planId = plan.id;
    const mismatchedPlan = await prisma.treatmentPlan.create({
      data: {
        patientId: otherPatientId,
        visitId: assignedVisitId,
        name: 'Synthetic mismatched patient plan',
        status: 'SYNTHETIC_READ_ONLY_TEST',
        version: 1,
        createdById: employeeId,
      },
    });
    mismatchedPlanId = mismatchedPlan.id;
    const stage = await prisma.treatmentStage.create({
      data: { planId, stageType: 'SYNTHETIC', name: 'Synthetic stage', orderNo: 1, status: 'SYNTHETIC_READ_ONLY_TEST' },
    });
    stageId = stage.id;
    const step = await prisma.treatmentStep.create({
      data: { stageId, orderNo: 1, content: 'Synthetic step', repeatCount: 1, status: 'SYNTHETIC_READ_ONLY_TEST' },
    });
    const session = await prisma.treatmentSession.create({
      data: { stageId, stepId: step.id, visitId: assignedVisitId, sessionNo: 1, status: 'SYNTHETIC_READ_ONLY_TEST' },
    });
    sessionId = session.id;
    const otherSession = await prisma.treatmentSession.create({
      data: { stageId, stepId: step.id, visitId: otherVisitId, sessionNo: 2, status: 'SYNTHETIC_OTHER_VISIT_TEST' },
    });
    otherSessionId = otherSession.id;
  });

  afterAll(async () => {
    if (!isolatedDatabase) return;
    if (sessionId || otherSessionId) await prisma.treatmentSession.deleteMany({ where: { id: { in: [sessionId, otherSessionId].filter(Boolean) } } });
    if (stageId) await prisma.treatmentStep.deleteMany({ where: { stageId } });
    if (planId) await prisma.treatmentStage.deleteMany({ where: { planId } });
    if (planId || mismatchedPlanId) await prisma.treatmentPlan.deleteMany({ where: { id: { in: [planId, mismatchedPlanId].filter(Boolean) } } });
    await prisma.visit.deleteMany({ where: { id: { in: [assignedVisitId, otherVisitId].filter(Boolean) } } });
    if (patientId) await prisma.patient.deleteMany({ where: { id: patientId } });
    if (otherPatientId) await prisma.patient.deleteMany({ where: { id: otherPatientId } });
    await prisma.employee.deleteMany({ where: { id: { in: [employeeId, otherEmployeeId].filter(Boolean) } } });
  });

  it('returns only the logged-in employee assigned Visits and their plan stages, steps, and sessions', async () => {
    const visits = await repository.getAssignedVisitsForEmployee(employeeId);
    expect(visits.map((visit) => visit.id)).toContain(assignedVisitId);
    expect(visits.map((visit) => visit.id)).not.toContain(otherVisitId);

    const plans = await repository.getPlansByVisitId(assignedVisitId, employeeId);
    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({ id: planId, visit: { id: assignedVisitId, patient: { id: patientId } } });
    expect(plans[0].stages[0].steps[0].content).toBe('Synthetic step');
    expect(plans[0].stages[0].sessions[0]).toMatchObject({ id: sessionId, visitId: assignedVisitId, step: { content: 'Synthetic step' } });
    expect(plans[0].stages[0].sessions).toHaveLength(1);
    expect(plans.map((plan) => plan.id)).not.toContain(mismatchedPlanId);
  });

  it('returns no plan to an employee who is not assigned to the Visit', async () => {
    expect(await repository.getPlansByVisitId(assignedVisitId, otherEmployeeId)).toEqual([]);
  });

  it('lists only consistent sessions in the assigned Visit scope and applies database filters', async () => {
    const sessions = await repository.getTreatmentSessions(employeeId, {
      q: 'Synthetic treatment patient', status: 'SYNTHETIC_READ_ONLY_TEST', visitId: assignedVisitId,
    });
    expect(sessions.map(({ id }) => id)).toEqual([sessionId]);
    expect(await repository.getTreatmentSessions(otherEmployeeId, {
      q: '', status: '', visitId: assignedVisitId,
    })).toEqual([]);
    expect(await repository.getTreatmentSessions(employeeId, {
      q: '', status: '', visitId: otherVisitId,
    })).toEqual([]);
  });
});
