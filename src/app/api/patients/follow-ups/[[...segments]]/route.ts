import { NextRequest } from 'next/server';
import { PrismaFollowUpRepository } from '@/infrastructure/database/repositories/PrismaFollowUpRepository';
import prisma from '@/infrastructure/database/prisma';
import { getPatientSession } from '@/server/auth/patient-session';
import { deriveFollowUpStatus } from '@/server/services/FollowUpService';
import { followUpSameOrigin } from '@/server/services/FollowUpApi';

type PatientSession = { patientId: string };
type ConfirmOutcome = 'CONFIRMED' | 'ALREADY_CONFIRMED' | 'NOT_FOUND' | 'NO_ELIGIBLE_APPOINTMENT';

export type PatientFollowUpDto = {
  id: string;
  decision: string;
  targetDate: string | null;
  windowDays: number | null;
  priority: string;
  patientMessage: string | null;
  preparation: string | null;
  homeCare: string | null;
  avoid: string | null;
  warningSigns: string | null;
  doctorName: string | null;
  appointment: { scheduledAt: string; status: string; doctorName: string | null; roomName: string | null } | null;
  derivedStatus: string | null;
  canConfirmArrival: boolean;
};

type PatientFollowUpTx = {
  findConfirmedPlan(patientId: string, planId: string, now: Date): Promise<{ id: string; appointmentId: string | null } | null>;
  hasPatientConfirmation(patientId: string, planId: string): Promise<boolean>;
  writePatientConfirmation(input: { patientId: string; planId: string; appointmentId: string }): Promise<void>;
};

export async function confirmPatientFollowUp(tx: PatientFollowUpTx, patientId: string, planId: string, now = new Date()): Promise<ConfirmOutcome> {
  const plan = await tx.findConfirmedPlan(patientId, planId, now);
  if (!plan) return 'NOT_FOUND';
  if (await tx.hasPatientConfirmation(patientId, planId)) return 'ALREADY_CONFIRMED';
  if (!plan.appointmentId) return 'NO_ELIGIBLE_APPOINTMENT';
  await tx.writePatientConfirmation({ patientId, planId, appointmentId: plan.appointmentId });
  return 'CONFIRMED';
}

