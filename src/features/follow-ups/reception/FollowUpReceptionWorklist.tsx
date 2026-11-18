'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Phone, RefreshCw, X } from 'lucide-react';

type Label = 'NEEDS_BOOKING' | 'OVERDUE' | 'BOOKED' | 'NEEDS_REVIEW' | 'CALL_BACK_TODAY' | 'NOT_NEEDED' | 'ON_SYMPTOMS' | 'COMPLETED';
type Item = {
  planId: string; planVersion: number; patientId: string; patientName: string; patientCode: string; patientPhone: string | null;
  doctorId: string; doctorName: string; decision: string; targetDate: string | null; windowDays: number | null;
  priority: 'NORMAL' | 'IMPORTANT' | 'URGENT'; preparation: string | null; patientMessage: string | null; label: Label;
  appointment: { id: string; scheduledAt: string; status: string; employeeId: string | null; roomId: string | null; serviceId: string | null } | null;
  latestContact: { outcome: string | null; note: string | null; callbackAt: string | null; createdAt: string } | null;
};
type Detail = Item & { history: Array<{ action: string; createdAt: string; outcome?: string; note?: string; callbackAt?: string; before?: { scheduledAt?: string }; after?: { scheduledAt?: string }; reason?: string }> };
type Options = { doctors: Array<{ id: string; name: string }>; services: Array<{ id: string; name: string }>; rooms: Array<{ id: string; name: string }> };
type ApiResult<T> = { success: boolean; data?: T; error?: string };
type Tab = 'todo' | 'booked' | 'all';
type DialogMode = 'contact' | 'book' | 'reschedule' | null;

const labels: Record<Label, string> = {
  NEEDS_BOOKING: 'Cần đặt lịch', OVERDUE: 'Quá hạn', BOOKED: 'Đã đặt lịch', NEEDS_REVIEW: 'Cần xem lại',
  CALL_BACK_TODAY: 'Gọi lại hôm nay', NOT_NEEDED: 'Không cần tái khám', ON_SYMPTOMS: 'Quay lại khi có dấu hiệu', COMPLETED: 'Đã tái khám',
};
const contactLabels: Record<string, string> = { BN_XAC_NHAN: 'Bệnh nhân xác nhận', XIN_DOI_LICH: 'Xin đổi lịch',
  TU_CHOI: 'Từ chối', KHONG_LIEN_LAC_DUOC: 'Không liên lạc được', HEN_GOI_LAI: 'Hẹn gọi lại' };
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Không thể kết nối. Vui lòng thử lại.';
const fmt = (value: string | null | undefined, time = false) => value ? new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric',
  ...(time ? { hour: '2-digit', minute: '2-digit' } : {}),
}).format(new Date(value)) : 'Chưa có';
const field = 'w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100';
const primary = 'rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50';
const secondary = 'rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50';

