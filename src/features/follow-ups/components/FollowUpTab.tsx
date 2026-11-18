'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Clock3, FlaskConical, Info, Pill, Save, ShieldCheck, Stethoscope } from 'lucide-react';
import type { AftercareTemplateView, FollowUpPlanView } from '../follow-up-api';
import { followUpApi } from '../follow-up-api';
import type { FollowUpDraftInput } from '../follow-ups.schema';

type Decision = 'SCHEDULED' | 'NOT_NEEDED' | 'ON_SYMPTOMS';
type Priority = 'NORMAL' | 'IMPORTANT' | 'URGENT';
type FormState = {
  decision: Decision | '';
  targetDate: string;
  windowDays: string;
  priority: Priority;
  reason: string;
  preparation: string;
  homeCare: string;
  avoid: string;
  warningSigns: string;
  patientMessage: string;
  hideDiagnosis: boolean;
  templateId: string;
};

type Props = {
  visitId: string;
  patientName: string;
  patientCode: string;
  visitDate: string;
  specialty?: string;
  onOpenOrders: () => void;
  orderCount: number;
  prescriptionCount: number;
  preselectedDecision?: Decision | null;
};

const EMPTY_FORM: FormState = {
  decision: '', targetDate: '', windowDays: '0', priority: 'NORMAL', reason: '', preparation: '',
  homeCare: '', avoid: '', warningSigns: '', patientMessage: '', hideDiagnosis: true, templateId: '',
};

const DECISIONS: Array<{ value: Decision; label: string }> = [
  { value: 'SCHEDULED', label: 'Có hẹn' },
  { value: 'NOT_NEEDED', label: 'Không cần' },
  { value: 'ON_SYMPTOMS', label: 'Khi có dấu hiệu' },
];
const PRIORITIES: Array<{ value: Priority; label: string }> = [
  { value: 'NORMAL', label: 'Thường' },
  { value: 'IMPORTANT', label: 'Quan trọng' },
  { value: 'URGENT', label: 'Khẩn' },
];
const DATE_SHORTCUTS = [
  { label: '1 tuần', days: 7 },
  { label: '2 tuần', days: 14 },
  { label: '3 tuần', days: 21 },
  { label: '1 tháng', months: 1 },
  { label: '2 tháng', months: 2 },
] as const;

function hcmDateNow() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function addDays(dateOnly: string, days: number) {
  const [year, month, day] = dateOnly.split('-').map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + days));
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
}

function addMonths(dateOnly: string, months: number) {
  const [year, month, day] = dateOnly.split('-').map(Number);
  const first = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return addDays(`${first.getUTCFullYear()}-${String(first.getUTCMonth() + 1).padStart(2, '0')}-01`, Math.min(day, lastDay) - 1);
}

function dateOnly(value: string | null | undefined) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(parsed);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function dateLabel(value: string) {
  if (!value) return '';
  return new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(`${value}T12:00:00+07:00`));
}

function fromPlan(plan: FollowUpPlanView): FormState {
  return {
    decision: plan.decision,
    targetDate: dateOnly(plan.targetDate),
    windowDays: String(plan.windowDays ?? 0),
    priority: plan.priority ?? 'NORMAL',
    reason: plan.reason ?? '',
    preparation: plan.preparation ?? '',
    homeCare: plan.homeCare ?? '',
    avoid: plan.avoid ?? '',
    warningSigns: plan.warningSigns ?? '',
    patientMessage: plan.patientMessage ?? '',
    hideDiagnosis: plan.hideDiagnosis ?? true,
    templateId: plan.templateId ?? '',
  };
}

function statusLabel(value: string | null | undefined) {
  const labels: Record<string, string> = {
    DRAFT: 'Nháp', CONFIRMED: 'Đã xác nhận', NOTIFIED: 'Đã gửi nhắc', BOOKED: 'Đã đặt lịch',
    COMPLETED: 'Đã tái khám', OVERDUE: 'Quá hạn', CANCELLED: 'Đã hủy',
  };
  return labels[value ?? ''] ?? 'Chưa có trạng thái';
}

