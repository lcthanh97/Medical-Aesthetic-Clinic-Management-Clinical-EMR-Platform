import type { Prisma } from '@prisma/client';
import { prisma } from '@/infrastructure/database/prisma';
import { AppointmentsValidator } from '@/server/validators/AppointmentsValidator';
import { deriveFollowUpStatus } from '@/server/services/FollowUpService';
import type { BookingInput, ContactInput, ListInput, RescheduleInput } from './follow-up-reception.schema';

const inactive = ['CANCELLED', 'CANCELED', 'COMPLETED', 'DONE'];
const completed = ['COMPLETED', 'DONE'];
const actions = ['FOLLOWUP_CONTACT_LOGGED', 'FOLLOWUP_APPOINTMENT_BOOKED', 'FOLLOWUP_APPOINTMENT_RESCHEDULED', 'FOLLOWUP_PLAN_CHANGE_ACK'];
const priorityOrder: Record<string, number> = { URGENT: 0, IMPORTANT: 1, NORMAL: 2 };
const inputDate = (value: string) => new Date(value);
const localDay = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return Math.floor(Date.UTC(get('year'), get('month') - 1, get('day')) / 86_400_000);
};
const metadata = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

const planSelect = {
  id: true, patientId: true, doctorId: true, decision: true, status: true, targetDate: true,
  windowDays: true, priority: true, preparation: true, patientMessage: true, version: true,
  confirmedAt: true, treatmentSessionId: true,
  patient: { select: { fullName: true, patientCode: true, phone: true } },
  doctor: { select: { fullName: true } },
  appointments: { select: { id: true, scheduledAt: true, status: true, employeeId: true, roomId: true, serviceId: true, treatmentSessionId: true } },
} satisfies Prisma.FollowUpPlanSelect;
export type ReceptionPlan = Prisma.FollowUpPlanGetPayload<{ select: typeof planSelect }>;
type LogEntry = { action: string; createdAt: Date; metadata: unknown };
export type ReceptionActor = { accountId: string; employeeId: string; role: 'RECEPTIONIST' | 'OTHER' };
export type ReceptionLabel = 'NEEDS_BOOKING' | 'OVERDUE' | 'BOOKED' | 'NEEDS_REVIEW' | 'CALL_BACK_TODAY' | 'NOT_NEEDED' | 'ON_SYMPTOMS' | 'COMPLETED';

function activeAppointment(plan: ReceptionPlan) {
  return [...plan.appointments].filter((item) => !inactive.includes(item.status.toUpperCase()))
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0] ?? null;
}
function latest(logs: LogEntry[], action: string) { return logs.find((item) => item.action === action) ?? null; }

export function classifyReceptionPlan(plan: ReceptionPlan, logs: LogEntry[], completedVisit: boolean, now: Date): ReceptionLabel {
  if (plan.decision === 'NOT_NEEDED') return 'NOT_NEEDED';
  if (plan.decision === 'ON_SYMPTOMS') return 'ON_SYMPTOMS';
  const appointment = activeAppointment(plan);
  const derived = deriveFollowUpStatus({ notified: false, booked: Boolean(appointment),
    completed: completedVisit || plan.appointments.some((item) => completed.includes(item.status.toUpperCase())) },
    { status: plan.status, targetDate: plan.targetDate, windowDays: plan.windowDays }, now);
  if (derived === 'COMPLETED') return 'COMPLETED';
  const booked = latest(logs, 'FOLLOWUP_APPOINTMENT_BOOKED');
  const acknowledged = logs.some((log) => log.action === 'FOLLOWUP_PLAN_CHANGE_ACK' && metadata(log.metadata).planVersion === plan.version);
  if (appointment && booked && Number(metadata(booked.metadata).planVersion) < plan.version && !acknowledged) return 'NEEDS_REVIEW';
  const contact = latest(logs, 'FOLLOWUP_CONTACT_LOGGED');
  const contactData = metadata(contact?.metadata);
  if (contactData.outcome === 'HEN_GOI_LAI' && typeof contactData.callbackAt === 'string'
    && Number.isFinite(inputDate(contactData.callbackAt).getTime()) && localDay(inputDate(contactData.callbackAt)) <= localDay(now)) return 'CALL_BACK_TODAY';
  if (appointment) return 'BOOKED';
  if (derived === 'OVERDUE') return 'OVERDUE';
  return 'NEEDS_BOOKING';
}