async function listPatientFollowUps(patientId: string): Promise<PatientFollowUpDto[]> {
  const now = new Date();
  const plans = await prisma.followUpPlan.findMany({
    where: { patientId, status: 'CONFIRMED' },
    orderBy: [{ targetDate: 'asc' }, { updatedAt: 'desc' }],
    take: 100,
    select: {
      id: true,
      patientId: true,
      decision: true,
      status: true,
      targetDate: true,
      windowDays: true,
      priority: true,
      patientMessage: true,
      preparation: true,
      homeCare: true,
      avoid: true,
      warningSigns: true,
      confirmedAt: true,
      doctor: { select: { fullName: true } },
      appointments: {
        where: { patientId, scheduledAt: { gt: now }, status: { notIn: ['CANCELLED', 'CANCELED', 'COMPLETED', 'DONE'] } },
        orderBy: { scheduledAt: 'asc' },
        take: 1,
        select: { id: true, scheduledAt: true, status: true, employee: { select: { fullName: true } }, room: { select: { name: true } } },
      },
    },
  });

  if (!plans.length) return [];
  const ids = plans.map((plan) => plan.id);
  const [confirmationLogs, repository] = await Promise.all([
    prisma.auditLog.findMany({
      where: { entity: 'FollowUpPlan', entityId: { in: ids }, action: 'PATIENT_CONFIRMED_FOLLOWUP', accountId: null },
      orderBy: { createdAt: 'desc' },
      take: ids.length * 20,
      select: { entityId: true, metadata: true },
    }),
    Promise.resolve(new PrismaFollowUpRepository()),
  ]);
  const patientConfirmed = new Set<string>();
  for (const log of confirmationLogs) {
    const metadata = log.metadata && typeof log.metadata === 'object' && !Array.isArray(log.metadata)
      ? log.metadata as Record<string, unknown>
      : null;
    if (log.entityId && metadata?.actorType === 'PATIENT' && metadata.patientId === patientId && metadata.planId === log.entityId) {
      patientConfirmed.add(log.entityId);
    }
  }

  return Promise.all(plans.map(async (plan): Promise<PatientFollowUpDto> => {
    const appointment = plan.appointments[0] ?? null;
    const signals = await repository.getDerivedSignals(
      plan.id,
      patientId,
      plan.confirmedAt,
      plan.targetDate,
      plan.windowDays,
    );
    const baseStatus = deriveFollowUpStatus(signals, { status: plan.status, targetDate: plan.targetDate, windowDays: plan.windowDays }, now);
    const derivedStatus = baseStatus === 'COMPLETED' || baseStatus === 'OVERDUE'
      ? baseStatus
      : patientConfirmed.has(plan.id)
        ? 'PATIENT_CONFIRMED'
        : baseStatus;
    const canConfirmArrival = Boolean(appointment
      && appointment.scheduledAt > now
      && !['CANCELLED', 'CANCELED', 'COMPLETED', 'DONE'].includes(appointment.status.toUpperCase()));

    return {
      id: plan.id,
      decision: plan.decision,
      targetDate: plan.targetDate?.toISOString() ?? null,
      windowDays: plan.windowDays,
      priority: plan.priority,
      patientMessage: plan.patientMessage,
      preparation: plan.preparation,
      homeCare: plan.homeCare,
      avoid: plan.avoid,
      warningSigns: plan.warningSigns,
      doctorName: plan.doctor.fullName,
      appointment: appointment ? {
        scheduledAt: appointment.scheduledAt.toISOString(),
        status: appointment.status,
        doctorName: appointment.employee?.fullName ?? null,
        roomName: appointment.room?.name ?? null,
      } : null,
      derivedStatus,
      canConfirmArrival,
    };
  }));
}

async function confirmInDatabase(patientId: string, planId: string): Promise<ConfirmOutcome> {
  return prisma.$transaction(async (tx) => confirmPatientFollowUp({
    findConfirmedPlan: async (ownerId, requestedPlanId, now) => {
      const plan = await tx.followUpPlan.findFirst({
        where: { id: requestedPlanId, patientId: ownerId, status: 'CONFIRMED' },
        select: {
          id: true,
          appointments: {
            where: {
              patientId: ownerId,
              followUpPlanId: requestedPlanId,
              scheduledAt: { gt: now },
              status: { notIn: ['CANCELLED', 'CANCELED', 'COMPLETED', 'DONE'] },
            },
            orderBy: { scheduledAt: 'asc' },
            take: 1,
            select: { id: true },
          },
        },
      });
      return plan ? { id: plan.id, appointmentId: plan.appointments[0]?.id ?? null } : null;
    },
    hasPatientConfirmation: async (ownerId, requestedPlanId) => {
      const logs = await tx.auditLog.findMany({
        where: { entity: 'FollowUpPlan', entityId: requestedPlanId, action: 'PATIENT_CONFIRMED_FOLLOWUP', accountId: null },
        take: 20,
        select: { metadata: true },
      });
      return logs.some((log) => {
        const metadata = log.metadata && typeof log.metadata === 'object' && !Array.isArray(log.metadata)
          ? log.metadata as Record<string, unknown>
          : null;
        return metadata?.actorType === 'PATIENT' && metadata.patientId === ownerId && metadata.planId === requestedPlanId;
      });
    },
    writePatientConfirmation: async ({ patientId: ownerId, planId: requestedPlanId, appointmentId }) => {
      await tx.auditLog.create({
        data: {
          accountId: null,
          action: 'PATIENT_CONFIRMED_FOLLOWUP',
          entity: 'FollowUpPlan',
          entityId: requestedPlanId,
          metadata: { actorType: 'PATIENT', patientId: ownerId, planId: requestedPlanId, appointmentId },
        },
      });
    },
  }, patientId, planId), { isolationLevel: 'Serializable', maxWait: 10_000, timeout: 15_000 });
}

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}