async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/letan/follow-ups${path}`, { method: body === undefined ? 'GET' : 'POST',
    credentials: 'same-origin', headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store' });
  const result = await response.json() as ApiResult<T>;
  if (!response.ok || !result.success || result.data === undefined) throw new Error(result.error ?? 'Không thể tải dữ liệu tái khám.');
  return result.data;
}

function localDateOnly(value: string) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
function outsideWindow(item: Item, localValue: string) {
  if (!item.targetDate || !localValue) return false;
  const target = Date.parse(`${localDateOnly(item.targetDate)}T00:00:00Z`);
  const selected = Date.parse(`${localValue.slice(0, 10)}T00:00:00Z`);
  return Math.abs(target - selected) > (item.windowDays ?? 0) * 86_400_000;
}

export function FollowUpReceptionWorklist() {
  const [tab, setTab] = useState<Tab>('todo');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ from: '', to: '', priority: '', doctorId: '', search: '', quick: '' });
  const [rows, setRows] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [options, setOptions] = useState<Options>({ doctors: [], services: [], rooms: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ field: 'callbackAt' | 'scheduledAt' | 'employeeId'; message: string } | null>(null);
  const [contact, setContact] = useState({ outcome: 'BN_XAC_NHAN', note: '', callbackAt: '' });
  const [booking, setBooking] = useState({ scheduledAt: '', employeeId: '', serviceId: '', roomId: '', reason: 'BN_YEU_CAU', note: '' });
  const [notice, setNotice] = useState<string | null>(null);
  const [minDateTime, setMinDateTime] = useState('');
  const requestNumber = useRef(0);

  const load = useCallback(async () => {
    const currentRequest = ++requestNumber.current;
    setLoading(true); setError(null);
    const params = new URLSearchParams({ tab, page: String(page) });
    for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
    try {
      const data = await api<{ items: Item[]; total: number }>(`?${params.toString()}`);
      if (currentRequest === requestNumber.current) { setRows(data.items); setTotal(data.total); }
    } catch (caught) { if (currentRequest === requestNumber.current) { setError(errorText(caught)); setRows([]); setTotal(0); } }
    finally { if (currentRequest === requestNumber.current) setLoading(false); }
  }, [tab, page, filters]);

  useEffect(() => { void load(); }, [load, reload]);
  useEffect(() => { void api<Options>('/options').then((data) => { setOptions(data); setOptionsError(null); })
    .catch(() => setOptionsError('Không thể tải danh mục bác sĩ, dịch vụ và phòng.')); }, [reload]);
  useEffect(() => { const now = new Date(); const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now); const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''; setMinDateTime(`${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`); }, []);
  useEffect(() => {
    if (!detail) return;
    const handle = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) { if (dialog) setDialog(null); else setDetail(null); } };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [detail, dialog, busy]);

  async function openDetail(id: string) {
    setDetailLoading(true); setFormError(null); setNotice(null);
    try { setDetail(await api<Detail>(`/${encodeURIComponent(id)}`)); }
    catch (caught) { setError(errorText(caught)); }
    finally { setDetailLoading(false); }
  }
  async function refreshDetail(id: string) {
    setDetail(await api<Detail>(`/${encodeURIComponent(id)}`)); setReload((count) => count + 1);
  }
  function openDialog(mode: DialogMode) {
    if (!detail) return;
    setDialog(mode); setFormError(null); setFieldError(null);
    setContact({ outcome: 'BN_XAC_NHAN', note: '', callbackAt: '' });
    const defaultService = options.services.find((service) => service.name.toLocaleLowerCase('vi-VN').includes('tái khám'));
    setBooking({ scheduledAt: '', employeeId: detail.appointment?.employeeId ?? detail.doctorId,
      serviceId: detail.appointment?.serviceId ?? defaultService?.id ?? '', roomId: detail.appointment?.roomId ?? '',
      reason: 'BN_YEU_CAU', note: '' });
  }
  async function submit() {
    if (!detail || !dialog) return;
    setFormError(null); setFieldError(null);
    if (dialog === 'contact' && contact.outcome === 'HEN_GOI_LAI' && !contact.callbackAt) { setFieldError({ field: 'callbackAt', message: 'Vui lòng chọn thời điểm gọi lại.' }); return; }
    if (dialog !== 'contact' && !booking.employeeId) { setFieldError({ field: 'employeeId', message: 'Vui lòng chọn bác sĩ.' }); return; }
    if (dialog !== 'contact' && !booking.scheduledAt) { setFieldError({ field: 'scheduledAt', message: 'Vui lòng chọn thời gian hẹn.' }); return; }
    const at = booking.scheduledAt ? new Date(`${booking.scheduledAt}:00+07:00`) : null;
    if (dialog !== 'contact' && (!at || !Number.isFinite(at.getTime()) || at <= new Date())) { setFieldError({ field: 'scheduledAt', message: 'Thời gian hẹn phải ở tương lai.' }); return; }
    const callbackAt = contact.callbackAt ? new Date(`${contact.callbackAt}:00+07:00`) : null;
    if (dialog === 'contact' && callbackAt && !Number.isFinite(callbackAt.getTime())) { setFieldError({ field: 'callbackAt', message: 'Thời điểm gọi lại không hợp lệ.' }); return; }
    setBusy(true);
    try {
      const payload = dialog === 'contact' ? { outcome: contact.outcome, note: contact.note,
        callbackAt: callbackAt?.toISOString() }
        : dialog === 'book' ? { scheduledAt: at!.toISOString(), employeeId: booking.employeeId,
          serviceId: booking.serviceId || null, roomId: booking.roomId || null }
          : { scheduledAt: at!.toISOString(), employeeId: booking.employeeId, reason: booking.reason, note: booking.note };
      const result = await api<{ outsideWindow?: boolean; linkedExisting?: boolean }>(`/${encodeURIComponent(detail.planId)}/${dialog}`, payload);
      setDialog(null);
      setNotice(result.linkedExisting ? 'Đã liên kết lịch buổi điều trị có sẵn.' : result.outsideWindow ? 'Đã lưu lịch ngoài khoảng dự kiến của bác sĩ.' : 'Đã lưu thay đổi.');
      await refreshDetail(detail.planId);
    } catch (caught) { setFormError(errorText(caught)); }
    finally { setBusy(false); }
  }
  async function acknowledge() {
    if (!detail) return;
    setBusy(true); setFormError(null);
    try { await api(`/${encodeURIComponent(detail.planId)}/ack`, {}); await refreshDetail(detail.planId); setNotice('Đã xác nhận xem thay đổi kế hoạch.'); }
    catch (caught) { setFormError(errorText(caught)); }
    finally { setBusy(false); }
  }
  const updateFilter = (key: keyof typeof filters, value: string) => { setPage(1); setFilters((current) => ({ ...current, [key]: value })); };

  return <main className="space-y-5">
    <header><span className="mb-2 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">📋 Phân hệ Lễ tân</span>
      <h1 className="text-2xl font-bold text-gray-900">Tái khám cần đặt lịch</h1>
      <p className="mt-1 text-sm text-gray-500">Theo dõi kế hoạch bác sĩ đã xác nhận và sắp xếp lịch hẹn cho bệnh nhân.</p></header>
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap border-b border-gray-200" role="tablist" aria-label="Trạng thái tái khám">
        {([['todo', 'Cần xử lý'], ['booked', 'Đã đặt lịch'], ['all', 'Tất cả']] as const).map(([key, name]) =>
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => { setTab(key); setPage(1); setDetail(null); }}
            className={`px-5 py-4 text-sm font-semibold ${tab === key ? 'border-b-2 border-emerald-600 text-emerald-800' : 'text-gray-500 hover:bg-gray-50'}`}>{name}</button>)}
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs font-medium text-gray-600">Tìm bệnh nhân<input className={`mt-1 ${field}`} value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} placeholder="Tên, mã hoặc số điện thoại" /></label>
        <label className="text-xs font-medium text-gray-600">Từ ngày<input type="date" className={`mt-1 ${field}`} value={filters.from} onChange={(event) => updateFilter('from', event.target.value)} /></label>
        <label className="text-xs font-medium text-gray-600">Đến ngày<input type="date" className={`mt-1 ${field}`} value={filters.to} onChange={(event) => updateFilter('to', event.target.value)} /></label>
        <label className="text-xs font-medium text-gray-600">Ưu tiên<select className={`mt-1 ${field}`} value={filters.priority} onChange={(event) => updateFilter('priority', event.target.value)}><option value="">Tất cả</option><option value="NORMAL">Thường</option><option value="IMPORTANT">Quan trọng</option><option value="URGENT">Khẩn</option></select></label>
        <label className="text-xs font-medium text-gray-600">Bác sĩ<select className={`mt-1 ${field}`} value={filters.doctorId} onChange={(event) => updateFilter('doctorId', event.target.value)}><option value="">Tất cả</option>{options.doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}</select></label>
        <label className="text-xs font-medium text-gray-600">Lọc nhanh<select className={`mt-1 ${field}`} value={filters.quick} onChange={(event) => updateFilter('quick', event.target.value)}><option value="">Tất cả</option><option value="overdue">Quá hạn</option><option value="next7">Trong 7 ngày tới</option></select></label>
        <div className="flex items-end"><button type="button" className={secondary} onClick={() => setReload((count) => count + 1)}><RefreshCw size={15} className="mr-2 inline" />Tải lại</button></div>
      </div>
      {error && <div role="alert" className="mx-4 mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error} <button type="button" className="ml-2 underline" onClick={() => setReload((count) => count + 1)}>Thử lại</button></div>}
      {optionsError && <div role="alert" className="mx-4 mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{optionsError} <button type="button" className="ml-2 underline" onClick={() => setReload((count) => count + 1)}>Thử lại</button></div>}
      {loading ? <p className="p-8 text-center text-sm text-gray-500">Đang tải kế hoạch tái khám...</p> : rows.length === 0
        ? <p className="p-8 text-center text-sm text-gray-500">{tab === 'todo' ? 'Không có tái khám cần xử lý.' : 'Không có kế hoạch tái khám phù hợp.'}</p>
        : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-gray-50 text-gray-600"><tr><th className="p-3">Bệnh nhân</th><th className="p-3">Bác sĩ</th><th className="p-3">Ngày dự kiến</th><th className="p-3">Ưu tiên</th><th className="p-3">Trạng thái</th><th className="p-3">Lịch hẹn</th><th className="p-3">Liên hệ gần nhất</th><th className="p-3">Chi tiết</th></tr></thead>
          <tbody>{rows.map((item) => <tr key={item.planId} className="border-t border-gray-100"><td className="p-3"><strong className="block text-gray-900">{item.patientName}</strong><span className="text-xs text-gray-500">{item.patientCode}</span></td><td className="p-3">{item.doctorName}</td><td className="p-3">{fmt(item.targetDate)}{item.targetDate && <small className="block text-gray-500">± {item.windowDays ?? 0} ngày</small>}</td><td className="p-3">{item.priority === 'URGENT' ? 'Khẩn · Nên đến sớm' : item.priority === 'IMPORTANT' ? 'Quan trọng' : 'Thường'}</td><td className="p-3"><span className="rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-800">{labels[item.label]}</span></td><td className="p-3">{fmt(item.appointment?.scheduledAt, true)}</td><td className="p-3">{item.latestContact?.outcome ? contactLabels[item.latestContact.outcome] ?? item.latestContact.outcome : 'Chưa liên hệ'}</td><td className="p-3"><button type="button" className="font-semibold text-emerald-700 underline" onClick={() => void openDetail(item.planId)}>Xem</button></td></tr>)}</tbody></table></div>}
      <footer className="flex items-center justify-between border-t border-gray-100 p-4 text-sm text-gray-600"><span>{total} kế hoạch · Trang {page} / {Math.max(1, Math.ceil(total / 20))}</span><div className="flex gap-2"><button type="button" className={secondary} disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} aria-label="Trang trước"><ChevronLeft size={16} /></button><button type="button" className={secondary} disabled={page * 20 >= total || loading} onClick={() => setPage((value) => value + 1)} aria-label="Trang sau"><ChevronRight size={16} /></button></div></footer>
    </section>
    {detailLoading && <p role="status" className="text-sm text-gray-600">Đang tải chi tiết...</p>}
    {detail && <div className="fixed inset-0 z-40 flex justify-end bg-gray-900/40" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setDetail(null); }}>
      <aside role="dialog" aria-modal="true" aria-label="Chi tiết kế hoạch tái khám" className="h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between"><div><span className="text-xs font-semibold text-emerald-700">{labels[detail.label]}</span><h2 className="mt-1 text-xl font-bold text-gray-900">{detail.patientName}</h2><p className="text-sm text-gray-500">{detail.patientCode} · {detail.patientPhone ?? 'Chưa có số điện thoại'}</p></div><button type="button" aria-label="Đóng chi tiết" onClick={() => setDetail(null)}><X size={21} /></button></div>
        <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-4 text-sm"><div><span className="text-gray-500">Bác sĩ</span><strong className="block">{detail.doctorName}</strong></div><div><span className="text-gray-500">Ngày dự kiến</span><strong className="block">{fmt(detail.targetDate)} ± {detail.windowDays ?? 0} ngày</strong></div><div><span className="text-gray-500">Ưu tiên</span><strong className="block">{detail.priority === 'URGENT' ? 'Khẩn · Nên đến sớm' : detail.priority === 'IMPORTANT' ? 'Quan trọng' : 'Thường'}</strong></div><div><span className="text-gray-500">Lịch hẹn</span><strong className="block">{fmt(detail.appointment?.scheduledAt, true)}</strong></div></div>
        <section className="mt-5 space-y-3 text-sm"><h3 className="font-bold text-gray-900">Thông tin để liên hệ</h3><p><strong>Chuẩn bị trước khi đến:</strong> {detail.preparation || 'Chưa có nội dung.'}</p><p><strong>Lời nhắn của bác sĩ:</strong> {detail.patientMessage || 'Chưa có lời nhắn.'}</p></section>
        <section className="mt-5"><h3 className="font-bold text-gray-900">Lịch sử liên hệ và đặt lịch</h3>{detail.history.length ? <ol className="mt-3 space-y-2">{detail.history.map((entry, index) => <li key={`${entry.createdAt}-${index}`} className="rounded-xl border border-gray-200 p-3 text-sm"><span className="text-xs text-gray-500">{fmt(entry.createdAt, true)}</span><strong className="block">{entry.action === 'FOLLOWUP_CONTACT_LOGGED' ? contactLabels[entry.outcome ?? ''] ?? 'Liên hệ' : entry.action === 'FOLLOWUP_APPOINTMENT_BOOKED' ? 'Đã đặt lịch' : entry.action === 'FOLLOWUP_PLAN_CHANGE_ACK' ? 'Đã xem thay đổi' : 'Đã đổi lịch'}</strong>{entry.note && <p className="mt-1">{entry.note}</p>}{entry.callbackAt && <p>Hẹn gọi lại: {fmt(entry.callbackAt, true)}</p>}{entry.before?.scheduledAt && <p>Giờ cũ: {fmt(entry.before.scheduledAt, true)} → Giờ mới: {fmt(entry.after?.scheduledAt, true)}</p>}</li>)}</ol> : <p className="mt-2 text-sm text-gray-500">Chưa có lịch sử liên hệ hoặc đặt lịch.</p>}</section>
        {notice && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}{formError && !dialog && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
        {tab !== 'all' && detail.label !== 'COMPLETED' && <div className="mt-6 flex flex-wrap gap-2 border-t pt-4"><button type="button" className={secondary} disabled={busy} onClick={() => openDialog('contact')}><Phone size={15} className="mr-1 inline" />Ghi nhận liên hệ</button>{detail.decision === 'SCHEDULED' && <button type="button" className={primary} disabled={busy} onClick={() => openDialog(detail.appointment ? 'reschedule' : 'book')}><CalendarDays size={15} className="mr-1 inline" />{detail.appointment ? 'Đổi lịch' : 'Đặt lịch'}</button>}{detail.label === 'NEEDS_REVIEW' && <button type="button" className={secondary} disabled={busy} onClick={() => void acknowledge()}><ClipboardList size={15} className="mr-1 inline" />Đã xem thay đổi</button>}</div>}
      </aside>
    </div>}
    {dialog && detail && <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setDialog(null); }}><section role="dialog" aria-modal="true" aria-label={dialog === 'contact' ? 'Ghi nhận liên hệ' : dialog === 'book' ? 'Đặt lịch tái khám' : 'Đổi lịch tái khám'} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl"><div className="flex items-start justify-between"><h2 className="text-lg font-bold text-gray-900">{dialog === 'contact' ? 'Ghi nhận liên hệ' : dialog === 'book' ? 'Đặt lịch tái khám' : 'Đổi lịch tái khám'}</h2><button type="button" aria-label="Đóng hộp thoại" disabled={busy} onClick={() => setDialog(null)}><X size={20} /></button></div><p className="text-sm text-gray-600">{detail.patientName} · {detail.patientCode} · {detail.patientPhone ?? 'Chưa có SĐT'}</p>
      {dialog === 'contact' ? <><label className="block text-sm font-medium">Kết quả liên hệ<select className={`mt-1 ${field}`} value={contact.outcome} onChange={(event) => setContact({ ...contact, outcome: event.target.value })}>{Object.entries(contactLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{contact.outcome === 'HEN_GOI_LAI' && <label className="block text-sm font-medium">Thời điểm gọi lại<input type="datetime-local" className={`mt-1 ${field}`} value={contact.callbackAt} onChange={(event) => setContact({ ...contact, callbackAt: event.target.value })} />{fieldError?.field === 'callbackAt' && <span role="alert" className="mt-1 block text-xs text-red-700">{fieldError.message}</span>}</label>}<label className="block text-sm font-medium">Ghi chú<textarea className={`mt-1 ${field}`} maxLength={500} value={contact.note} onChange={(event) => setContact({ ...contact, note: event.target.value })} /></label></>
        : <><label className="block text-sm font-medium">Bác sĩ<select className={`mt-1 ${field}`} value={booking.employeeId} onChange={(event) => setBooking({ ...booking, employeeId: event.target.value })}><option value="">Chọn bác sĩ</option>{options.doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}</select>{fieldError?.field === 'employeeId' && <span role="alert" className="mt-1 block text-xs text-red-700">{fieldError.message}</span>}</label>{dialog === 'book' && <><label className="block text-sm font-medium">Dịch vụ<select className={`mt-1 ${field}`} value={booking.serviceId} onChange={(event) => setBooking({ ...booking, serviceId: event.target.value })}><option value="">Chưa chọn dịch vụ</option>{options.services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label><label className="block text-sm font-medium">Phòng khám<select className={`mt-1 ${field}`} value={booking.roomId} onChange={(event) => setBooking({ ...booking, roomId: event.target.value })}><option value="">Chưa xếp phòng</option>{options.rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</select></label></>}<label className="block text-sm font-medium">Thời gian hẹn<input type="datetime-local" className={`mt-1 ${field}`} min={minDateTime || undefined} value={booking.scheduledAt} onChange={(event) => setBooking({ ...booking, scheduledAt: event.target.value })} />{fieldError?.field === 'scheduledAt' && <span role="alert" className="mt-1 block text-xs text-red-700">{fieldError.message}</span>}</label>{booking.scheduledAt && outsideWindow(detail, booking.scheduledAt) && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Thời gian này nằm ngoài khoảng tái khám dự kiến của bác sĩ. Bạn vẫn có thể lưu lịch.</p>}<p className="rounded-xl bg-blue-50 p-3 text-xs text-blue-800">Các lịch hẹn phải cách nhau tối thiểu 30 phút theo bác sĩ, phòng khám hoặc bệnh nhân.</p>{dialog === 'reschedule' && <><label className="block text-sm font-medium">Lý do đổi lịch<select className={`mt-1 ${field}`} value={booking.reason} onChange={(event) => setBooking({ ...booking, reason: event.target.value })}><option value="BN_YEU_CAU">Bệnh nhân yêu cầu</option><option value="PHONG_KHAM_DOI">Phòng khám đổi</option><option value="KHAC">Khác</option></select></label><label className="block text-sm font-medium">Ghi chú<textarea className={`mt-1 ${field}`} maxLength={500} value={booking.note} onChange={(event) => setBooking({ ...booking, note: event.target.value })} /></label></>}</>}
      {formError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{formError}</p>}<div className="flex justify-end gap-2"><button type="button" className={secondary} disabled={busy} onClick={() => setDialog(null)}>Đóng</button><button type="button" className={primary} disabled={busy} onClick={() => void submit()}>{busy ? 'Đang lưu...' : 'Lưu'}</button></div>
    </section></div>}
  </main>;
}