export function outsideFollowUpWindow(plan: Pick<ReceptionPlan, 'targetDate' | 'windowDays'>, date: Date) {
  if (!plan.targetDate) return false;
  const day = localDay(date);
  const target = localDay(plan.targetDate);
  return day < target - (plan.windowDays ?? 0) || day > target + (plan.windowDays ?? 0);
}

function assertActor(actor: ReceptionActor) { if (actor.role !== 'RECEPTIONIST' || !actor.accountId || !actor.employeeId) throw new Error('FOLLOWUP_RECEPTION_FORBIDDEN'); }
function assertPlan(plan: ReceptionPlan | null): asserts plan is ReceptionPlan {
  if (!plan || plan.status !== 'CONFIRMED') throw new Error('FOLLOWUP_PLAN_UNAVAILABLE');
}
function assertBookable(plan: ReceptionPlan) {
  if (plan.decision !== 'SCHEDULED') throw new Error('FOLLOWUP_PLAN_NOT_SCHEDULED');
  if (activeAppointment(plan)) throw new Error('FOLLOWUP_ALREADY_BOOKED');
}
function assertFuture(date: Date, now: Date) { if (!Number.isFinite(date.getTime()) || date <= now) throw new Error('FOLLOWUP_APPOINTMENT_PAST'); }
function dto(plan: ReceptionPlan, logs: LogEntry[], label: ReceptionLabel) {
  const contact = latest(logs, 'FOLLOWUP_CONTACT_LOGGED');
  const contactData = metadata(contact?.metadata);
  const appointment = activeAppointment(plan);
  return {
    planId: plan.id, planVersion: plan.version, patientId: plan.patientId,
    patientName: plan.patient.fullName, patientCode: plan.patient.patientCode, patientPhone: plan.patient.phone,
    doctorId: plan.doctorId, doctorName: plan.doctor.fullName, decision: plan.decision,
    targetDate: plan.targetDate, windowDays: plan.windowDays, priority: plan.priority,
    preparation: plan.preparation, patientMessage: plan.patientMessage, label,
    appointment: appointment ? { id: appointment.id, scheduledAt: appointment.scheduledAt, status: appointment.status,
      employeeId: appointment.employeeId, roomId: appointment.roomId, serviceId: appointment.serviceId } : null,
    latestContact: contact ? { outcome: contactData.outcome ?? null, note: contactData.note ?? null,
      callbackAt: contactData.callbackAt ?? null, createdAt: contact.createdAt } : null,
  };
}
export type ReceptionDto = ReturnType<typeof dto>;

export interface ReceptionTransaction {
  plan(id: string): Promise<ReceptionPlan | null>;
  treatmentAppointment(sessionId: string, patientId: string, after: Date): Promise<{ id: string; scheduledAt: Date; status: string } | null>;
  logs(planId: string): Promise<LogEntry[]>;
  conflicts(date: Date): Promise<Array<{ id: string; patientId: string; employeeId: string | null; roomId: string | null; serviceId: string | null; treatmentSessionId: string | null; followUpPlanId: string | null; scheduledAt: Date; status: string }>>;
  doctorExists(id: string): Promise<boolean>;
  serviceExists(id: string): Promise<boolean>;
  roomExists(id: string): Promise<boolean>;
  createAppointment(input: { patientId: string; employeeId: string; roomId: string | null; serviceId: string | null; scheduledAt: Date; followUpPlanId: string }): Promise<{ id: string }>;
  linkAppointment(id: string, planId: string): Promise<void>;
  moveAppointment(id: string, date: Date, employeeId: string): Promise<void>;
  log(actor: ReceptionActor, planId: string, action: string, data: Record<string, unknown>): Promise<void>;
}
export interface ReceptionStore {
  plans(filters: ListInput): Promise<ReceptionPlan[]>;
  plan(id: string): Promise<ReceptionPlan | null>;
  logs(ids: string[]): Promise<Map<string, LogEntry[]>>;
  hasCompletedVisit(plan: ReceptionPlan): Promise<boolean>;
  options(): Promise<{ doctors: Array<{ id: string; name: string }>; services: Array<{ id: string; name: string }>; rooms: Array<{ id: string; name: string }> }>;
  withPlanLock<T>(planId: string, work: (tx: ReceptionTransaction) => Promise<T>): Promise<T>;
}

function mapLogs(rows: Array<{ entityId: string | null; action: string; createdAt: Date; metadata: unknown }>) {
  const map = new Map<string, LogEntry[]>();
  for (const row of rows) if (row.entityId) map.set(row.entityId, [...(map.get(row.entityId) ?? []), row]);
  return map;
}

