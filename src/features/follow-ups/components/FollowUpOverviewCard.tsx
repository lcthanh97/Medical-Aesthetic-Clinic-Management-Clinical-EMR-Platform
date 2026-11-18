'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CalendarDays, RefreshCw } from 'lucide-react';
import type { FollowUpOverviewView, FollowUpPlanView } from '../follow-up-api';
import { followUpApi } from '../follow-up-api';
import type { FollowUpDraftInput } from '../follow-ups.schema';

function localDate(value: string | null | undefined) {
  if (!value) return 'Chưa xác định';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Chưa xác định';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' }).format(parsed);
}

function todayHcm() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function plusDays(dateOnly: string, days: number) {
  const [year, month, day] = dateOnly.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function priorityLabel(priority: string) {
  return priority === 'URGENT' ? 'Khẩn' : priority === 'IMPORTANT' ? 'Quan trọng' : 'Thường';
}

function statusLabel(status: string | null) {
  const labels: Record<string, string> = { NOTIFIED: 'Đã gửi nhắc', BOOKED: 'Đã đặt lịch', COMPLETED: 'Đã tái khám', OVERDUE: 'Quá hạn', CONFIRMED: 'Đã xác nhận' };
  return labels[status ?? ''] ?? 'Đã xác nhận';
}

export function FollowUpOverviewCard() {
  const [overview, setOverview] = useState<FollowUpOverviewView | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [priorityDrafts, setPriorityDrafts] = useState<Record<string, FollowUpPlanView['priority']>>({});
  const [cancelPlan, setCancelPlan] = useState<FollowUpPlanView | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const load = useCallback(async () => {
    setError('');
    const result = await followUpApi.overview();
    if (!result.success || !result.data) setError(result.error ?? 'Không tải được danh sách tái khám.');
    else setOverview(result.data);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function updatePlan(plan: FollowUpPlanView, change: { targetDate?: string; priority?: FollowUpPlanView['priority'] }) {
    setBusyId(plan.id); setError('');
    const current = await followUpApi.getForVisit(plan.visitId);
    if (!current.success || !current.data) { setBusyId(''); setError(current.error ?? 'Không tải được kế hoạch hiện tại.'); return; }
    const saved = await followUpApi.saveDraft(plan.visitId, {
      decision: current.data.decision,
      targetDate: change.targetDate ?? (current.data.targetDate ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(current.data.targetDate)) : null),
      windowDays: current.data.windowDays ?? 0,
      priority: change.priority ?? current.data.priority,
      reason: current.data.reason,
      preparation: current.data.preparation,
      homeCare: current.data.homeCare,
      avoid: current.data.avoid,
      warningSigns: current.data.warningSigns,
      patientMessage: current.data.patientMessage,
      hideDiagnosis: current.data.hideDiagnosis,
      templateId: current.data.templateId,
      treatmentSessionId: current.data.treatmentSessionId,
    } as FollowUpDraftInput);
    if (!saved.success) { setBusyId(''); setError(saved.error ?? 'Không lưu được thay đổi.'); return; }
    const confirmed = await followUpApi.confirm(plan.visitId);
    setBusyId('');
    if (!confirmed.success) { setError(confirmed.error ?? 'Không xác nhận được thay đổi.'); return; }
    await load();
  }

  async function cancel() {
    if (!cancelPlan || !cancelReason.trim()) { setError('Nhập lý do trước khi đóng kế hoạch.'); return; }
    setBusyId(cancelPlan.id); setError('');
    const result = await followUpApi.cancel(cancelPlan.visitId, { cancelReason: cancelReason.trim() });
    setBusyId('');
    if (!result.success) { setError(result.error ?? 'Không hủy được kế hoạch.'); return; }
    setCancelPlan(null); setCancelReason('');
    await load();
  }

  const allPlans = [...(overview?.upcoming ?? []), ...(overview?.overdue ?? [])];
  const title = (plan: FollowUpPlanView) => {
    const patient = plan.patient as { fullName?: string; patientCode?: string } | undefined;
    return patient?.fullName ? `${patient.fullName}${patient.patientCode ? ` · ${patient.patientCode}` : ''}` : 'Bệnh nhân';
  };

  return <section className="rounded-[9px] border border-[#dce5ef] bg-white p-5 text-[#20334b]">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-[15px] font-bold">Tái khám sắp tới / quá hạn</h2><p className="mt-1 text-[11px] text-[#6c7e93]">Danh sách theo các kế hoạch bác sĩ đã xác nhận.</p></div><button type="button" onClick={() => { setLoading(true); void load(); }} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-blue-800 disabled:opacity-60"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Làm mới</button></div>
    {(overview?.pendingDecisionCount ?? 0) > 0 && <Link href="/bacsi/queue" className="mt-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><AlertCircle size={18} /><span><strong>{overview?.pendingDecisionCount}</strong> lượt khám chưa có quyết định tái khám · Mở hàng đợi</span></Link>}
    {error && <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {loading ? <p className="mt-4 text-sm text-slate-500" aria-live="polite">Đang tải danh sách…</p> : allPlans.length === 0 ? <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-600">Chưa có kế hoạch tái khám sắp tới hoặc quá hạn.</p> : <div className="mt-4 space-y-3">{allPlans.map((plan) => {
      const overdue = plan.derivedStatus === 'OVERDUE';
      return <article key={plan.id} className={`rounded-lg border p-3 ${overdue ? 'border-rose-200 bg-rose-50/50' : 'border-slate-200'}`}>
        <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{title(plan)}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-slate-600"><CalendarDays size={13} /> Hẹn {localDate(plan.targetDate)} · ±{plan.windowDays ?? 0} ngày</p></div><div className="flex flex-wrap gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${overdue ? 'bg-rose-100 text-rose-800' : 'bg-blue-50 text-blue-800'}`}>{statusLabel(plan.derivedStatus)}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">Ưu tiên {priorityLabel(priorityDrafts[plan.id] ?? plan.priority)}</span></div></div>
        <p className="mt-2 text-sm text-slate-700">{plan.reason || 'Chưa ghi nội dung cần đánh giá.'}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2"><Link href={`/bacsi/clinical-services?visitId=${encodeURIComponent(plan.visitId)}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-50">Mở lượt khám</Link>{overdue && <><button type="button" disabled={Boolean(busyId)} onClick={() => void updatePlan(plan, { targetDate: plusDays(todayHcm(), 7) })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-blue-800 disabled:opacity-60">{busyId === plan.id ? 'Đang lưu…' : 'Gia hạn 1 tuần'}</button><select aria-label={`Đổi mức ưu tiên của ${title(plan)}`} value={priorityDrafts[plan.id] ?? plan.priority} onChange={(event) => setPriorityDrafts((current) => ({ ...current, [plan.id]: event.target.value as FollowUpPlanView['priority'] }))} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"><option value="NORMAL">Thường</option><option value="IMPORTANT">Quan trọng</option><option value="URGENT">Khẩn</option></select><button type="button" disabled={Boolean(busyId) || (priorityDrafts[plan.id] ?? plan.priority) === plan.priority} onClick={() => void updatePlan(plan, { priority: priorityDrafts[plan.id] ?? plan.priority })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-blue-800 disabled:opacity-50">Lưu ưu tiên</button><button type="button" onClick={() => { setCancelPlan(plan); setCancelReason(''); }} className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700">Đóng</button></>}</div>
      </article>;
    })}</div>}
    {cancelPlan && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><section role="dialog" aria-modal="true" aria-labelledby="follow-up-overview-cancel-title" className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"><h2 id="follow-up-overview-cancel-title" className="text-lg font-bold">Đóng kế hoạch tái khám</h2><label className="mt-4 block text-sm font-medium">Lý do<textarea autoFocus rows={3} value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 p-3 text-sm" /></label><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setCancelPlan(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">Quay lại</button><button type="button" disabled={Boolean(busyId)} onClick={() => void cancel()} className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">Xác nhận đóng</button></div></section></div>}
  </section>;
}

