'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BookOpenCheck, ChevronLeft, ChevronRight, Clock3, RefreshCw, Search } from 'lucide-react';
import { getTreatmentProtocolTemplates } from '../actions';

type ProtocolTemplate = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  indication: string | null;
  contraindication: string | null;
  version: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { fullName: string };
  stages: Array<{
    id: string;
    stageType: string;
    name: string;
    orderNo: number;
    goal: string | null;
    durationDays: number | null;
    notes: string | null;
    steps: Array<{
      id: string;
      orderNo: number;
      instruction: string;
      repeatCount: number;
      intervalDays: number | null;
      plannedDurationMinutes: number | null;
      procedure: { code: string; name: string; category: string } | null;
    }>;
  }>;
};

type LibraryData = {
  items: ProtocolTemplate[];
  total: number;
  page: number;
  pageSize: number;
  statuses: string[];
  stageTypes: string[];
};

type Filters = { q: string; status: string; stageType: string };

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Chưa có dữ liệu' : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(date);
}

export function ProtocolTemplateLibraryPanel({
  initialData,
  initialError = '',
}: {
  initialData: LibraryData | null;
  initialError?: string;
}) {
  const [data, setData] = useState(initialData);
  const [filters, setFilters] = useState<Filters>({ q: '', status: '', stageType: '' });
  const [selectedId, setSelectedId] = useState(initialData?.items[0]?.id ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const selected = data?.items.find((item) => item.id === selectedId) ?? data?.items[0] ?? null;
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.pageSize ?? 12)));

  async function load(page = 1, event?: React.FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await getTreatmentProtocolTemplates({ ...filters, page });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setData(result.data as LibraryData);
      setSelectedId((current) => result.data.items.some((item: ProtocolTemplate) => item.id === current)
        ? current
        : result.data.items[0]?.id ?? '');
    } catch {
      setError('Không thể tải thư viện phác đồ chuẩn.');
    } finally {
      setLoading(false);
    }
  }

  if (!data) {
    return <section role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
      <p className="font-semibold">{error || 'Không thể tải thư viện trong phạm vi quyền hiện tại.'}</p>
      <p className="mt-1">Cần session hợp lệ cùng EMR_READ và TREATMENT_READ được cấp trên cùng một vai trò.</p>
      <button type="button" onClick={() => void load()} disabled={loading} className="mt-3 rounded-lg border border-amber-300 px-3 py-2 font-semibold disabled:opacity-60">{loading ? 'Đang tải…' : 'Thử lại'}</button>
    </section>;
  }

  return (
    <div className="space-y-5">
      <form onSubmit={(event) => void load(1, event)} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(14rem,1fr)_12rem_12rem_auto_auto] md:items-end">
        <label className="text-sm font-medium text-slate-700">Tìm theo mã, tên hoặc nội dung
          <span className="relative mt-1 block"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={filters.q} onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} maxLength={100} placeholder="Nhập từ khóa" className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm" /></span>
        </label>
        <label className="text-sm font-medium text-slate-700">Trạng thái dữ liệu
          <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">Tất cả</option>{data.statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>
        </label>
        <label className="text-sm font-medium text-slate-700">Loại giai đoạn
          <select value={filters.stageType} onChange={(event) => setFilters((current) => ({ ...current, stageType: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">Tất cả</option>{data.stageTypes.map((stageType) => <option key={stageType} value={stageType}>{stageType}</option>)}</select>
        </label>
        <button type="submit" disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"><Search size={16} /> Lọc</button>
        <button type="button" onClick={() => void load(data.page)} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"><RefreshCw size={16} /> Làm mới</button>
      </form>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {loading && <p role="status" className="text-sm text-slate-500">Đang tải phác đồ…</p>}

      {!data.items.length ? (
        <section className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><BookOpenCheck className="mx-auto text-slate-400" /><h2 className="mt-3 font-semibold text-slate-800">{data.total ? 'Không có phác đồ phù hợp bộ lọc.' : 'Chưa có phác đồ chuẩn trong dữ liệu được phép xem.'}</h2><p className="mt-1 text-sm text-slate-500">Thư viện chỉ hiển thị dữ liệu đã lưu; không tự tạo hướng dẫn điều trị.</p></section>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(18rem,0.78fr)_minmax(0,1.7fr)]">
          <section aria-label="Danh sách phác đồ chuẩn" className="space-y-2">
            {data.items.map((item) => <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} aria-pressed={selected?.id === item.id} className={`w-full rounded-xl border p-4 text-left shadow-sm ${selected?.id === item.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'}`}>
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold text-slate-900">{item.name}</p><p className="mt-1 text-xs text-slate-500">{item.code} · phiên bản {item.version}</p></div><span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">{item.status}</span></div>
              <p className="mt-3 line-clamp-2 text-sm text-slate-600">{item.description || 'Chưa có mô tả trong dữ liệu.'}</p>
              <p className="mt-2 text-xs text-slate-500">{item.stages.length} giai đoạn · {item.stages.reduce((sum, stage) => sum + stage.steps.length, 0)} bước</p>
            </button>)}
          </section>

          {selected && <article className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-100 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800"><BookOpenCheck size={14} /> Thư viện phác đồ chuẩn</span><h2 className="mt-2 text-xl font-bold text-slate-900">{selected.name}</h2><p className="mt-1 text-sm text-slate-500">Mã {selected.code} · phiên bản {selected.version} · trạng thái {selected.status}</p></div><span className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">Cập nhật {dateLabel(selected.updatedAt)}</span></div>
            </header>
            <div className="space-y-5 p-5">
              {selected.description && <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{selected.description}</p>}
              <div className="grid gap-3 md:grid-cols-2"><Info title="Chỉ định lưu trong dữ liệu" value={selected.indication} /><Info title="Chống chỉ định lưu trong dữ liệu" value={selected.contraindication} /></div>
              <section className="rounded-lg border border-slate-200 p-4"><div className="mb-3 flex items-center justify-between gap-2"><div><h3 className="font-semibold text-slate-900">Giai đoạn và bước</h3><p className="mt-1 text-xs text-slate-500">Nội dung hiển thị nguyên trạng từ mẫu phác đồ.</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">{selected.stages.length} giai đoạn</span></div>
                {!selected.stages.length ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Chưa có giai đoạn trong dữ liệu.</p> : <div className="space-y-3">{selected.stages.map((stage) => <section key={stage.id} className="rounded-lg border border-slate-200"><header className="border-b border-slate-100 bg-slate-50 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="font-semibold text-slate-800">{stage.orderNo}. {stage.name}</h4><p className="mt-0.5 text-xs text-slate-500">Loại giai đoạn: {stage.stageType}</p></div>{stage.durationDays !== null && <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs text-slate-600"><Clock3 size={13} /> {stage.durationDays} ngày</span>}</div>{stage.goal && <p className="mt-2 text-sm text-slate-600">{stage.goal}</p>}{stage.notes && <p className="mt-1 whitespace-pre-wrap text-xs text-slate-500">{stage.notes}</p>}</header>
                  {!stage.steps.length ? <p className="p-3 text-xs text-slate-500">Chưa có bước trong giai đoạn này.</p> : <ol className="divide-y divide-slate-100">{stage.steps.map((step) => <li key={step.id} className="p-3"><div className="flex flex-wrap items-start justify-between gap-2"><p className="text-sm font-medium text-slate-800">{step.orderNo}. {step.instruction}</p>{step.procedure && <span className="rounded-full bg-violet-50 px-2 py-1 text-xs text-violet-800">{step.procedure.code} · {step.procedure.name}</span>}</div><p className="mt-2 text-xs text-slate-500">Lặp lại: {step.repeatCount}{step.intervalDays !== null ? ` · Khoảng cách: ${step.intervalDays} ngày` : ''}{step.plannedDurationMinutes !== null ? ` · Thời lượng: ${step.plannedDurationMinutes} phút` : ''}</p></li>)}</ol>}
                </section>)}</div>}
              </section>
              <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">Schema không có trường xác định số buổi dự kiến; số lần lặp của bước không được diễn giải thành số buổi điều trị.</p>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><p className="text-xs text-slate-500">Tạo bởi {selected.createdBy.fullName} · Tạo {dateLabel(selected.createdAt)}</p><div className="flex gap-2"><Link href="/bacsi/treatments" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-blue-700">Phác đồ bệnh nhân</Link><button type="button" disabled title="Quyền ghi và quy trình áp dụng mẫu vào hồ sơ chưa được xác minh." className="cursor-not-allowed rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-500">Áp dụng vào bệnh nhân (đang khóa)</button></div></div>
            </div>
          </article>}
        </div>
      )}

      {data.total > data.pageSize && <nav aria-label="Phân trang thư viện phác đồ" className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><span>Trang {data.page}/{pageCount} · {data.total} phác đồ</span><div className="flex gap-2"><button type="button" onClick={() => void load(Math.max(1, data.page - 1))} disabled={loading || data.page <= 1} className="inline-flex items-center gap-1 rounded border border-slate-300 px-3 py-1 disabled:opacity-50"><ChevronLeft size={15} /> Trước</button><button type="button" onClick={() => void load(Math.min(pageCount, data.page + 1))} disabled={loading || data.page >= pageCount} className="inline-flex items-center gap-1 rounded border border-slate-300 px-3 py-1 disabled:opacity-50">Sau <ChevronRight size={15} /></button></div></nav>}
    </div>
  );
}

function Info({ title, value }: { title: string; value: string | null }) {
  return <section className="rounded-lg border border-slate-200 p-3"><h3 className="text-xs font-semibold text-slate-500">{title}</h3><p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-slate-700">{value || 'Chưa có dữ liệu.'}</p></section>;
}