function debugLog(method: string, status: number, reasonCode: string, records: number) {
  if (process.env.FOLLOWUP_DEBUG_LOG === 'true') {
    console.info(JSON.stringify({ route: '/api/patients/follow-ups', method, status, reasonCode, records }));
  }
}

type HandlerDependencies = {
  getSession: () => Promise<PatientSession | null>;
  listPlans: (patientId: string) => Promise<PatientFollowUpDto[]>;
  confirmPlan: (patientId: string, planId: string) => Promise<ConfirmOutcome>;
  isSameOrigin: (request: Request) => boolean;
};

export function createPatientFollowUpHandlers(deps: HandlerDependencies) {
  return {
    GET: async () => {
      const session = await deps.getSession().catch(() => null);
      if (!session) {
        debugLog('GET', 401, 'UNAUTHENTICATED', 0);
        return json({ success: false, error: 'Vui lòng đăng nhập để xem nhắc tái khám.' }, 401);
      }
      try {
        const plans = await deps.listPlans(session.patientId);
        debugLog('GET', 200, 'OK', plans.length);
        return json({ success: true, plans });
      } catch {
        debugLog('GET', 500, 'INTERNAL_ERROR', 0);
        return json({ success: false, error: 'Chưa thể tải hướng dẫn tái khám lúc này.' }, 500);
      }
    },
    POST: async (request: Request, planId: string) => {
      if (!deps.isSameOrigin(request)) {
        debugLog('POST', 403, 'FORBIDDEN', 0);
        return json({ success: false, error: 'Yêu cầu không hợp lệ.' }, 403);
      }
      const session = await deps.getSession().catch(() => null);
      if (!session) {
        debugLog('POST', 401, 'UNAUTHENTICATED', 0);
        return json({ success: false, error: 'Vui lòng đăng nhập để xác nhận.' }, 401);
      }
      if (!planId || planId.length > 100) {
        debugLog('POST', 404, 'NOT_FOUND', 0);
        return json({ success: false, error: 'Không tìm thấy kế hoạch tái khám.' }, 404);
      }
      try {
        const result = await deps.confirmPlan(session.patientId, planId);
        if (result === 'NOT_FOUND') {
          debugLog('POST', 404, 'NOT_FOUND', 0);
          return json({ success: false, error: 'Không tìm thấy kế hoạch tái khám.' }, 404);
        }
        if (result === 'NO_ELIGIBLE_APPOINTMENT') {
          debugLog('POST', 409, 'FORBIDDEN', 0);
          return json({ success: false, error: 'Chỉ có thể xác nhận khi kế hoạch đã liên kết với lịch hẹn sắp tới.' }, 409);
        }
        debugLog('POST', 200, 'OK', 1);
        return json({ success: true, alreadyConfirmed: result === 'ALREADY_CONFIRMED' });
      } catch {
        debugLog('POST', 500, 'INTERNAL_ERROR', 0);
        return json({ success: false, error: 'Chưa thể xác nhận lúc này. Vui lòng thử lại.' }, 500);
      }
    },
  };
}

const handlers = createPatientFollowUpHandlers({
  getSession: async () => getPatientSession(),
  listPlans: listPatientFollowUps,
  confirmPlan: confirmInDatabase,
  isSameOrigin: (request) => followUpSameOrigin(request as NextRequest),
});

type RouteContext = { params: Promise<{ segments?: string[] }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { segments } = await params;
  if (segments?.length) return json({ success: false, error: 'Không tìm thấy yêu cầu.' }, 404);
  return handlers.GET();
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { segments } = await params;
  if (!segments || segments.length !== 2 || segments[1] !== 'confirm') return json({ success: false, error: 'Không tìm thấy yêu cầu.' }, 404);
  return handlers.POST(request, segments[0]);
}
