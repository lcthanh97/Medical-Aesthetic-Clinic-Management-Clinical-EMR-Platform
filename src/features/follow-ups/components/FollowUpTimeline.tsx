'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Clock3 } from 'lucide-react';
import type { FollowUpPlanView } from '../follow-up-api';
import { followUpApi } from '../follow-up-api';

type VisitSummary = { id: string; visitDate: string; status?: string };
type TimelineEntry = { visit: VisitSummary; plan: FollowUpPlanView };

function labelStatus(plan: FollowUpPlanView) {
  const value = plan.derivedStatus ?? plan.status;
  const labels: Record<string, string> = {
    DRAFT: 'Nháp', CONFIRMED: 'Đã xác nhận', NOTIFIED: 'Đã gửi nhắc', BOOKED: 'Đã đặt lịch',
    COMPLETED: 'Đã tái khám', OVERDUE: 'Quá hạn', CANCELLED: 'Đã hủy',
  };
  return labels[value] ?? 'Chưa có trạng thái';
}

function dateLabel(value: string | null | undefined) {
  if (!value) return 'Chưa chọn ngày';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa chọn ngày';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' }).format(date);
}

export function FollowUpTimeline({ visits }: { visits: VisitSummary[] }) {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError('');
      const recentVisits = visits.slice(0, 30);
      const results = await Promise.all(recentVisits.map(async (visit) => ({ visit, result: await followUpApi.getForVisit(visit.id) })));
      if (!active) return;
      const failed = results.some(({ result }) => !result.success);
      setEntries(results.filter(({ result }) => result.success && result.data).map(({ visit, result }) => ({ visit, plan: result.data! })));
      if (failed) setError('Một số trạng thái tái khám không tải được. Dữ liệu này chỉ xem trong phạm vi được phân công.');
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [visits]);

  const sorted = [...entries].sort((left, right) => new Date(right.visit.visitDate).getTime() - new Date(left.visit.visitDate).getTime());

  return <section className="rounded-xl border border-[#e1e9f2] bg-white p-4 shadow-sm sm:p-5" aria-labelledby="follow-up-history-title">
    <h2 id="follow-up-history-title" className="text-lg font-bold text-[#20334b]">Lịch tái khám</h2>
    <p className="mt-1 text-sm text-slate-500">Trạng thái kế hoạch theo các lượt khám được phép xem · chỉ đọc.</p>
    {loading ? <p className="mt-4 text-sm text-slate-500" aria-live="polite">Đang tải lịch sử tái khám…</p> : error ? <p role="status" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</p> : sorted.length === 0 ? <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-600">Chưa có kế hoạch tái khám được ghi nhận.</p> : <ol className="mt-4 divide-y divide-slate-100">{sorted.map(({ visit, plan }) => <li key={plan.id} className="flex gap-3 py-3 first:pt-0 last:pb-0"><span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700"><CalendarDays size={16} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-800">Lượt khám {dateLabel(visit.visitDate)}</p><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${plan.derivedStatus === 'OVERDUE' ? 'bg-rose-50 text-rose-800' : 'bg-blue-50 text-blue-800'}`}>{labelStatus(plan)}</span></div><p className="mt-1 text-sm text-slate-700">{plan.decision === 'SCHEDULED' ? `Dự kiến tái khám ${dateLabel(plan.targetDate)} · ±${plan.windowDays ?? 0} ngày` : plan.decision === 'NOT_NEEDED' ? 'Không cần hẹn tái khám' : 'Tái khám khi có dấu hiệu theo ghi nhận của bác sĩ'}</p>{plan.reason && <p className="mt-1 text-xs text-slate-500">{plan.reason}</p>}{plan.status === 'CANCELLED' && plan.cancelReason && <p className="mt-1 text-xs text-slate-500">Lý do hủy: {plan.cancelReason}</p>}{plan.confirmedAt && <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-400"><Clock3 size={12} /> Xác nhận {dateLabel(plan.confirmedAt)}</p>}</div></li>)}</ol>}
  </section>;
}

