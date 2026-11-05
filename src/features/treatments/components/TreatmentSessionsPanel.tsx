'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Activity, CalendarDays, FileText, Loader2, RefreshCw, Search, Stethoscope } from 'lucide-react';
import { getTreatmentSessions } from '../actions';

type SessionRecord = {
  id: string; sessionNo: number; scheduledAt: string | null; startedAt: string | null; completedAt: string | null;
  treatmentArea: string | null; clinicalNotes: string | null; patientResponse: string | null; adverseReaction: string | null; status: string;
  visitId: string;
  visit: { id: string; visitDate: string; status: string; patient: { id: string; patientCode: string; fullName: string } };
  stage: { id: string; name: string; orderNo: number; status: string; plan: { id: string; name: string; status: string; patientId: string; visitId: string } };
  step: { id: string; orderNo: number; content: string; status: string } | null;
  performedBy: { id: string; fullName: string } | null;
};
type InventoryDetail = {
  sessionId: string;
  consumptions: Array<{ id: string; actualQuantity: string; unit: string; medicine: { name: string } | null; supply: { name: string } | null }>;
  equipmentUsages: Array<{ id: string; startedAt: string; endedAt: string | null; parameters: unknown; equipment: { name: string }; operator: { fullName: string } | null }>;
};
type Data = { sessions: SessionRecord[]; inventoryDetails: InventoryDetail[]; canReadInventory: boolean };

function dateLabel(value: string | null | undefined) {
  if (!value) return 'Chưa có dữ liệu';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Chưa có dữ liệu' : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return <div><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm font-medium text-slate-800">{value?.trim() || 'Chưa ghi nhận'}</dd></div>;
}

