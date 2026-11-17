'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Download, X } from 'lucide-react';
import { PLAN_STATUS_LABELS, SESSION_STATUS_LABELS, type Period, type SessionGroup } from '../treatment-report.metrics';

type FilterState = { period: Period; from: string; to: string; doctorId: string; procedureId: string; planStatus: string };
type Options = { doctors: Array<{ id: string; name: string }>; procedures: Array<{ id: string; name: string }> };
type Summary = {
  period: { from: string; to: string; grain: string; timeZone: string };
  plans: { total: number; active: number; completed: number; draft: number; statuses: Record<string, number> };
  sessions: { total: number; completed: number; upcoming: number; cancelled: number; overdue: number };
  progress: { completed: number; total: number; percent: number | null };
  timeline: Array<{ bucket: string; completed: number; cancelled: number }>;
  doctors: Array<{ id: string; name: string; plans: number; completed: number; cancelled: number; progress: { completed: number; total: number; percent: number | null } }>;
  procedures: Array<{ id: string; name: string; plans: number; sessions: number; progress: { completed: number; total: number; percent: number | null } }>;
};
type PlanRow = { id: string; patientCode: string; patientName: string; planName: string; status: string; doctorName: string;
  procedures: string | null; reportDate: string | null; progress: { completed: number; total: number; percent: number | null };
  nextSession: string | null; overdueSessions: number };
type SessionRow = { id: string; planId: string; sessionNo: number; status: string; group: string; scheduledAt: string | null;
  startedAt: string | null; completedAt: string | null; planName: string; patientCode: string; patientName: string;
  doctorName: string | null; procedure: string | null };
type Page<T> = { items: T[]; total: number; page: number; pageSize: number };
type Drawer = { kind: 'plans' | 'sessions'; title: string; group?: SessionGroup; planId?: string; planStatus?: string };
type Api<T> = { success: boolean; data?: T; error?: string };
const initial: FilterState = { period: 'month', from: '', to: '', doctorId: '', procedureId: '', planStatus: '' };
const box = 'rounded-2xl border border-gray-100 bg-white p-5 shadow-sm';
const select = 'mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100';
const dateText = (value: string | null) => value ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short' }).format(new Date(value)) : 'Chưa có';
const statusText = (value: string) => PLAN_STATUS_LABELS[value] ?? value;
const percentText = (value: number | null) => value === null ? 'Chưa xác định' : `${value}%`;

async function request<T>(path: string): Promise<T> {
  const response = await fetch(path, { cache: 'no-store', credentials: 'same-origin' });
  const result = await response.json() as Api<T>;
  if (!response.ok || !result.success || result.data === undefined) throw new Error(result.error ?? 'Không thể tải báo cáo điều trị.');
  return result.data;
}
function params(filters: FilterState) {
  const output = new URLSearchParams({ period: filters.period });
  for (const key of ['from', 'to', 'doctorId', 'procedureId', 'planStatus'] as const) if (filters[key]) output.set(key, filters[key]);
  return output;
}
function ProgressBar({ value, completed, total }: { value: number | null; completed: number; total: number }) {
  return <div className="min-w-28"><div className="flex justify-between gap-2 text-xs"><strong>{percentText(value)}</strong><span className="text-gray-500">{completed}/{total} buổi</span></div>
    <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-blue-500" style={{ width: `${value ?? 0}%` }} /></div></div>;
}