export const prismaReceptionStore: ReceptionStore = {
  plans(filters) {
    const from = filters.from ? new Date(`${filters.from}T00:00:00+07:00`) : undefined;
    const to = filters.to ? new Date(`${filters.to}T23:59:59.999+07:00`) : undefined;
    return prisma.followUpPlan.findMany({ where: { status: 'CONFIRMED',
      ...(filters.priority ? { priority: filters.priority } : {}),
      ...(filters.doctorId ? { doctorId: filters.doctorId } : {}),
      ...(from || to ? { targetDate: { gte: from, lte: to } } : {}),
      ...(filters.search ? { patient: { OR: [
        { fullName: { contains: filters.search, mode: 'insensitive' } },
        { patientCode: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search } },
      ] } } : {}),
    }, select: planSelect });
  },
  plan(id) { return prisma.followUpPlan.findUnique({ where: { id }, select: planSelect }); },
  async logs(ids) {
    if (!ids.length) return new Map();
    return mapLogs(await prisma.auditLog.findMany({ where: { entity: 'FollowUpPlan', entityId: { in: ids }, action: { in: actions } },
      orderBy: { createdAt: 'desc' }, select: { entityId: true, action: true, createdAt: true, metadata: true } }));
  },
  async hasCompletedVisit(plan) {
    if (!plan.targetDate || !plan.confirmedAt) return false;
    const window = Math.max(0, plan.windowDays ?? 0);
    const from = new Date(plan.targetDate.getTime() - window * 86_400_000);
    const to = new Date(plan.targetDate.getTime() + (window + 1) * 86_400_000 - 1);
    return Boolean(await prisma.visit.findFirst({ where: { patientId: plan.patientId,
      visitDate: { gte: plan.confirmedAt > from ? plan.confirmedAt : from, lte: to } }, select: { id: true } }));
  },
  async options() {
    const [employees, services, rooms] = await Promise.all([
      prisma.employee.findMany({ select: { id: true, fullName: true, account: { select: { roles: { select: { role: { select: { name: true } } } } } } }, orderBy: { fullName: 'asc' } }),
      prisma.serviceCatalog.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      prisma.room.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    ]);
    return { doctors: employees.filter((employee) => employee.account?.roles.some(({ role }) => doctorRole(role.name)))
      .map((employee) => ({ id: employee.id, name: employee.fullName })), services, rooms };
  },
  withPlanLock(planId, work) {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${planId}))`;
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(741199)`;
      const transaction: ReceptionTransaction = {
        plan: (id) => tx.followUpPlan.findUnique({ where: { id }, select: planSelect }),
        treatmentAppointment: (sessionId, patientId, after) => tx.appointment.findFirst({ where: { treatmentSessionId: sessionId, patientId, followUpPlanId: null, scheduledAt: { gt: after },
          status: { notIn: inactive } }, orderBy: { scheduledAt: 'asc' }, select: { id: true, scheduledAt: true, status: true } }),
        async logs(id) { return tx.auditLog.findMany({ where: { entity: 'FollowUpPlan', entityId: id, action: { in: actions } },
          orderBy: { createdAt: 'desc' }, select: { action: true, createdAt: true, metadata: true } }); },
        conflicts: (date) => tx.appointment.findMany({ where: { scheduledAt: { gt: new Date(date.getTime() - 30 * 60_000), lt: new Date(date.getTime() + 30 * 60_000) },
          status: { not: 'CANCELLED' } }, select: { id: true, patientId: true, employeeId: true, roomId: true, serviceId: true,
            treatmentSessionId: true, followUpPlanId: true, scheduledAt: true, status: true } }),
        async doctorExists(id) { const employee = await tx.employee.findUnique({ where: { id }, select: { account: { select: { roles: { select: { role: { select: { name: true } } } } } } } });
          return Boolean(employee?.account?.roles.some(({ role }) => doctorRole(role.name))); },
        async serviceExists(id) { return Boolean(await tx.serviceCatalog.findFirst({ where: { id, active: true }, select: { id: true } })); },
        async roomExists(id) { return Boolean(await tx.room.findUnique({ where: { id }, select: { id: true } })); },
        createAppointment: (input) => tx.appointment.create({ data: { ...input, status: 'SCHEDULED' }, select: { id: true } }),
        async linkAppointment(id, followUpPlanId) { await tx.appointment.update({ where: { id }, data: { followUpPlanId } }); },
        async moveAppointment(id, scheduledAt, employeeId) { await tx.appointment.update({ where: { id }, data: { scheduledAt, employeeId } }); },
        async log(actor, id, action, data) { await tx.auditLog.create({ data: { accountId: actor.accountId, action,
          entity: 'FollowUpPlan', entityId: id, metadata: data as Prisma.InputJsonValue } }); },
      };
      return work(transaction);
    }, { isolationLevel: 'Serializable', maxWait: 10_000, timeout: 20_000 });
  },
};

