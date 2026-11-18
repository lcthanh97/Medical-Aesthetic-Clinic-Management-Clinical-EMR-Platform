import type { AftercareTemplateCreateInput, FollowUpCancelInput, FollowUpDraftInput } from './follow-ups.schema';

export type FollowUpApiResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
};

export type FollowUpPlanView = {
  id: string;
  visitId: string;
  patientId: string;
  decision: 'SCHEDULED' | 'NOT_NEEDED' | 'ON_SYMPTOMS';
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
  targetDate: string | null;
  windowDays: number | null;
  priority: 'NORMAL' | 'IMPORTANT' | 'URGENT';
  reason: string | null;
  preparation: string | null;
  homeCare: string | null;
  avoid: string | null;
  warningSigns: string | null;
  patientMessage: string | null;
  hideDiagnosis: boolean;
  templateId: string | null;
  templateVersion: number | null;
  version: number;
  cancelReason: string | null;
  confirmedAt: string | null;
  derivedStatus: string | null;
  needsRenotify?: boolean;
  treatmentSessionId?: string | null;
  linkedToExistingSession?: boolean;
  [key: string]: unknown;
};

export type AftercareTemplateView = {
  id: string;
  name: string;
  scope: 'PERSONAL' | 'DEPARTMENT' | 'CLINIC';
  appliesTo?: string | null;
  homeCare: string | null;
  avoid: string | null;
  warningSigns: string | null;
  version: number;
};

export type FollowUpOverviewView = {
  pendingDecisionCount: number;
  upcoming: FollowUpPlanView[];
  overdue: FollowUpPlanView[];
};

async function request<T>(url: string, init?: RequestInit): Promise<FollowUpApiResult<T>> {
  try {
    const response = await fetch(url, {
      ...init,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: init?.body ? { 'Content-Type': 'application/json', ...init.headers } : init?.headers,
    });
    const payload = await response.json() as FollowUpApiResult<T>;
    if (!response.ok || !payload.success) return { success: false, error: payload.error ?? 'Không thể tải dữ liệu tái khám.', code: payload.code };
    return payload;
  } catch {
    return { success: false, error: 'Không thể kết nối dịch vụ tái khám. Vui lòng thử lại.' };
  }
}

export const followUpApi = {
  getForVisit: (visitId: string) => request<FollowUpPlanView | null>(`/api/bacsi/follow-ups/${encodeURIComponent(visitId)}`),
  saveDraft: (visitId: string, input: FollowUpDraftInput) => request<FollowUpPlanView>(`/api/bacsi/follow-ups/${encodeURIComponent(visitId)}`, { method: 'PUT', body: JSON.stringify(input) }),
  confirm: (visitId: string) => request<FollowUpPlanView>(`/api/bacsi/follow-ups/${encodeURIComponent(visitId)}/confirm`, { method: 'POST', body: '{}' }),
  cancel: (visitId: string, input: FollowUpCancelInput) => request<FollowUpPlanView>(`/api/bacsi/follow-ups/${encodeURIComponent(visitId)}/cancel`, { method: 'POST', body: JSON.stringify(input) }),
  getSuggestion: (visitId: string) => request<{ suggestedDate: string; intervalDays: number; linkedSession: { id: string; scheduledAt: string; status: string } | null; treatmentSessionId: string | null } | null>(`/api/bacsi/follow-ups/suggestion?visitId=${encodeURIComponent(visitId)}`),
  listTemplates: (appliesTo?: string) => request<AftercareTemplateView[]>(`/api/bacsi/follow-ups/templates${appliesTo ? `?appliesTo=${encodeURIComponent(appliesTo)}` : ''}`),
  createTemplate: (input: AftercareTemplateCreateInput) => request<AftercareTemplateView>('/api/bacsi/follow-ups/templates', { method: 'POST', body: JSON.stringify(input) }),
  overview: () => request<FollowUpOverviewView>('/api/bacsi/follow-ups/overview'),
};

