import type { AftercareTemplateCreateInput, FollowUpDraftInput } from '@/features/follow-ups/follow-ups.schema';

export interface FollowUpActor {
  accountId: string;
  employeeId: string;
}

export interface FollowUpAppointmentLink {
  id: string;
  treatmentSessionId: string | null;
  scheduledAt: Date;
  status: string;
}

export interface IFollowUpRepository {
  visitExists(visitId: string): Promise<boolean>;
  getAssignedVisit(visitId: string, actor: FollowUpActor): Promise<{ id: string; patientId: string; visitDate: Date; departmentId: string | null } | null>;
  getPlanForVisit(visitId: string): Promise<Record<string, unknown> | null>;
  saveDraft(visitId: string, actor: FollowUpActor, input: FollowUpDraftInput, copiedTemplate?: { id: string; version: number; homeCare: string | null; avoid: string | null; warningSigns: string | null }): Promise<{ plan: Record<string, unknown>; wasConfirmed: boolean; needsRenotify: boolean }>;
  confirm(visitId: string, actor: FollowUpActor): Promise<{ plan: Record<string, unknown>; linkedToExistingSession: boolean }>;
  cancel(visitId: string, actor: FollowUpActor, cancelReason: string): Promise<Record<string, unknown>>;
  hasLinkedNotification(planId: string): Promise<boolean>;
  getTemplateForApply(templateId: string, actor: FollowUpActor, departmentId: string | null, appliesTo?: string): Promise<{ id: string; name: string; scope: string; version: number; homeCare: string | null; avoid: string | null; warningSigns: string | null } | null>;
  getDoctorDepartmentId(actor: FollowUpActor): Promise<string | null>;
  getDerivedSignals(planId: string, patientId: string, confirmedAt: Date | null, targetDate: Date | null, windowDays: number | null): Promise<{ notified: boolean; booked: boolean; completed: boolean }>;
  listTemplates(actor: FollowUpActor, filters: { appliesTo?: string; scope?: 'PERSONAL' | 'DEPARTMENT' | 'CLINIC'; departmentId: string | null }): Promise<Array<Record<string, unknown>>>;
  createTemplate(actor: FollowUpActor, departmentId: string | null, input: AftercareTemplateCreateInput): Promise<Record<string, unknown>>;
  listForDoctor(actor: FollowUpActor): Promise<Array<Record<string, unknown>>>;
  countAssignedVisitsWithoutDecision(actor: FollowUpActor): Promise<number>;
  getNextStepInterval(visitId: string, actor: FollowUpActor): Promise<{ intervalDays: number; baseDate: Date | null; sessionId: string | null; alreadyScheduled: FollowUpAppointmentLink | null } | null>;
}
