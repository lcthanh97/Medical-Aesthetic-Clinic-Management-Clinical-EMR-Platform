'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ClipboardCheck, FileText, Loader2, RefreshCw, Search } from 'lucide-react';
import { getDoctorTreatmentConsents } from '../actions';

type ConsentRow = {
  id: string;
  visitId: string;
  treatmentPlanId: string | null;
  planVersion: number | null;
  signerName: string;
  signedAt: string;
  createdAt: string;
  template: { id: string; name: string; version: number; content: string };
  visit: { id: string; visitDate: string; patientId: string; patient: { id: string; patientCode: string; fullName: string } };
  plan: { id: string; name: string; visitId: string; patientId: string } | null;
  patient: { id: string; fullName: string } | null;
  employee: { fullName: string } | null;
};
type ConsentPageData = {
  items: ConsentRow[];
  total: number;
  page: number;
  pageSize: number;
  capped: boolean;
  options: {
    patients: Array<{ id: string; patientCode: string; fullName: string }>;
    plans: Array<{ id: string; name: string }>;
    templates: Array<{ id: string; name: string; version: number }>;
  };
};
type Filters = { q: string; patientId: string; visitId: string; planId: string; templateId: string; from: string; to: string };

function dateLabel(value: string | null | undefined) {
  if (!value) return 'Chưa có dữ liệu';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Chưa có dữ liệu' : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function ConsentsPanel({
  initialData,
  initialError = '',
  initialVisitId = '',
}: {
  initialData?: ConsentPageData | null;
  initialError?: string;
  initialVisitId?: string;
}) {
  const [data, setData] = useState<ConsentPageData | null>(initialData ?? null);
  const [filters, setFilters] = useState<Filters>({ q: '', patientId: '', visitId: initialVisitId, planId: '', templateId: '', from: '', to: '' });
  const [selectedId, setSelectedId] = useState(initialData?.items[0]?.id ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const selected = data?.items.find((item) => item.id === selectedId) ?? data?.items[0] ?? null;
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.pageSize ?? 25)));

  async function load(page = 1, event?: React.FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setError('');
    const result = await getDoctorTreatmentConsents({ ...filters, page });
    if (!result.success) {
      setData(null);
      setError(result.error || 'Không thể tải cam kết.');
    } else {
      setData(result.data as ConsentPageData);
      setSelectedId((current) => result.data.items.some((item: ConsentRow) => item.id === current) ? current : result.data.items[0]?.id ?? '');
    }
    setLoading(false);
  }

  if (!initialData && !loading) {
    return <section role={initialError ? 'alert' : undefined} className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
      <p className="font-semibold">{initialError || 'Chưa có dữ liệu cam kết để hiển thị.'}</p>
      <p className="mt-1">Màn hình chỉ đọc cam kết thuộc Visit được phân công và yêu cầu phiên hợp lệ cùng quyền EMR_READ.</p>
      {!initialError && <button type="button" onClick={() => void load()} className="mt-3 rounded-lg border border-amber-300 px-3 py-2 font-semibold">Thử tải lại</button>}
    </section>;
  }

  return (
    <div className="space-y-5">
      <form onSubmit={(event) => void load(1, event)} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3 xl:grid-cols-6 xl:items-end">
        <label className="text-sm font-medium text-slate-700 xl:col-span-2">Tìm bệnh nhân, mã bệnh nhân, phác đồ hoặc người ký
          <span className="relative mt-1 block"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={filters.q} onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} maxLength={100} placeholder="Nhập từ khóa" className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm" /></span>
        </label>
        <label className="text-sm font-medium text-slate-700">Bệnh nhân
          <select value={filters.patientId} onChange={(event) => setFilters((current) => ({ ...current, patientId: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">Tất cả bệnh nhân</option>{data?.options.patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.fullName} · {patient.patientCode}</option>)}</select>
        </label>
        <label className="text-sm font-medium text-slate-700">Phác đồ
          <select value={filters.planId} onChange={(event) => setFilters((current) => ({ ...current, planId: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">Tất cả phác đồ</option>{data?.options.plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select>
        </label>
        <label className="text-sm font-medium text-slate-700">Loại cam kết
          <select value={filters.templateId} onChange={(event) => setFilters((current) => ({ ...current, templateId: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">Tất cả mẫu</option>{data?.options.templates.map((template) => <option key={template.id} value={template.id}>{template.name} · v{template.version}</option>)}</select>
        </label>
        <div className="grid grid-cols-2 gap-2 md:col-span-2 xl:col-span-6 xl:grid-cols-[1fr_1fr_auto_auto]">
          <label className="text-xs font-semibold text-slate-600">Từ ngày ký<input type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" /></label>
          <label className="text-xs font-semibold text-slate-600">Đến ngày ký<input type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" /></label>
          <button type="submit" disabled={loading} className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Lọc</button>
          <button type="button" onClick={() => void load(data?.page ?? 1)} disabled={loading} className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"><RefreshCw size={16} /> Làm mới</button>
        </div>
      </form>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {loading && <p role="status" className="text-sm text-slate-500">Đang tải cam kết…</p>}
      {!data?.items.length ? (
        <section className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><ClipboardCheck className="mx-auto text-slate-400" /><h2 className="mt-3 font-semibold text-slate-800">{data?.total ? 'Không có cam kết phù hợp bộ lọc.' : 'Chưa có cam kết trong các Visit được phân công.'}</h2><p className="mt-1 text-sm text-slate-500">Không tự tạo hoặc thay đổi trạng thái cam kết.</p></section>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.7fr)]">
          <section aria-label="Danh sách cam kết" className="space-y-2">
            {data.items.map((item) => <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} aria-pressed={selected?.id === item.id} className={`w-full rounded-xl border p-4 text-left shadow-sm ${selected?.id === item.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'}`}>
              <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{item.visit.patient.fullName}</p><p className="mt-0.5 text-xs text-slate-500">{item.visit.patient.patientCode} · {item.template.name}</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">Đã ghi nhận ký</span></div>
              <p className="mt-3 text-sm text-slate-700">{item.plan?.name ?? 'Không liên kết phác đồ'}</p><p className="mt-1 text-xs text-slate-500">{dateLabel(item.signedAt)} · Người ký: {item.signerName}</p>
            </button>)}
          </section>

          {selected && <article className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-start sm:justify-between"><div><span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800"><ClipboardCheck size={14} /> Cam kết điều trị</span><h2 className="mt-2 text-xl font-bold text-slate-900">{selected.template.name}</h2><p className="mt-1 text-sm text-slate-500">{selected.visit.patient.fullName} · {selected.visit.patient.patientCode}</p></div><span className="w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800">Đã ghi nhận ký</span></header>
            <div className="space-y-5 p-5">
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><div><dt className="text-xs text-slate-500">Phiên bản mẫu</dt><dd className="mt-1 text-sm font-medium text-slate-800">v{selected.template.version}</dd></div><div><dt className="text-xs text-slate-500">Phiên bản phác đồ lúc ghi</dt><dd className="mt-1 text-sm font-medium text-slate-800">{selected.planVersion ?? 'Không ghi nhận'}</dd></div><div><dt className="text-xs text-slate-500">Visit</dt><dd className="mt-1 break-all text-sm font-medium text-slate-800">{selected.visitId}</dd></div><div><dt className="text-xs text-slate-500">Ngày ký đã lưu</dt><dd className="mt-1 text-sm font-medium text-slate-800">{dateLabel(selected.signedAt)}</dd></div><div><dt className="text-xs text-slate-500">Người ký theo dữ liệu lưu</dt><dd className="mt-1 text-sm font-medium text-slate-800">{selected.signerName}</dd></div><div><dt className="text-xs text-slate-500">Nhân viên ghi nhận</dt><dd className="mt-1 text-sm font-medium text-slate-800">{selected.employee?.fullName ?? 'Chưa ghi nhân viên'}</dd></div><div className="sm:col-span-2 lg:col-span-3"><dt className="text-xs text-slate-500">Phác đồ liên kết</dt><dd className="mt-1 text-sm font-medium text-slate-800">{selected.plan?.name ?? 'Không liên kết phác đồ'}</dd></div></dl>
              <section className="rounded-lg border border-slate-200 p-4"><div className="flex items-center gap-2"><FileText size={17} className="text-blue-700" /><h3 className="font-semibold text-slate-900">Nội dung mẫu hiện tại · phiên bản {selected.template.version}</h3></div><p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">Database không lưu bản snapshot nội dung tại thời điểm ký. Nội dung dưới đây là mẫu hiện hành, không thể xác nhận là bản đã ký.</p><div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{selected.template.content || 'Mẫu hiện không có nội dung.'}</div></section>
              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4"><Link href={`/bacsi/emr?patientId=${encodeURIComponent(selected.visit.patient.id)}`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-blue-700">Hồ sơ bệnh nhân</Link>{selected.plan && <Link href={`/bacsi/treatments?visitId=${encodeURIComponent(selected.visitId)}`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-blue-700">Phác đồ điều trị</Link>}<Link href={`/bacsi/treatment-sessions?visitId=${encodeURIComponent(selected.visitId)}`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-blue-700">Buổi điều trị</Link><button type="button" disabled title="Schema không có trạng thái/workflow ký để thay đổi; không tạo chữ ký hoặc xác nhận đồng ý tại giao diện." className="cursor-not-allowed rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-500">Gửi ký / xác nhận / hủy (đang khóa)</button><button type="button" disabled title="Quyền đọc file và storage tài liệu riêng tư chưa được xác minh." className="cursor-not-allowed rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-500">Mở tài liệu (đang khóa)</button></div>
            </div>
          </article>}
        </div>
      )}

      {data && data.total > data.pageSize && <nav aria-label="Phân trang cam kết" className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><span>Trang {data.page}/{pageCount} · {data.total} bản ghi{data.capped ? ' (trong giới hạn 500 bản ghi mới nhất)' : ''}</span><div className="flex gap-2"><button type="button" onClick={() => void load(Math.max(1, data.page - 1))} disabled={loading || data.page <= 1} className="rounded border border-slate-300 px-3 py-1 disabled:opacity-50">Trước</button><button type="button" onClick={() => void load(Math.min(pageCount, data.page + 1))} disabled={loading || data.page >= pageCount} className="rounded border border-slate-300 px-3 py-1 disabled:opacity-50">Sau</button></div></nav>}
    </div>
  );
}