export function TreatmentReportPanel() {
  const [filters, setFilters] = useState<FilterState>(initial);
  const [ready, setReady] = useState(false);
  const [options, setOptions] = useState<Options | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [plans, setPlans] = useState<Page<PlanRow> | null>(null);
  const [planPage, setPlanPage] = useState(1);
  const [drawer, setDrawer] = useState<Drawer | null>(null);
  const [drawerPage, setDrawerPage] = useState(1);
  const [drawerPlans, setDrawerPlans] = useState<Page<PlanRow> | null>(null);
  const [drawerSessions, setDrawerSessions] = useState<Page<SessionRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [error, setError] = useState('');
  const [drawerError, setDrawerError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const period = search.get('period');
    setFilters({ period: period === 'week' || period === 'month' || period === 'quarter' || period === 'year' || period === 'custom' ? period : 'month',
      from: search.get('from') ?? '', to: search.get('to') ?? '', doctorId: search.get('doctorId') ?? '',
      procedureId: search.get('procedureId') ?? '', planStatus: search.get('planStatus') ?? '' });
    setReady(true);
  }, []);

  const search = useMemo(() => params(filters).toString(), [filters]);
  useEffect(() => {
    if (!ready) return;
    window.history.replaceState(null, '', `${window.location.pathname}?${search}`);
  }, [ready, search]);
  useEffect(() => {
    if (!ready) return;
    void request<Options>('/api/admin/reports/treatment?view=options').then(setOptions).catch(() => setError('Không thể tải danh sách bác sĩ và thủ thuật.'));
  }, [ready, reload]);
  useEffect(() => {
    if (!ready) return;
    let current = true;
    setLoading(true); setError('');
    const base = `/api/admin/reports/treatment?${search}`;
    void Promise.all([request<Summary>(`${base}&view=summary`), request<Page<PlanRow>>(`${base}&view=plans&page=${planPage}`)])
      .then(([nextSummary, nextPlans]) => { if (current) { setSummary(nextSummary); setPlans(nextPlans); } })
      .catch((caught: unknown) => { if (current) { setSummary(null); setPlans(null); setError(caught instanceof Error ? caught.message : 'Không thể tải báo cáo điều trị.'); } })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [ready, search, planPage, reload]);

  const loadDrawer = useCallback(async (choice: Drawer, page: number) => {
    setDrawerLoading(true); setDrawerError('');
    const query = params(filters);
    query.set('view', choice.kind); query.set('page', String(page));
    if (choice.group) query.set('group', choice.group);
    if (choice.planId) query.set('planId', choice.planId);
    if (choice.planStatus) query.set('planStatus', choice.planStatus);
    try {
      if (choice.kind === 'plans') { setDrawerPlans(await request<Page<PlanRow>>(`/api/admin/reports/treatment?${query}`)); setDrawerSessions(null); }
      else { setDrawerSessions(await request<Page<SessionRow>>(`/api/admin/reports/treatment?${query}`)); setDrawerPlans(null); }
    } catch (caught) { setDrawerError(caught instanceof Error ? caught.message : 'Không thể tải danh sách chi tiết.'); }
    finally { setDrawerLoading(false); }
  }, [filters]);
  useEffect(() => { if (drawer) void loadDrawer(drawer, drawerPage); }, [drawer, drawerPage, loadDrawer]);
  useEffect(() => {
    if (!drawer) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setDrawer(null); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [drawer]);

  function change<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters((current) => ({ ...current, [key]: value })); setPlanPage(1); setDrawer(null);
  }
  function openDrawer(next: Drawer) { setDrawerPage(1); setDrawerPlans(null); setDrawerSessions(null); setDrawer(next); }
  async function exportCsv() {
    setExporting(true); setError('');
    try {
      const response = await fetch(`/api/admin/reports/treatment/csv?${search}`, { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) {
        const body = await response.json() as Api<unknown>;
        throw new Error(body.error ?? 'Không thể xuất CSV.');
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'bao-cao-dieu-tri.csv'; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Không thể xuất CSV.'); }
    finally { setExporting(false); }
  }

  const noData = summary?.plans.total === 0 && summary.sessions.total === 0;
  const maxTimeline = Math.max(1, ...(summary?.timeline.map((point) => Math.max(point.completed, point.cancelled)) ?? []));
  const statusRows = Object.entries(summary?.plans.statuses ?? {});
  const maxStatus = Math.max(1, ...statusRows.map(([, count]) => count));
  const detailPage = drawer?.kind === 'plans' ? drawerPlans : drawerSessions;

  return <main className="space-y-5">
    <header><span className="mb-2 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">⚙️ Phân hệ Quản trị & Báo cáo</span>
      <h1 className="text-2xl font-bold text-gray-900">Báo cáo điều trị</h1>
      <p className="mt-1 text-sm text-gray-500">Theo dõi số phác đồ, số buổi điều trị và tiến độ thực hiện từ dữ liệu hệ thống.</p></header>

    <section className={box}><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold text-gray-800">Bộ lọc báo cáo</h2><span className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{summary ? `${summary.period.from} – ${summary.period.to} · Asia/Ho_Chi_Minh · dữ liệu từ DB` : 'Dữ liệu từ DB'}</span></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <label className="text-xs font-semibold text-gray-600">Kỳ<select className={select} value={filters.period} onChange={(event) => change('period', event.target.value as Period)}><option value="week">Tuần</option><option value="month">Tháng</option><option value="quarter">Quý</option><option value="year">Năm</option><option value="custom">Tùy chọn</option></select></label>
        <label className="text-xs font-semibold text-gray-600">Bác sĩ lập phác đồ<select className={select} value={filters.doctorId} onChange={(event) => change('doctorId', event.target.value)}><option value="">Tất cả</option>{options?.doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}</select></label>
        <label className="text-xs font-semibold text-gray-600">Thủ thuật<select className={select} value={filters.procedureId} onChange={(event) => change('procedureId', event.target.value)}><option value="">Tất cả</option>{options?.procedures.map((procedure) => <option key={procedure.id} value={procedure.id}>{procedure.name}</option>)}</select></label>
        <label className="text-xs font-semibold text-gray-600">Trạng thái phác đồ<select className={select} value={filters.planStatus} onChange={(event) => change('planStatus', event.target.value)}><option value="">Tất cả</option>{Object.entries(PLAN_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <div className="flex items-end"><button type="button" disabled={exporting || loading} onClick={() => void exportCsv()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"><Download size={16} />{exporting ? 'Đang xuất…' : 'Xuất CSV'}</button></div>
      </div>
      {filters.period === 'custom' && <div className="mt-3 flex flex-wrap gap-3"><label className="text-xs font-semibold text-gray-600">Từ ngày<input type="date" className={select} value={filters.from} onChange={(event) => change('from', event.target.value)} /></label><label className="text-xs font-semibold text-gray-600">Đến ngày<input type="date" className={select} value={filters.to} onChange={(event) => change('to', event.target.value)} /></label></div>}
    </section>

    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error} <button type="button" onClick={() => setReload((value) => value + 1)} className="ml-2 font-semibold underline">Thử lại</button></div>}
    {loading && <div role="status" className="grid gap-4 sm:grid-cols-3"><div className="h-32 animate-pulse rounded-2xl bg-gray-200" /><div className="h-32 animate-pulse rounded-2xl bg-gray-200" /><div className="h-32 animate-pulse rounded-2xl bg-gray-200" /></div>}
    {!loading && noData && <div className={`${box} text-center text-sm text-gray-500`}>Chưa có dữ liệu điều trị trong kỳ đã chọn.</div>}
    {!loading && summary && !noData && <>
      <section className="grid gap-4 md:grid-cols-4" aria-label="Phác đồ điều trị">
        {([['Tổng phác đồ', summary.plans.total, 'all'], ['Đang điều trị', summary.plans.active, 'ACTIVE'], ['Hoàn thành', summary.plans.completed, 'COMPLETED'], ['Bản nháp', summary.plans.draft, 'DRAFT']] as const).map(([label, value, status], index) => <button key={label} type="button" disabled={value === 0} onClick={() => openDrawer({ kind: 'plans', title: label, ...(status === 'all' ? {} : { planStatus: status }) })} className={`${index === 0 ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white' : 'border border-gray-100 bg-white text-gray-800'} rounded-2xl p-5 text-left shadow-sm disabled:cursor-not-allowed disabled:opacity-60`}><span className="text-sm font-semibold">{label}</span><strong className="mt-2 block text-3xl">{value.toLocaleString('vi-VN')}</strong><span className="mt-2 block text-xs">{value ? 'Xem danh sách phác đồ →' : 'Không có phác đồ'}</span></button>)}
      </section>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Buổi điều trị">
        {([['Tổng buổi', summary.sessions.total, 'all'], ['Đã thực hiện', summary.sessions.completed, 'completed'], ['Sắp thực hiện', summary.sessions.upcoming, 'upcoming'], ['Đã hủy', summary.sessions.cancelled, 'cancelled'], ['Quá hẹn chưa hoàn tất', summary.sessions.overdue, 'overdue']] as const).map(([label, value, group]) => <button key={label} type="button" disabled={value === 0} onClick={() => openDrawer({ kind: 'sessions', title: label, ...(group === 'all' ? {} : { group }) })} className={`${box} text-left hover:border-amber-300 disabled:cursor-not-allowed disabled:opacity-60`}><span className="text-sm text-gray-500">{label}</span><strong className="mt-2 block text-2xl text-gray-800">{value.toLocaleString('vi-VN')}</strong><small className="mt-1 block text-amber-700">{value ? 'Xem chi tiết →' : 'Không có buổi'}</small></button>)}
      </section>
      <section className={box}><h2 className="font-bold text-gray-800">Tiến độ chung</h2><div className="mt-3 max-w-xl"><ProgressBar value={summary.progress.percent} completed={summary.progress.completed} total={summary.progress.total} /></div></section>
      <div className="grid gap-4 xl:grid-cols-2">
        <section className={box}><h2 className="font-bold text-gray-800">Số buổi điều trị theo thời gian</h2><p className="mt-1 text-xs text-gray-500">Cột xanh: hoàn thành · cột cam: hủy · nhóm theo {summary.period.grain === 'day' ? 'ngày' : summary.period.grain === 'week' ? 'tuần' : 'tháng'}</p>
          {summary.timeline.length ? <div className="mt-5 overflow-x-auto"><p className="mb-1 text-xs text-gray-500">Trục dọc: 0–{maxTimeline} buổi</p><div className="flex h-52 min-w-max items-end gap-2 border-b border-gray-200 pb-6">{summary.timeline.map((point) => <div key={point.bucket} className="relative flex w-16 shrink-0 items-end justify-center gap-1" title={`${point.bucket}: ${point.completed} hoàn thành, ${point.cancelled} hủy`}><div className="w-5 rounded-t bg-blue-500" style={{ height: `${point.completed ? Math.max(2, point.completed / maxTimeline * 160) : 0}px` }} /><div className="w-5 rounded-t bg-amber-500" style={{ height: `${point.cancelled ? Math.max(2, point.cancelled / maxTimeline * 160) : 0}px` }} /><span className="absolute -bottom-5 text-[10px] text-gray-500">{point.bucket.slice(5)}</span></div>)}</div></div> : <p className="mt-5 text-sm text-gray-500">Chưa có buổi hoàn thành hoặc hủy trong kỳ.</p>}
        </section>
        <section className={box}><h2 className="font-bold text-gray-800">Phác đồ theo trạng thái</h2>{statusRows.length ? <div className="mt-5 space-y-3">{statusRows.map(([status, count]) => <div key={status}><div className="flex justify-between text-sm"><span>{statusText(status)}</span><b>{count}</b></div><div className="mt-1 h-5 rounded bg-gray-100"><div title={`${statusText(status)}: ${count}`} className="h-full rounded bg-blue-500" style={{ width: `${count / maxStatus * 100}%` }} /></div></div>)}</div> : <p className="mt-5 text-sm text-gray-500">Chưa có phác đồ trong kỳ.</p>}</section>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <section className={`${box} flex h-[420px] min-h-0 flex-col overflow-hidden`}><h2 className="mb-3 shrink-0 font-bold text-gray-800">Theo bác sĩ lập phác đồ</h2><div className="min-h-0 flex-1 overflow-auto"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-gray-50 text-gray-600"><tr><th className="p-2">Bác sĩ</th><th>Phác đồ</th><th>Buổi xong / hủy</th><th>Tiến độ</th></tr></thead><tbody>{summary.doctors.map((doctor) => <tr key={doctor.id} className="border-t"><td className="p-2">{doctor.name}</td><td>{doctor.plans}</td><td>{doctor.completed} / {doctor.cancelled}</td><td><ProgressBar value={doctor.progress.percent} completed={doctor.progress.completed} total={doctor.progress.total} /></td></tr>)}</tbody></table>{!summary.doctors.length && <p className="p-4 text-sm text-gray-500">Chưa có dữ liệu.</p>}</div></section>
        <section className={`${box} flex h-[420px] min-h-0 flex-col overflow-hidden`}><h2 className="mb-3 shrink-0 font-bold text-gray-800">Theo thủ thuật</h2><div className="min-h-0 flex-1 overflow-auto"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-gray-50 text-gray-600"><tr><th className="p-2">Thủ thuật</th><th>Phác đồ</th><th>Buổi hoàn thành</th><th>Tiến độ</th></tr></thead><tbody>{summary.procedures.map((item) => <tr key={item.id} className="border-t"><td className="p-2">{item.name}</td><td>{item.plans}</td><td>{item.sessions}</td><td><ProgressBar value={item.progress.percent} completed={item.progress.completed} total={item.progress.total} /></td></tr>)}</tbody></table>{!summary.procedures.length && <p className="p-4 text-sm text-gray-500">Chưa có thủ thuật gắn với bước điều trị.</p>}</div></section>
      </div>
      <section className={`${box} flex h-[420px] min-h-0 flex-col overflow-hidden`}><h2 className="mb-3 shrink-0 font-bold text-gray-800">Danh sách phác đồ</h2><div className="min-h-0 flex-1 overflow-auto"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-gray-50 text-gray-600"><tr><th className="p-2">Phác đồ / bệnh nhân</th><th>Bác sĩ</th><th>Thủ thuật</th><th>Trạng thái</th><th>Tiến độ</th><th>Buổi tiếp theo</th><th>Quá hẹn</th></tr></thead><tbody>{plans?.items.map((item) => <tr key={item.id} className="cursor-pointer border-t hover:bg-amber-50" onClick={() => openDrawer({ kind: 'sessions', title: `Các buổi của ${item.planName}`, planId: item.id })} onKeyDown={(event) => { if (event.key === 'Enter') openDrawer({ kind: 'sessions', title: `Các buổi của ${item.planName}`, planId: item.id }); }} tabIndex={0}><td className="p-2"><b>{item.planName}</b><small className="block text-gray-500">{item.id} · {item.patientName} · {item.patientCode}</small></td><td>{item.doctorName}</td><td>{item.procedures ?? 'Chưa gắn'}</td><td><span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-800">{statusText(item.status)}</span></td><td><ProgressBar value={item.progress.percent} completed={item.progress.completed} total={item.progress.total} /></td><td>{dateText(item.nextSession)}</td><td>{item.overdueSessions}</td></tr>)}</tbody></table>{plans?.items.length === 0 && <p className="p-5 text-sm text-gray-500">Chưa có phác đồ trong kỳ.</p>}</div>
        <div className="mt-3 flex shrink-0 items-center justify-between border-t pt-3 text-xs text-gray-500"><span>{plans?.total ?? 0} phác đồ · Trang {planPage}</span><div className="flex gap-2"><button type="button" aria-label="Trang trước" disabled={planPage <= 1} onClick={() => setPlanPage((page) => page - 1)}><ChevronLeft size={18} /></button><button type="button" aria-label="Trang sau" disabled={!plans || planPage * 20 >= plans.total} onClick={() => setPlanPage((page) => page + 1)}><ChevronRight size={18} /></button></div></div></section>
    </>}
    <details className={box}><summary className="cursor-pointer font-bold text-gray-800">Cách tính số liệu</summary><div className="mt-3 space-y-2 text-sm text-gray-600"><p>Phác đồ được tính theo ngày bắt đầu, nếu chưa có thì theo ngày tạo. Bác sĩ trong bộ lọc là người lập phác đồ. Thủ thuật lấy từ bước điều trị; dịch vụ khám không gắn trực tiếp với phác đồ.</p><p>Mỗi bước đóng góp số buổi kế hoạch bằng repeatCount. Buổi hoàn thành gắn bước được giới hạn bởi số lần lặp; buổi không gắn bước được cộng nhưng tổng không vượt mẫu số. Phác đồ không có bước hiện “Chưa xác định” và không tham gia tiến độ chung.</p><p>Buổi hoàn thành tính theo completedAt, nếu thiếu thì startedAt; các nhóm còn lại tính theo scheduledAt. Buổi thiếu mốc ngày phù hợp không nằm trong kỳ. “Sắp thực hiện” và “Quá hẹn” dựa trên thời điểm hiện tại theo giờ Việt Nam. Trạng thái hủy/tạm dừng chỉ có số liệu khi hệ thống ghi nhận trạng thái tương ứng.</p><p>Tiến độ chung là tổng buổi hoàn thành hợp lệ chia tổng số buổi kế hoạch của các phác đồ có mẫu số. Biểu đồ nhóm theo ngày, tuần hoặc tháng tùy độ dài kỳ.</p></div></details>
    {drawer && <div className="fixed inset-0 z-50 flex justify-end bg-black/40" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDrawer(null); }}><aside role="dialog" aria-modal="true" aria-label={drawer.title} className="h-full w-full max-w-2xl overflow-y-auto bg-white p-5 shadow-xl"><div className="flex items-center justify-between"><h2 className="text-lg font-bold text-gray-800">{drawer.title}</h2><button type="button" aria-label="Đóng chi tiết" onClick={() => setDrawer(null)}><X size={20} /></button></div>
      {drawerLoading && <p role="status" className="mt-5 text-sm text-gray-500">Đang tải chi tiết…</p>}{drawerError && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-800">{drawerError} <button type="button" onClick={() => void loadDrawer(drawer, drawerPage)} className="underline">Thử lại</button></p>}
      {!drawerLoading && !drawerError && <div className="mt-5 space-y-3">{drawer.kind === 'plans' ? drawerPlans?.items.map((item) => <button type="button" key={item.id} onClick={() => openDrawer({ kind: 'sessions', title: `Các buổi của ${item.planName}`, planId: item.id })} className="w-full rounded-xl border border-gray-200 p-3 text-left text-sm"><b>{item.planName}</b><span className="ml-2 text-gray-500">{item.patientCode}</span><p className="mt-1 text-gray-500">{statusText(item.status)} · {item.doctorName}</p><ProgressBar value={item.progress.percent} completed={item.progress.completed} total={item.progress.total} /></button>) : drawerSessions?.items.map((item) => <article key={item.id} className="rounded-xl border border-gray-200 p-3 text-sm"><b>Buổi {item.sessionNo} · {item.planName}</b><span className="ml-2 text-gray-500">{item.patientCode}</span><p className="mt-1">{SESSION_STATUS_LABELS[item.status] ?? item.status} · {item.procedure ?? 'Chưa gắn thủ thuật'}</p><p className="text-gray-500">Hẹn: {dateText(item.scheduledAt)} · Hoàn tất: {dateText(item.completedAt)} · Thực hiện: {item.doctorName ?? 'Chưa phân công'}</p></article>)}
        {detailPage?.items.length === 0 && <p className="text-sm text-gray-500">Không có dữ liệu chi tiết phù hợp.</p>}
        <div className="flex justify-between border-t pt-3 text-xs text-gray-500"><span>{detailPage?.total ?? 0} dòng · Trang {drawerPage}</span><div className="flex gap-3"><button type="button" aria-label="Trang chi tiết trước" disabled={drawerPage <= 1 || drawerLoading} onClick={() => setDrawerPage((page) => page - 1)}><ChevronLeft size={18} /></button><button type="button" aria-label="Trang chi tiết sau" disabled={!detailPage || drawerPage * 20 >= detailPage.total || drawerLoading} onClick={() => setDrawerPage((page) => page + 1)}><ChevronRight size={18} /></button></div></div>
      </div>}
    </aside></div>}
  </main>;
}
