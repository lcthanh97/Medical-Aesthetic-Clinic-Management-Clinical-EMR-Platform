import type { AftercareTemplateCreateInput, FollowUpCancelInput, FollowUpDraftInput } from '@/features/follow-ups/follow-ups.schema';
import type { FollowUpActor, IFollowUpRepository } from '@/server/repositories/IFollowUpRepository';
import type { IFollowUpService } from './IFollowUpService';

const CANCELLED_APPOINTMENT = new Set(['CANCELLED', 'CANCELED']);

function requireDoctor(actor: FollowUpActor): FollowUpActor {
  if (!actor.accountId || !actor.employeeId) throw new Error('FOLLOWUP_ACCESS_DENIED');
  return { accountId: actor.accountId, employeeId: actor.employeeId };
}

function localDateParts(value: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(value);
  return {
    year: Number(parts.find((item) => item.type === 'year')?.value),
    month: Number(parts.find((item) => item.type === 'month')?.value),
    day: Number(parts.find((item) => item.type === 'day')?.value),
  };
}

function dayNumber(value: Date): number {
  const { year, month, day } = localDateParts(value);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

function todayInHoChiMinh(now = new Date()): string {
  const { year, month, day } = localDateParts(now);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseHoChiMinhDate(dateOnly: string | null | undefined): Date | null {
  if (!dateOnly) return null;
  const result = new Date(`${dateOnly}T00:00:00+07:00`);
  return Number.isNaN(result.getTime()) ? null : result;
}

function externalState(signals: { notified: boolean; booked: boolean; completed: boolean }, plan: { status: string; targetDate: Date | null; windowDays: number | null }, now: Date) {
  if (plan.status !== 'CONFIRMED') return null;
  if (signals.completed) return 'COMPLETED';
  if (signals.booked) return 'BOOKED';
  if (plan.targetDate && dayNumber(plan.targetDate) + (plan.windowDays ?? 0) < dayNumber(now)) return 'OVERDUE';
  if (signals.notified) return 'NOTIFIED';
  return null;
}

export { externalState as deriveFollowUpStatus };

function publicPlan(plan: Record<string, unknown>, derivedStatus: string | null, needsRenotify = false) {
  return { ...plan, derivedStatus, needsRenotify };
}

export class FollowUpService implements IFollowUpService {
  constructor(private readonly repository: IFollowUpRepository, private readonly now: () => Date = () => new Date()) {}

  private async assignedVisit(actor: FollowUpActor, visitId: string) {
    const scope = requireDoctor(actor);
    if (typeof visitId !== 'string' || !visitId.trim() || visitId.length > 100) throw new Error('FOLLOWUP_VISIT_NOT_FOUND');
    const visit = await this.repository.getAssignedVisit(visitId, scope);
    if (!visit) throw new Error(await this.repository.visitExists(visitId) ? 'FOLLOWUP_VISIT_FORBIDDEN' : 'FOLLOWUP_VISIT_NOT_FOUND');
    return { scope, visit };
  }

  async getForVisit(actor: FollowUpActor, visitId: string) {
    const { visit } = await this.assignedVisit(actor, visitId);
    const plan = await this.repository.getPlanForVisit(visit.id);
    if (!plan) return null;
    const signals = await this.repository.getDerivedSignals(String(plan.id), visit.patientId, plan.confirmedAt instanceof Date ? plan.confirmedAt : null, plan.targetDate instanceof Date ? plan.targetDate : null, typeof plan.windowDays === 'number' ? plan.windowDays : null);
    return publicPlan(plan, externalState(signals, { status: String(plan.status), targetDate: plan.targetDate instanceof Date ? plan.targetDate : null, windowDays: typeof plan.windowDays === 'number' ? plan.windowDays : null }, this.now()));
  }

  async saveDraft(actor: FollowUpActor, visitId: string, input: FollowUpDraftInput) {
    const { scope, visit } = await this.assignedVisit(actor, visitId);
    const targetDate = parseHoChiMinhDate(input.targetDate);
    if (input.decision === 'SCHEDULED') {
      if (!targetDate) throw new Error('FOLLOWUP_TARGET_DATE_REQUIRED');
      if (dayNumber(targetDate) < dayNumber(this.now())) throw new Error('FOLLOWUP_TARGET_DATE_PAST');
      if (!input.reason?.trim()) throw new Error('FOLLOWUP_REASON_REQUIRED');
    }
    const previous = await this.repository.getPlanForVisit(visit.id);
    if (previous?.status === 'CANCELLED') throw new Error('FOLLOWUP_CANCELLED');
    let copiedTemplate;
    if (input.templateId) {
      const departmentId = await this.repository.getDoctorDepartmentId(scope);
      const template = await this.repository.getTemplateForApply(input.templateId, scope, departmentId, input.appliesTo);
      if (!template) throw new Error('FOLLOWUP_TEMPLATE_NOT_FOUND');
      copiedTemplate = { id: template.id, version: template.version, homeCare: template.homeCare, avoid: template.avoid, warningSigns: template.warningSigns };
    }
    const saved = await this.repository.saveDraft(visit.id, scope, { ...input, targetDate: input.targetDate ?? null }, copiedTemplate);
    return publicPlan(saved.plan, null, saved.needsRenotify);
  }

  async confirm(actor: FollowUpActor, visitId: string) {
    const { scope, visit } = await this.assignedVisit(actor, visitId);
    const current = await this.repository.getPlanForVisit(visit.id);
    if (!current) throw new Error('FOLLOWUP_PLAN_NOT_FOUND');
    if (current.status === 'CANCELLED') throw new Error('FOLLOWUP_CANCELLED');
    if (current.status === 'CONFIRMED') throw new Error('FOLLOWUP_ALREADY_CONFIRMED');
    const decision = String(current.decision);
    const targetDate = current.targetDate instanceof Date ? current.targetDate : null;
    const reason = typeof current.reason === 'string' ? current.reason.trim() : '';
    if (decision === 'SCHEDULED') {
      if (!targetDate) throw new Error('FOLLOWUP_TARGET_DATE_REQUIRED');
      if (dayNumber(targetDate) < dayNumber(this.now())) throw new Error('FOLLOWUP_TARGET_DATE_PAST');
      if (!reason) throw new Error('FOLLOWUP_REASON_REQUIRED');
    }
    const homeCare = typeof current.homeCare === 'string' ? current.homeCare.trim() : '';
    const warningSigns = typeof current.warningSigns === 'string' ? current.warningSigns.trim() : '';
    if (!homeCare && !warningSigns && !(decision === 'NOT_NEEDED' && reason)) throw new Error('FOLLOWUP_CONFIRM_CONTENT_REQUIRED');
    const result = await this.repository.confirm(visit.id, scope);
    return { ...result.plan, derivedStatus: null, linkedToExistingSession: result.linkedToExistingSession };
  }

  async cancel(actor: FollowUpActor, visitId: string, input: FollowUpCancelInput) {
    const { scope, visit } = await this.assignedVisit(actor, visitId);
    const current = await this.repository.getPlanForVisit(visit.id);
    if (!current) throw new Error('FOLLOWUP_PLAN_NOT_FOUND');
    if (!['DRAFT', 'CONFIRMED'].includes(String(current.status))) throw new Error('FOLLOWUP_NOT_CANCELLABLE');
    return publicPlan(await this.repository.cancel(visit.id, scope, input.cancelReason), null);
  }

  async getSuggestion(actor: FollowUpActor, visitId: string) {
    const { scope, visit } = await this.assignedVisit(actor, visitId);
    const step = await this.repository.getNextStepInterval(visit.id, scope).catch(() => null);
    if (!step?.baseDate) return null;
    const suggestedDate = new Date(step.baseDate.getTime() + step.intervalDays * 86_400_000);
    const linkedSession = step.alreadyScheduled && !CANCELLED_APPOINTMENT.has(step.alreadyScheduled.status.toUpperCase()) ? step.alreadyScheduled : null;
    return { suggestedDate: todayInHoChiMinh(suggestedDate), intervalDays: step.intervalDays, linkedSession, treatmentSessionId: step.sessionId };
  }

  async listTemplates(actor: FollowUpActor, filters: { appliesTo?: string; scope?: 'PERSONAL' | 'DEPARTMENT' | 'CLINIC' }) {
    const scope = requireDoctor(actor);
    const departmentId = await this.repository.getDoctorDepartmentId(scope);
    return this.repository.listTemplates(scope, { ...filters, departmentId });
  }

  async createTemplate(actor: FollowUpActor, input: AftercareTemplateCreateInput) {
    const scope = requireDoctor(actor);
    return this.repository.createTemplate(scope, await this.repository.getDoctorDepartmentId(scope), input);
  }

  async listForDoctor(actor: FollowUpActor) {
    const scope = requireDoctor(actor);
    const [plans, pendingDecisionCount] = await Promise.all([
      this.repository.listForDoctor(scope),
      this.repository.countAssignedVisitsWithoutDecision(scope),
    ]);
    const now = this.now();
    const resolved: Array<Record<string, unknown> & { derivedStatus: string | null }> = await Promise.all(plans.map(async (plan) => {
      const targetDate = plan.targetDate instanceof Date ? plan.targetDate : null;
      const confirmedAt = plan.confirmedAt instanceof Date ? plan.confirmedAt : null;
      const windowDays = typeof plan.windowDays === 'number' ? plan.windowDays : null;
      const signals = await this.repository.getDerivedSignals(String(plan.id), String(plan.patientId), confirmedAt, targetDate, windowDays);
      return { ...plan, derivedStatus: externalState(signals, { status: String(plan.status), targetDate, windowDays }, now) };
    }));
    return {
      pendingDecisionCount,
      upcoming: resolved.filter((plan) => plan.derivedStatus !== 'OVERDUE' && plan.derivedStatus !== 'COMPLETED'),
      overdue: resolved.filter((plan) => plan.derivedStatus === 'OVERDUE'),
    };
  }

  async assertVisitMayComplete(actor: FollowUpActor, visitId: string): Promise<void> {
    if (process.env.FOLLOWUP_GATE_ENABLED !== 'true') return;
    const { visit } = await this.assignedVisit(actor, visitId);
    const plan = await this.repository.getPlanForVisit(visit.id);
    if (!plan || plan.status !== 'CONFIRMED') throw new Error('FOLLOWUP_DECISION_REQUIRED');
  }
}
