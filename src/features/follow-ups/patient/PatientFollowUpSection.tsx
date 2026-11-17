'use client';

import { useEffect, useMemo, useState } from 'react';
import { BellRing, CalendarClock, CircleAlert, ShieldCheck } from 'lucide-react';

type Plan = {
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

const statusText: Record<string, string> = {
  NOTIFIED: 'Chưa đặt lịch', BOOKED: 'Chờ phòng khám xác nhận', CONFIRMED: 'Đã xác nhận lịch',
  PATIENT_CONFIRMED: 'Bạn đã xác nhận sẽ đến', COMPLETED: 'Đã tái khám', OVERDUE: 'Quá hạn tái khám',
};
const fmt = (value: string | null) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value)) : 'Theo lịch bác sĩ hướng dẫn';

export function PatientFollowUpSection() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);
  const [retry, setRetry] = useState(false);

  useEffect(() => {
    if (!active) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setActive(null); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [active]);

  useEffect(() => {
    let alive = true;
    fetch('/api/patients/follow-ups', { credentials: 'same-origin', cache: 'no-store' })
      .then(async (response) => response.ok ? response.json() : null)
      .then((body) => { if (alive && body?.success && Array.isArray(body.plans)) setPlans(body.plans); })
      .catch(() => undefined)
      .finally(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, []);

  const sorted = useMemo(() => [...plans].sort((a, b) => {
    const rank = (plan: Plan) => plan.derivedStatus === 'OVERDUE' ? 0 : 1;
    return rank(a) - rank(b) || (a.targetDate ? Date.parse(a.targetDate) : Infinity) - (b.targetDate ? Date.parse(b.targetDate) : Infinity);
  }), [plans]);

  async function confirm(plan: Plan) {
    setSaving(true); setRetry(false);
    try {
      const response = await fetch(`/api/patients/follow-ups/${encodeURIComponent(plan.id)}/confirm`, {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
      if (!response.ok) throw new Error('confirm failed');
      setPlans((current) => current.map((item) => item.id === plan.id ? { ...item, derivedStatus: 'PATIENT_CONFIRMED', canConfirmArrival: false } : item));
      setActive((current) => current?.id === plan.id ? { ...current, derivedStatus: 'PATIENT_CONFIRMED', canConfirmArrival: false } : current);
    } catch { setRetry(true); } finally { setSaving(false); }
  }

  if (!loaded || !plans.length) return null;
  return <section className="mb-7" aria-labelledby="patient-follow-up-title">
    <div className="mb-4 flex items-end justify-between gap-3">
      <div><h2 id="patient-follow-up-title" className="text-xl font-bold text-[#0c3865]">Nhắc tái khám &amp; dặn dò</h2><p className="mt-1 text-sm text-[#718196]">Thông tin được phòng khám gửi riêng cho hồ sơ của bạn.</p></div>
      <BellRing className="shrink-0 text-[#176cce]" aria-hidden="true" />
    </div>
    <div className="grid gap-4">
      {sorted.map((plan) => {
        const status = plan.derivedStatus ?? 'CONFIRMED';
        return <article key={plan.id} className="rounded-2xl border border-[#dce7f2] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-wide text-[#718196]">Tái khám · {fmt(plan.targetDate)}</p><h3 className="mt-2 font-bold text-[#0c3865]">{plan.patientMessage || 'Bác sĩ đã gửi hướng dẫn tái khám cho bạn.'}</h3></div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status === 'OVERDUE' ? 'bg-amber-50 text-amber-800' : 'bg-[#eaf4ff] text-[#176cce]'}`}>{statusText[status] ?? 'Theo dõi tái khám'}</span>
          </div>
          {plan.appointment && <p className="mt-3 flex items-center gap-2 text-sm text-[#52677d]"><CalendarClock size={16} aria-hidden="true"/>Lịch hẹn {fmt(plan.appointment.scheduledAt)}{plan.appointment.doctorName ? ` · ${plan.appointment.doctorName}` : ''}{plan.appointment.roomName ? ` · ${plan.appointment.roomName}` : ''}</p>}
          <div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={() => { setActive(plan); setRetry(false); }} className="rounded-xl border border-[#bcd2e5] px-4 py-2 text-sm font-semibold text-[#176cce] hover:bg-[#f4f8fc]">Xem hướng dẫn</button>{plan.canConfirmArrival && <button type="button" onClick={() => confirm(plan)} disabled={saving} className="rounded-xl bg-[#176cce] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Đang xác nhận…' : 'Tôi sẽ đến'}</button>}</div>
        </article>;
      })}
    </div>
    {active && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setActive(null); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="follow-up-dialog-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-[#176cce]">Hướng dẫn tái khám</p><h2 id="follow-up-dialog-title" className="mt-1 text-xl font-bold text-[#0c3865]">{fmt(active.targetDate)}</h2></div><button type="button" onClick={() => setActive(null)} aria-label="Đóng" className="rounded-lg px-3 py-1 text-slate-500 hover:bg-slate-100">✕</button></div>
        {active.patientMessage && <p className="mt-4 rounded-xl bg-[#eaf4ff] p-4 text-sm text-[#0c3865]">{active.patientMessage}</p>}
        {[['Chuẩn bị', active.preparation], ['Chăm sóc tại nhà', active.homeCare], ['Nên tránh', active.avoid], ['Khi nào cần liên hệ phòng khám', active.warningSigns]].map(([title, content]) => content ? <div key={title} className="mt-4"><h3 className="text-sm font-bold text-[#0c3865]">{title}</h3><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#52677d]">{content}</p></div> : null)}
        <p className="mt-5 flex gap-2 text-xs text-[#718196]"><ShieldCheck size={15} aria-hidden="true"/>Thông tin này chỉ hiển thị trong phiên đăng nhập của bạn.</p>
        {retry && <p role="alert" className="mt-3 flex gap-2 text-sm text-red-700"><CircleAlert size={16}/>Chưa thể xác nhận lúc này. Vui lòng thử lại.</p>}
        <div className="mt-5 flex flex-wrap justify-end gap-3"><a href="/khachhang/appointments" className="rounded-xl border border-[#bcd2e5] px-4 py-2 text-sm font-semibold text-[#176cce]">Xem lịch hẹn</a>{active.canConfirmArrival && <button type="button" onClick={() => confirm(active)} disabled={saving} className="rounded-xl bg-[#176cce] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Đang xác nhận…' : 'Tôi sẽ đến'}</button>}</div>
      </section>
    </div>}
  </section>;
}