function doctorRole(name: string) { const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); return normalized.includes('bac si') || normalized.includes('doctor'); }
function conflictMessage(txAppointments: Awaited<ReturnType<ReceptionTransaction['conflicts']>>, candidate: { scheduledAt: Date; patientId: string; employeeId: string; roomId: string | null }, excludeId?: string) {
  return AppointmentsValidator.checkConflict(candidate, txAppointments, excludeId);
}

export class FollowUpReceptionService {
  constructor(private readonly store: ReceptionStore, private readonly now: () => Date = () => new Date()) {}

  async list(actor: ReceptionActor, filters: ListInput) {
    assertActor(actor);
    const plans = await this.store.plans(filters);
    const logs = await this.store.logs(plans.map((plan) => plan.id));
    const rows = await Promise.all(plans.map(async (plan) => dto(plan, logs.get(plan.id) ?? [],
      classifyReceptionPlan(plan, logs.get(plan.id) ?? [], await this.store.hasCompletedVisit(plan), this.now()))));
    const today = localDay(this.now());
    const filtered = rows.filter((row) => {
      if (filters.quick === 'overdue' && row.label !== 'OVERDUE') return false;
      if (filters.quick === 'next7' && (!row.targetDate || localDay(row.targetDate) < today || localDay(row.targetDate) > today + 7)) return false;
      if (filters.tab === 'todo') return ['NEEDS_BOOKING', 'OVERDUE', 'NEEDS_REVIEW', 'CALL_BACK_TODAY'].includes(row.label);
      if (filters.tab === 'booked') return row.label === 'BOOKED';
      return true;
    });
    filtered.sort((a, b) => Number(b.label === 'OVERDUE') - Number(a.label === 'OVERDUE')
      || (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3)
      || (a.targetDate?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.targetDate?.getTime() ?? Number.MAX_SAFE_INTEGER));
    return { items: filtered.slice((filters.page - 1) * 20, filters.page * 20), total: filtered.length, page: filters.page, pageSize: 20 };
  }

  async detail(actor: ReceptionActor, id: string) {
    assertActor(actor);
    const plan = await this.store.plan(id);
    assertPlan(plan);
    const logs = (await this.store.logs([id])).get(id) ?? [];
    const label = classifyReceptionPlan(plan, logs, await this.store.hasCompletedVisit(plan), this.now());
    return { ...dto(plan, logs, label), history: logs.map((log) => ({ action: log.action, createdAt: log.createdAt,
      ...(log.action === 'FOLLOWUP_CONTACT_LOGGED' ? { outcome: metadata(log.metadata).outcome ?? null,
        note: metadata(log.metadata).note ?? null, callbackAt: metadata(log.metadata).callbackAt ?? null } : {}),
      ...(log.action === 'FOLLOWUP_APPOINTMENT_RESCHEDULED' ? { before: metadata(log.metadata).before ?? null,
        after: metadata(log.metadata).after ?? null, reason: metadata(log.metadata).reason ?? null } : {}),
      ...(log.action === 'FOLLOWUP_APPOINTMENT_BOOKED' ? { appointmentId: metadata(log.metadata).appointmentId ?? null,
        outsideWindow: metadata(log.metadata).outsideWindow ?? null, linkedExisting: metadata(log.metadata).linkedExisting ?? null } : {}),
    })) };
  }

  async options(actor: ReceptionActor) { assertActor(actor); return this.store.options(); }

  async contact(actor: ReceptionActor, id: string, input: ContactInput) {
    assertActor(actor);
    return this.store.withPlanLock(id, async (tx) => {
      const plan = await tx.plan(id); assertPlan(plan);
      await tx.log(actor, id, 'FOLLOWUP_CONTACT_LOGGED', { actorType: 'RECEPTIONIST', planId: id,
        planVersion: plan.version, outcome: input.outcome, note: input.note ?? null, callbackAt: input.callbackAt ?? null });
      return { success: true };
    });
  }