export function TreatmentSessionsPanel({ initialData, initialVisitId = '' }: { initialData: Data; initialVisitId?: string }) {
  const [data, setData] = useState(initialData);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [selectedId, setSelectedId] = useState(initialData.sessions[0]?.id ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const statuses = useMemo(() => [...new Set(data.sessions.map((session) => session.status))].sort(), [data.sessions]);
  const visibleSessions = useMemo(() => data.sessions.filter((session) => !status || session.status === status), [data.sessions, status]);
  const selected = visibleSessions.find((session) => session.id === selectedId) ?? visibleSessions[0];
  const inventory = selected ? data.inventoryDetails.find((detail) => detail.sessionId === selected.id) : undefined;

  async function refresh(event?: React.FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setError('');
    const result = await getTreatmentSessions({ q: query, status, scheduledDate: scheduledDate || undefined, visitId: initialVisitId || undefined });
    if (!result.success) setError('Không thể tải buổi điều trị trong phạm vi được phép.');
    else {
      setData(result.data as Data);
      setSelectedId((current) => result.data.sessions.some((item: SessionRecord) => item.id === current) ? current : result.data.sessions[0]?.id ?? '');
    }
    setLoading(false);
  }

  return (
    <div className="space-y-5">
      <form onSubmit={refresh} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_12rem_12rem_auto_auto] md:items-end">
        <label className="block text-sm font-medium text-slate-700">Tìm bệnh nhân, mã bệnh nhân, phác đồ hoặc bước
          <span className="relative mt-1 block"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={100} className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm" placeholder="Nhập từ khóa" /></span>
        </label>
        <label className="block text-sm font-medium text-slate-700">Trạng thái
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">Tất cả trạng thái</option>{statuses.map((value) => <option key={value} value={value}>{value}</option>)}</select>
        </label>
        <label className="block text-sm font-medium text-slate-700">Ngày dự kiến (UTC)
          <input type="date" value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        </label>
        <button type="submit" disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Tìm buổi</button>
        <button type="button" onClick={() => void refresh()} disabled={loading} aria-label="Làm mới" className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"><RefreshCw size={16} /> Làm mới</button>
      </form>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {loading && <p role="status" className="text-sm text-slate-500">Đang tải buổi điều trị…</p>}
      {!visibleSessions.length ? (
        <section className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><Activity className="mx-auto text-slate-400" /><h2 className="mt-3 font-semibold text-slate-800">{data.sessions.length ? 'Không có buổi phù hợp bộ lọc.' : 'Chưa có buổi điều trị trong phạm vi được phép.'}</h2><p className="mt-1 text-sm text-slate-500">Danh sách chỉ gồm Visit được phân công cho nhân viên đang đăng nhập.</p></section>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.7fr)]">
          <section aria-label="Danh sách buổi điều trị" className="space-y-2">
            {visibleSessions.map((session) => <button key={session.id} type="button" onClick={() => setSelectedId(session.id)} aria-pressed={selected?.id === session.id} className={`w-full rounded-xl border p-4 text-left shadow-sm transition ${selected?.id === session.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'}`}>
              <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{session.visit.patient.fullName}</p><p className="mt-0.5 text-xs text-slate-500">{session.visit.patient.patientCode} · Buổi {session.sessionNo}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{session.status}</span></div>
              <p className="mt-3 text-sm text-slate-700">{session.stage.plan.name}</p><p className="mt-1 text-xs text-slate-500">{dateLabel(session.scheduledAt ?? session.startedAt ?? session.completedAt)}</p>
            </button>)}
          </section>

          {selected && <article className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-start sm:justify-between">
              <div><span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800"><Activity size={13} /> Buổi điều trị #{selected.sessionNo}</span><h2 className="mt-2 text-xl font-bold text-slate-900">{selected.visit.patient.fullName}</h2><p className="text-sm text-slate-500">{selected.visit.patient.patientCode} · Visit {selected.visit.id}</p></div>
              <span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700">{selected.status}</span>
            </header>
            <div className="grid gap-5 p-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Detail label="Ngày dự kiến" value={dateLabel(selected.scheduledAt)} /><Detail label="Bắt đầu" value={dateLabel(selected.startedAt)} /><Detail label="Hoàn tất" value={dateLabel(selected.completedAt)} /><Detail label="Người thực hiện" value={selected.performedBy?.fullName} /></div>
              <section className="rounded-lg border border-slate-200 p-4"><h3 className="font-semibold text-slate-900">Phác đồ và bước thực hiện</h3><dl className="mt-3 grid gap-3 sm:grid-cols-2"><Detail label="Phác đồ" value={selected.stage.plan.name} /><Detail label="Trạng thái phác đồ" value={selected.stage.plan.status} /><Detail label="Giai đoạn" value={`${selected.stage.orderNo}. ${selected.stage.name} · ${selected.stage.status}`} /><Detail label="Bước" value={selected.step ? `${selected.step.orderNo}. ${selected.step.content} · ${selected.step.status}` : null} /></dl></section>
              <section className="rounded-lg border border-slate-200 p-4"><h3 className="font-semibold text-slate-900">Thông tin thực hiện</h3><dl className="mt-3 grid gap-4 sm:grid-cols-2"><Detail label="Vùng điều trị" value={selected.treatmentArea} /><Detail label="Phản hồi người bệnh" value={selected.patientResponse} /><div className="sm:col-span-2"><Detail label="Ghi chú lâm sàng" value={selected.clinicalNotes} /></div><div className="sm:col-span-2"><Detail label="Phản ứng bất lợi đã ghi nhận" value={selected.adverseReaction} /></div></dl></section>
              <section className="rounded-lg border border-slate-200 p-4"><h3 className="font-semibold text-slate-900">Thuốc, vật tư và thiết bị</h3>{!data.canReadInventory ? <p className="mt-2 text-sm text-slate-600">Thông tin chi tiết đang ẩn. Cần TREATMENT_READ và INVENTORY_READ cùng một role để xem.</p> : <div className="mt-3 grid gap-4 lg:grid-cols-2"><div><h4 className="text-sm font-semibold text-slate-700">Tiêu hao đã ghi nhận</h4>{inventory?.consumptions.length ? <ul className="mt-2 space-y-2">{inventory.consumptions.map((item) => <li key={item.id} className="rounded-lg bg-slate-50 p-3 text-sm">{item.medicine?.name ?? item.supply?.name ?? 'Vật tư không xác định'} · {item.actualQuantity} {item.unit}</li>)}</ul> : <p className="mt-2 text-sm text-slate-500">Chưa có tiêu hao được ghi nhận.</p>}</div><div><h4 className="text-sm font-semibold text-slate-700">Thiết bị đã sử dụng</h4>{inventory?.equipmentUsages.length ? <ul className="mt-2 space-y-2">{inventory.equipmentUsages.map((item) => <li key={item.id} className="rounded-lg bg-slate-50 p-3 text-sm"><p className="font-medium">{item.equipment.name}</p><p className="mt-1 text-xs text-slate-500">{dateLabel(item.startedAt)} · {item.operator?.fullName ?? 'Chưa ghi người vận hành'}</p>{item.parameters != null && <pre className="mt-2 overflow-auto text-xs text-slate-600">{JSON.stringify(item.parameters)}</pre>}</li>)}</ul> : <p className="mt-2 text-sm text-slate-500">Chưa có thiết bị được ghi nhận.</p>}</div></div>}</section>
              <section className="flex flex-wrap gap-2 border-t border-slate-100 pt-4"><Link href={`/bacsi/treatments?visitId=${encodeURIComponent(selected.visitId)}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-blue-700"><Activity size={15} /> Phác đồ</Link><Link href={`/bacsi/emr?patientId=${encodeURIComponent(selected.visit.patient.id)}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-blue-700"><FileText size={15} /> Hồ sơ bệnh nhân</Link><Link href={`/bacsi/examination?visitId=${encodeURIComponent(selected.visitId)}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-blue-700"><Stethoscope size={15} /> Khám bệnh</Link><Link href={`/bacsi/prescriptions?visitId=${encodeURIComponent(selected.visitId)}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-blue-700"><CalendarDays size={15} /> Kê đơn</Link><Link href={`/bacsi/images?patientId=${encodeURIComponent(selected.visit.patient.id)}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-blue-700">Ảnh theo dõi</Link><button type="button" disabled title="Cập nhật, hoàn tất buổi và ghi nhận tiêu hao đang khóa để không thay đổi workflow hoặc tồn kho chưa được duyệt." className="cursor-not-allowed rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-500">Cập nhật / hoàn tất (đang khóa)</button></section>
            </div>
          </article>}
        </div>
      )}
    </div>
  );
}