function dateError(value: string) {
  return value && value < hcmDateNow() ? 'Ngày tái khám phải từ hôm nay trở đi.' : '';
}

export function FollowUpTab({ visitId, patientName, patientCode, visitDate, specialty, onOpenOrders, orderCount, prescriptionCount, preselectedDecision }: Props) {
  const [plan, setPlan] = useState<FollowUpPlanView | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [templates, setTemplates] = useState<AftercareTemplateView[]>([]);
  const [suggestion, setSuggestion] = useState<Awaited<ReturnType<typeof followUpApi.getSuggestion>>['data']>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [editMode, setEditMode] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [templateDialog, setTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateMessage, setTemplateMessage] = useState('');
  const [today, setToday] = useState('');

  const editable = !plan || plan.status === 'DRAFT' || editMode;
  const selectedTemplateName = templates.find((template) => template.id === form.templateId)?.name;
  const expectedDate = form.targetDate ? dateLabel(form.targetDate) : '';
  const daysUntilTarget = form.targetDate && today ? Math.round((Date.parse(form.targetDate) - Date.parse(today)) / 86_400_000) : null;
  const linkedSession = suggestion?.linkedSession;
  const patientPreview = useMemo(() => [
    form.patientMessage.trim(),
    form.targetDate && form.decision === 'SCHEDULED' ? `Thời điểm dự kiến: ${dateLabel(form.targetDate)}.` : '',
    form.homeCare.trim(), form.avoid.trim(), form.warningSigns.trim(),
  ].filter(Boolean).join('\n\n'), [form]);

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError('');
    const [planResult, templateResult, suggestionResult] = await Promise.all([
      followUpApi.getForVisit(visitId),
      followUpApi.listTemplates(specialty),
      followUpApi.getSuggestion(visitId),
    ]);
    if (!planResult.success) setError(planResult.error ?? 'Không tải được kế hoạch tái khám.');
    else {
      setPlan(planResult.data ?? null);
      setForm(planResult.data ? fromPlan(planResult.data) : { ...EMPTY_FORM, ...(preselectedDecision ? { decision: preselectedDecision } : {}) });
      setEditMode(!planResult.data || planResult.data.status === 'DRAFT');
    }
    if (templateResult.success) setTemplates(templateResult.data ?? []);
    else setError(templateResult.error ?? 'Không tải được mẫu hướng dẫn.');
    if (suggestionResult.success) setSuggestion(suggestionResult.data ?? null);
    if (showSpinner) setLoading(false);
  }, [visitId, specialty, preselectedDecision]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setToday(hcmDateNow()); }, []);
  useEffect(() => {
    if (preselectedDecision && (!plan || plan.status === 'DRAFT')) {
      setForm((current) => ({ ...current, decision: preselectedDecision }));
      setEditMode(true);
    }
  }, [preselectedDecision, plan]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: '' }));
  }

  function chooseDate(value: string) {
    setForm((current) => ({ ...current, decision: 'SCHEDULED', targetDate: value }));
    setFieldErrors((current) => ({ ...current, decision: '', targetDate: '' }));
  }

  function chooseDecision(value: Decision) {
    setForm((current) => ({ ...current, decision: value, targetDate: value === 'SCHEDULED' ? current.targetDate : '' }));
    setFieldErrors((current) => ({ ...current, decision: '', targetDate: '' }));
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!form.decision) next.decision = 'Vui lòng chọn quyết định tái khám.';
    if (form.decision === 'SCHEDULED' && !form.targetDate) next.targetDate = 'Vui lòng chọn ngày tái khám.';
    if (form.decision === 'SCHEDULED' && form.targetDate && dateError(form.targetDate)) next.targetDate = dateError(form.targetDate);
    if (form.decision === 'SCHEDULED' && !form.reason.trim()) next.reason = 'Vui lòng ghi lý do tái khám.';
    if (form.decision === 'SCHEDULED' && (!Number.isInteger(Number(form.windowDays)) || Number(form.windowDays) < 0 || Number(form.windowDays) > 90)) next.windowDays = 'Khoảng cho phép phải từ 0 đến 90 ngày.';
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  function body() {
    return {
      decision: form.decision,
      targetDate: form.decision === 'SCHEDULED' ? form.targetDate || null : null,
      windowDays: form.decision === 'SCHEDULED' ? Number(form.windowDays || 0) : null,
      priority: form.priority,
      reason: form.reason,
      preparation: form.preparation,
      homeCare: form.homeCare,
      avoid: form.avoid,
      warningSigns: form.warningSigns,
      patientMessage: form.patientMessage,
      hideDiagnosis: form.hideDiagnosis,
      templateId: form.templateId || null,
      appliesTo: specialty || undefined,
      treatmentSessionId: suggestion?.treatmentSessionId ?? plan?.treatmentSessionId ?? null,
    };
  }

  async function saveDraft() {
    if (!validate()) return false;
    setBusy(true); setError('');
    const result = await followUpApi.saveDraft(visitId, body() as FollowUpDraftInput);
    setBusy(false);
    if (!result.success || !result.data) { setError(result.error ?? 'Không lưu được bản nháp.'); return false; }
    setPlan(result.data); setEditMode(true);
    if (result.data.needsRenotify) setNotice('Bệnh nhân đã được nhắc trước đó; cần thông báo lại sau khi xác nhận thay đổi.');
    return true;
  }

  async function confirmPlan() {
    if (!validate()) return;
    if (form.decision !== 'NOT_NEEDED' && !form.homeCare.trim() && !form.warningSigns.trim()) {
      setFieldErrors((current) => ({ ...current, homeCare: 'Cần có hướng dẫn chăm sóc hoặc dấu hiệu cần đến sớm trước khi xác nhận.' }));
      return;
    }
    if (form.decision === 'NOT_NEEDED' && !form.reason.trim() && !form.homeCare.trim() && !form.warningSigns.trim()) {
      setFieldErrors((current) => ({ ...current, reason: 'Cần ghi lý do hoặc hướng dẫn trước khi xác nhận không cần tái khám.' }));
      return;
    }
    setBusy(true); setError('');
    const draftResult = await followUpApi.saveDraft(visitId, body() as FollowUpDraftInput);
    if (!draftResult.success) { setBusy(false); setError(draftResult.error ?? 'Không lưu được bản nháp.'); return; }
    setPlan(draftResult.data ?? null);
    const result = await followUpApi.confirm(visitId);
    setBusy(false);
    if (!result.success || !result.data) { setError(result.error ?? 'Không xác nhận được kế hoạch.'); return; }
    setPlan(result.data); setForm(fromPlan(result.data)); setEditMode(false);
    if (draftResult.data?.needsRenotify) setNotice('Bệnh nhân đã được nhắc trước đó; cần thông báo lại thay đổi này.');
  }

  async function cancelPlan() {
    if (!cancelReason.trim()) { setError('Vui lòng nhập lý do hủy kế hoạch.'); return; }
    setBusy(true); setError('');
    const result = await followUpApi.cancel(visitId, { cancelReason: cancelReason.trim() });
    setBusy(false);
    if (!result.success || !result.data) { setError(result.error ?? 'Không hủy được kế hoạch.'); return; }
    setPlan(result.data); setEditMode(false); setCancelDialog(false); setCancelReason('');
  }

  async function saveTemplate() {
    if (!templateName.trim()) { setTemplateMessage('Nhập tên cho mẫu trước khi lưu.'); return; }
    setBusy(true); setTemplateMessage('');
    const result = await followUpApi.createTemplate({ name: templateName.trim(), appliesTo: specialty || undefined, homeCare: form.homeCare, avoid: form.avoid, warningSigns: form.warningSigns });
    setBusy(false);
    if (!result.success || !result.data) { setTemplateMessage(result.error ?? 'Không lưu được mẫu.'); return; }
    setTemplates((current) => [result.data!, ...current]); setForm((current) => ({ ...current, templateId: result.data!.id }));
    setTemplateDialog(false); setTemplateName('');
  }

  function applyTemplate(templateId: string) {
    const template = templates.find((item) => item.id === templateId);
    update('templateId', templateId);
    if (!template) return;
    setForm((current) => ({ ...current, templateId, homeCare: template.homeCare ?? '', avoid: template.avoid ?? '', warningSigns: template.warningSigns ?? '' }));
  }

  if (loading) return <section className="rounded-xl border border-[#e1e9f2] bg-white p-6 text-sm text-slate-500" aria-live="polite">Đang tải kế hoạch tái khám và mẫu hướng dẫn…</section>;

  const readOnly = !editable;
  const showDateChoices = editable || form.decision === 'SCHEDULED';
  return <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
    <div className="space-y-4">
      <section className="rounded-xl border border-[#e1e9f2] bg-white p-4 shadow-sm sm:p-5" aria-labelledby="follow-up-plan-title">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="follow-up-plan-title" className="text-lg font-bold text-[#20334b]">Kế hoạch tái khám</h2><p className="mt-1 text-sm text-slate-500">Ghi nhận quyết định lâm sàng cho lượt khám này.</p></div>{plan && <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">Phiên bản {plan.version} · {statusLabel(plan.status)}</span>}</div>
        <fieldset disabled={readOnly || busy} className="mt-5 space-y-4 disabled:opacity-90">
          <legend className="sr-only">Quyết định tái khám</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">{DECISIONS.map((item) => <button key={item.value} type="button" aria-pressed={form.decision === item.value} onClick={() => chooseDecision(item.value)} className={`min-h-10 rounded-lg border px-3 py-2 text-sm font-semibold ${form.decision === item.value ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>{item.label}</button>)}</div>
          {fieldErrors.decision && <p className="text-sm text-rose-700" role="alert">{fieldErrors.decision}</p>}
          {showDateChoices && <div className="space-y-3 rounded-lg bg-slate-50 p-3">
            <p className="text-sm font-medium text-slate-700">Ngày tái khám · chọn nhanh hoặc nhập ngày</p>
            <div className="flex flex-wrap gap-2">{DATE_SHORTCUTS.map((item) => <button key={item.label} type="button" disabled={!today} onClick={() => chooseDate('months' in item ? addMonths(today, item.months) : addDays(today, item.days))} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-800 hover:border-blue-300 disabled:opacity-50">{item.label}</button>)}</div>
            <label className="block text-sm font-medium text-slate-700">Chọn ngày cụ thể<input type="date" min={today || undefined} value={form.targetDate} onChange={(event) => chooseDate(event.target.value)} aria-invalid={Boolean(fieldErrors.targetDate)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></label>
            {form.decision !== 'SCHEDULED' && <p className="text-xs text-slate-500">Chọn một ngày sẽ tự chuyển quyết định sang “Có hẹn”.</p>}
            {fieldErrors.targetDate && <p className="text-sm text-rose-700" role="alert">{fieldErrors.targetDate}</p>}
            {expectedDate && <p className="flex items-center gap-2 text-sm text-blue-800"><CalendarDays size={16} /> Dự kiến: <strong>{expectedDate}</strong>{daysUntilTarget !== null && daysUntilTarget >= 0 ? ` · sau ${daysUntilTarget} ngày` : ''}</p>}
            {form.decision === 'SCHEDULED' && <><label className="block text-sm font-medium text-slate-700">Khoảng cho phép ± số ngày<input type="number" min={0} max={90} value={form.windowDays} onChange={(event) => update('windowDays', event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></label>
              {fieldErrors.windowDays && <p className="text-sm text-rose-700" role="alert">{fieldErrors.windowDays}</p>}</>}
            {suggestion?.suggestedDate && <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm"><span>Gợi ý theo phác đồ: <strong>{dateLabel(suggestion.suggestedDate)}</strong> · sau {suggestion.intervalDays} ngày</span><button type="button" disabled={readOnly} onClick={() => chooseDate(suggestion.suggestedDate)} className="rounded-md border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-800">Dùng gợi ý từ phác đồ</button></div>}
            {linkedSession && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="status">Đã có lịch buổi điều trị ngày {dateLabel(dateOnly(linkedSession.scheduledAt))}; kế hoạch sẽ liên kết với lịch này.</p>}
          </div>}
          <label className="block text-sm font-medium text-slate-700">Mức ưu tiên<select value={form.priority} onChange={(event) => update('priority', event.target.value as Priority)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="NORMAL">Thường</option><option value="IMPORTANT">Quan trọng</option><option value="URGENT">Khẩn</option></select></label>
          <label className="block text-sm font-medium text-slate-700">Nội dung cần đánh giá<textarea rows={2} maxLength={2000} value={form.reason} onChange={(event) => update('reason', event.target.value)} aria-invalid={Boolean(fieldErrors.reason)} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="Ghi nhận mục đích tái khám theo đánh giá của bác sĩ." /></label>
          {fieldErrors.reason && <p className="text-sm text-rose-700" role="alert">{fieldErrors.reason}</p>}
          <label className="block text-sm font-medium text-slate-700">Chuẩn bị trước khi đến<textarea rows={2} maxLength={2000} value={form.preparation} onChange={(event) => update('preparation', event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></label>
        </fieldset>
      </section>

      <section className="rounded-xl border border-[#e1e9f2] bg-white p-4 shadow-sm sm:p-5" aria-labelledby="follow-up-aftercare-title">
        <h2 id="follow-up-aftercare-title" className="text-lg font-bold text-[#20334b]">Hướng dẫn sau khám / điều trị</h2>
        <label className="mt-4 block text-sm font-medium text-slate-700">Mẫu hướng dẫn<select disabled={readOnly || busy} value={form.templateId} onChange={(event) => applyTemplate(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="">Không dùng mẫu</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name} · {template.scope} v{template.version}</option>)}</select></label>
        {templates.length === 0 && <p className="mt-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">Chưa có mẫu. Soạn hướng dẫn rồi chọn “Lưu làm mẫu của tôi”.</p>}
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-slate-700">Chăm sóc tại nhà<textarea rows={3} maxLength={5000} readOnly={readOnly} value={form.homeCare} onChange={(event) => update('homeCare', event.target.value)} aria-invalid={Boolean(fieldErrors.homeCare)} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 read-only:bg-slate-50" /></label>
          {fieldErrors.homeCare && <p className="text-sm text-rose-700" role="alert">{fieldErrors.homeCare}</p>}
          <label className="block text-sm font-medium text-slate-700">Điều cần tránh<textarea rows={2} maxLength={5000} readOnly={readOnly} value={form.avoid} onChange={(event) => update('avoid', event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 read-only:bg-slate-50" /></label>
          <label className="block text-sm font-medium text-slate-700">Dấu hiệu cần đến sớm<textarea rows={2} maxLength={5000} readOnly={readOnly} value={form.warningSigns} onChange={(event) => update('warningSigns', event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 read-only:bg-slate-50" /></label>
          <label className="block text-sm font-medium text-slate-700">Tin nhắn bổ sung cho bệnh nhân<textarea rows={2} maxLength={5000} readOnly={readOnly} value={form.patientMessage} onChange={(event) => update('patientMessage', event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 read-only:bg-slate-50" /></label>
        </div>
        <label className="mt-4 flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.hideDiagnosis} disabled={readOnly || busy} onChange={(event) => update('hideDiagnosis', event.target.checked)} className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" /> Ẩn chẩn đoán trong tin nhắn bệnh nhân</label>
        {plan?.templateId && <p className="mt-3 text-xs text-slate-500">Từ mẫu {selectedTemplateName ?? 'đã lưu'} v{plan.templateVersion ?? '—'}{editMode ? ' · đang chỉnh sửa bản sao' : ''}</p>}
        {!readOnly && <button type="button" onClick={() => { setTemplateMessage(''); setTemplateDialog(true); }} className="mt-4 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">Lưu làm mẫu của tôi</button>}
      </section>
    </div>

    <aside className="space-y-4">
      <section className="rounded-xl border border-[#e1e9f2] bg-white p-4 shadow-sm sm:p-5"><div className="flex items-center gap-2"><Info size={17} className="text-blue-600" /><h2 className="font-bold text-[#20334b]">Xem trước tin nhắn bệnh nhân</h2></div><div className="mt-3 min-h-28 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">{patientPreview || 'Tin nhắn sẽ hiển thị tại đây khi bác sĩ nhập nội dung. Chưa có lời khuyên mặc định.'}</div><p className="mt-2 text-xs text-slate-500">{form.hideDiagnosis ? 'Chế độ ẩn chẩn đoán đang bật.' : 'Bác sĩ kiểm tra nội dung trước khi xác nhận.'} Việc gửi do quy trình khác thực hiện.</p></section>
      <section className="rounded-xl border border-[#e1e9f2] bg-white p-4 shadow-sm sm:p-5"><h2 className="font-bold text-[#20334b]">Liên kết trong lượt khám</h2><div className="mt-3 space-y-2 text-sm"><Link href={`/bacsi/prescriptions?visitId=${encodeURIComponent(visitId)}`} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-blue-800 hover:bg-blue-50"><span className="flex items-center gap-2"><Pill size={15} /> Đơn thuốc</span><span>{prescriptionCount}</span></Link><button type="button" onClick={onOpenOrders} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-blue-800 hover:bg-blue-50"><span className="flex items-center gap-2"><FlaskConical size={15} /> Chỉ định</span><span>{orderCount}</span></button><Link href={`/bacsi/treatments?visitId=${encodeURIComponent(visitId)}`} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-blue-800 hover:bg-blue-50"><span className="flex items-center gap-2"><Stethoscope size={15} /> Phác đồ / buổi điều trị</span><span aria-hidden="true">›</span></Link><p className="text-xs text-slate-500">{patientName} · {patientCode} · Lượt khám {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(visitDate))}</p></div></section>
      <section className="rounded-xl border border-[#e1e9f2] bg-white p-4 shadow-sm sm:p-5"><h2 className="font-bold text-[#20334b]">Trạng thái kế hoạch</h2><ol className="mt-4 space-y-3">{['DRAFT', 'CONFIRMED', 'NOTIFIED', 'BOOKED', 'COMPLETED'].map((status, index) => {
        const current = plan?.derivedStatus ?? plan?.status ?? null;
        const completedIndex = ['DRAFT', 'CONFIRMED', 'NOTIFIED', 'BOOKED', 'COMPLETED'].indexOf(current ?? '');
        const active = status === current;
        const done = completedIndex >= index;
        return <li key={status} className="flex items-center gap-3"><span className={`flex h-6 w-6 items-center justify-center rounded-full ${active ? 'bg-blue-600 text-white' : done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{done ? <Check size={14} /> : <span className="text-xs">{index + 1}</span>}</span><span className={`text-sm ${active ? 'font-semibold text-blue-800' : 'text-slate-600'}`}>{statusLabel(status)}</span>{active && <span className="sr-only">Trạng thái hiện tại</span>}</li>;
      })}{plan?.derivedStatus === 'OVERDUE' && <li className="rounded-lg bg-rose-50 p-2 text-sm font-semibold text-rose-800">Quá hạn</li>}{plan?.status === 'CANCELLED' && <li className="rounded-lg bg-slate-100 p-2 text-sm text-slate-700">Đã hủy: {plan.cancelReason}</li>}</ol><div className="mt-4 rounded-lg bg-blue-50 p-3 text-xs leading-5 text-blue-900"><ShieldCheck size={14} className="mr-1 inline" /> Chỉ trạng thái do API suy ra mới được hiển thị; bác sĩ không sửa trạng thái gửi nhắc hay đặt lịch.</div></section>
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{notice}</p>}
      <section className="rounded-xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-600 shadow-sm"><b className="text-slate-800">Lưu ý dữ liệu</b><p className="mt-1">Quyết định, ngày dự kiến, mức ưu tiên và hướng dẫn được lưu vào FollowUpPlan của lượt khám. Mẫu hướng dẫn chỉ cung cấp nội dung để bác sĩ chỉnh sửa. Trạng thái nhắc lịch và đặt lịch được đọc từ dữ liệu liên kết.</p></section>
    </aside>

    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e1e9f2] bg-white p-4 shadow-sm xl:col-span-2">
      <p className="flex items-center gap-2 text-xs text-slate-500"><Clock3 size={15} /> {plan?.status === 'CONFIRMED' ? `Đã xác nhận${plan.confirmedAt ? ` · ${new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(plan.confirmedAt))}` : ''}` : 'Lưu nháp không xác nhận hoặc gửi thông báo.'}</p>
      <div className="flex flex-wrap gap-2">{plan?.status === 'CONFIRMED' && !editMode && <><button type="button" onClick={() => setEditMode(true)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50">Chỉnh sửa</button><button type="button" onClick={() => setCancelDialog(true)} className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50">Hủy kế hoạch</button></>}{editable && <><button type="button" onClick={() => void saveDraft()} disabled={busy} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-blue-800 disabled:opacity-60"><Save size={15} />{busy ? 'Đang lưu…' : 'Lưu nháp'}</button><button type="button" onClick={() => void confirmPlan()} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-[#246dce] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"><Check size={15} />{busy ? 'Đang xác nhận…' : 'Xác nhận kế hoạch tái khám'}</button></>}{plan?.status === 'CANCELLED' && <span className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-600">Kế hoạch đã hủy</span>}</div>
    </div>

    {cancelDialog && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="follow-up-cancel-title" className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"><h2 id="follow-up-cancel-title" className="text-lg font-bold text-slate-900">Hủy kế hoạch tái khám</h2><label className="mt-4 block text-sm font-medium text-slate-700">Lý do hủy<textarea autoFocus rows={3} value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 p-3 text-sm" /></label><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setCancelDialog(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">Quay lại</button><button type="button" disabled={busy} onClick={() => void cancelPlan()} className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">Xác nhận hủy</button></div></section></div>}

    {templateDialog && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="follow-up-template-title" className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"><h2 id="follow-up-template-title" className="text-lg font-bold text-slate-900">Lưu mẫu hướng dẫn cá nhân</h2><label className="mt-4 block text-sm font-medium text-slate-700">Tên mẫu<input autoFocus value={templateName} onChange={(event) => setTemplateName(event.target.value)} maxLength={160} className="mt-1 block w-full rounded-lg border border-slate-300 p-3 text-sm" /></label>{templateMessage && <p role="alert" className="mt-2 text-sm text-rose-700">{templateMessage}</p>}<div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setTemplateDialog(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">Hủy</button><button type="button" disabled={busy} onClick={() => void saveTemplate()} className="rounded-lg bg-[#246dce] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">Lưu mẫu</button></div></section></div>}
  </div>;
}