  async book(actor: ReceptionActor, id: string, input: BookingInput) {
    assertActor(actor);
    return this.store.withPlanLock(id, async (tx) => {
      const plan = await tx.plan(id); assertPlan(plan); assertBookable(plan);
      const existing = plan.treatmentSessionId ? await tx.treatmentAppointment(plan.treatmentSessionId, plan.patientId, this.now()) : null;
      if (existing) {
        if (existing.scheduledAt <= this.now()) throw new Error('FOLLOWUP_APPOINTMENT_PAST');
        await tx.linkAppointment(existing.id, id);
        const outsideWindow = outsideFollowUpWindow(plan, existing.scheduledAt);
        await tx.log(actor, id, 'FOLLOWUP_APPOINTMENT_BOOKED', { actorType: 'RECEPTIONIST', planId: id,
          planVersion: plan.version, appointmentId: existing.id, outsideWindow, linkedExisting: true });
        return { appointmentId: existing.id, outsideWindow, linkedExisting: true };
      }
      const date = inputDate(input.scheduledAt); assertFuture(date, this.now());
      if (!await tx.doctorExists(input.employeeId)) throw new Error('FOLLOWUP_DOCTOR_INVALID');
      if (input.serviceId && !await tx.serviceExists(input.serviceId)) throw new Error('FOLLOWUP_SERVICE_INVALID');
      if (input.roomId && !await tx.roomExists(input.roomId)) throw new Error('FOLLOWUP_ROOM_INVALID');
      const conflict = conflictMessage(await tx.conflicts(date), { scheduledAt: date, patientId: plan.patientId,
        employeeId: input.employeeId, roomId: input.roomId ?? null });
      if (conflict) throw new Error(`FOLLOWUP_CONFLICT:${conflict}`);
      const appointment = await tx.createAppointment({ patientId: plan.patientId, employeeId: input.employeeId,
        roomId: input.roomId ?? null, serviceId: input.serviceId ?? null, scheduledAt: date, followUpPlanId: id });
      const outsideWindow = outsideFollowUpWindow(plan, date);
      await tx.log(actor, id, 'FOLLOWUP_APPOINTMENT_BOOKED', { actorType: 'RECEPTIONIST', planId: id,
        planVersion: plan.version, appointmentId: appointment.id, outsideWindow, linkedExisting: false });
      return { appointmentId: appointment.id, outsideWindow, linkedExisting: false };
    });
  }

  async reschedule(actor: ReceptionActor, id: string, input: RescheduleInput) {
    assertActor(actor);
    return this.store.withPlanLock(id, async (tx) => {
      const plan = await tx.plan(id); assertPlan(plan);
      const appointment = activeAppointment(plan);
      if (!appointment) throw new Error('FOLLOWUP_APPOINTMENT_NOT_FOUND');
      const date = inputDate(input.scheduledAt); assertFuture(date, this.now());
      if (!await tx.doctorExists(input.employeeId)) throw new Error('FOLLOWUP_DOCTOR_INVALID');
      const conflict = conflictMessage(await tx.conflicts(date), { scheduledAt: date, patientId: plan.patientId,
        employeeId: input.employeeId, roomId: appointment.roomId }, appointment.id);
      if (conflict) throw new Error(`FOLLOWUP_CONFLICT:${conflict}`);
      const before = { scheduledAt: appointment.scheduledAt.toISOString(), employeeId: appointment.employeeId };
      const after = { scheduledAt: date.toISOString(), employeeId: input.employeeId };
      await tx.moveAppointment(appointment.id, date, input.employeeId);
      await tx.log(actor, id, 'FOLLOWUP_APPOINTMENT_RESCHEDULED', { actorType: 'RECEPTIONIST', planId: id,
        appointmentId: appointment.id, before, after, reason: input.reason, note: input.note ?? null });
      return { appointmentId: appointment.id, outsideWindow: outsideFollowUpWindow(plan, date) };
    });
  }

  async acknowledge(actor: ReceptionActor, id: string) {
    assertActor(actor);
    return this.store.withPlanLock(id, async (tx) => {
      const plan = await tx.plan(id); assertPlan(plan);
      const logs = await tx.logs(id);
      if (classifyReceptionPlan(plan, logs, false, this.now()) !== 'NEEDS_REVIEW') throw new Error('FOLLOWUP_NO_CHANGE_TO_ACK');
      await tx.log(actor, id, 'FOLLOWUP_PLAN_CHANGE_ACK', { actorType: 'RECEPTIONIST', planId: id, planVersion: plan.version });
      return { success: true };
    });
  }
}
