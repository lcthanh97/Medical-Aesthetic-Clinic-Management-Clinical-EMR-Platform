import type { AftercareTemplateCreateInput, FollowUpCancelInput, FollowUpDraftInput } from '@/features/follow-ups/follow-ups.schema';
import type { FollowUpActor } from '@/server/repositories/IFollowUpRepository';

export interface IFollowUpService {
  getForVisit(actor: FollowUpActor, visitId: string): Promise<Record<string, unknown> | null>;
  saveDraft(actor: FollowUpActor, visitId: string, input: FollowUpDraftInput): Promise<Record<string, unknown>>;
  confirm(actor: FollowUpActor, visitId: string): Promise<Record<string, unknown>>;
  cancel(actor: FollowUpActor, visitId: string, input: FollowUpCancelInput): Promise<Record<string, unknown>>;
  getSuggestion(actor: FollowUpActor, visitId: string): Promise<Record<string, unknown> | null>;
  listTemplates(actor: FollowUpActor, filters: { appliesTo?: string; scope?: 'PERSONAL' | 'DEPARTMENT' | 'CLINIC' }): Promise<Array<Record<string, unknown>>>;
  createTemplate(actor: FollowUpActor, input: AftercareTemplateCreateInput): Promise<Record<string, unknown>>;
  listForDoctor(actor: FollowUpActor): Promise<{ pendingDecisionCount: number; upcoming: Array<Record<string, unknown>>; overdue: Array<Record<string, unknown>> }>;
  assertVisitMayComplete(actor: FollowUpActor, visitId: string): Promise<void>;
}
