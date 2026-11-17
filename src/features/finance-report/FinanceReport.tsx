'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { FinanceCharts } from './Charts';
import { Aging, InvoiceTable, PageControls, PaymentsTable, ServicesTable } from './Tables';
import { action, control, dayLabel, money, panel, secondaryAction } from './presentation';
import { methodLabels, type DetailKind } from './rules';
import type { InvoiceRow, PaymentRow, RecordPage, ServiceRow, Summary } from './service';

const API = '/api/admin/finance-report';
const metrics: Array<{ key: DetailKind; label: string }> = [
  { key: 'revenue', label: 'Doanh thu' }, { key: 'paid', label: 'Đã thu' },
  { key: 'debt', label: 'Chưa thu' }, { key: 'refund', label: 'Hoàn tiền' },
  { key: 'unallocated', label: 'Chưa phân bổ' },
];

function reportUrl(view: string, query: string, extra: Record<string, string> = {}) {
  const params = new URLSearchParams(query);
  Object.entries(extra).forEach(([key, value]) => params.set(key, value));
  return `${API}/${view}?${params}`;
}

function useReport<T>(url: string | null) {
  const [result, setResult] = useState<{ url: string; data?: T; error?: string }>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(25_000)]);
    fetch(url, { cache: 'no-store', signal })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok || !data) throw new Error(data?.error || 'Không tải được số liệu.');
        if (!controller.signal.aborted) setResult({ url, data });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setResult({ url, error: signal.aborted ? 'Máy chủ phản hồi quá lâu.' : error instanceof Error ? error.message : 'Không tải được số liệu.' });
        }
      });
    return () => controller.abort();
  }, [url, attempt]);
  const current = url && result?.url === url ? result : null;
  return { data: current?.data, error: current?.error, retry: () => { setResult(undefined); setAttempt((value) => value + 1); } };
}

function Loading() {
  return <div role="status" className="space-y-2 py-4">
    <span className="sr-only">Đang tải số liệu</span>
    <div className="h-5 w-1/2 animate-pulse rounded bg-gray-100" />
    <div className="h-5 w-3/4 animate-pulse rounded bg-gray-100" />
    <div className="h-5 w-2/3 animate-pulse rounded bg-gray-100" />
  </div>;
}

function LoadError({ message, retry }: { message: string; retry: () => void }) {
  return <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
    <p>{message}</p>
    <button type="button" onClick={retry} className={`mt-2 ${secondaryAction}`}>Thử lại</button>
  </div>;
}

function FilterOptions({ values, current }: { values: Array<{ id: string; name: string }>; current: string }) {
  return <>
    <option value="">Tất cả</option>
    {current && !values.some(({ id }) => id === current) && <option value={current}>{current}</option>}
    {values.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
  </>;
}

function FiltersForm({ query, summary, apply }: { query: string; summary?: Summary; apply: (query: string) => void }) {
  const original = new URLSearchParams(query);
  const [period, setPeriod] = useState(original.get('period') ?? 'month');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [table, setTable] = useState('invoices');
  const options = summary?.options;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const [key, value] of form) if (typeof value === 'string' && value) params.set(key, value);
    apply(params.toString());
  }

  async function download() {
    setExporting(true);
    setExportError('');
    try {
      const res = await fetch(reportUrl('csv', query, { table }), { cache: 'no-store', signal: AbortSignal.timeout(45_000) });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Không xuất được CSV.');
      const objectUrl = URL.createObjectURL(await res.blob());
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = table === 'invoices' ? 'doi-chieu-hoa-don.csv' : 'doanh-thu-theo-dich-vu.csv';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      setExportError(error instanceof Error && error.name !== 'TimeoutError' ? error.message : 'Chưa thể xuất CSV. Vui lòng thử lại.');
    } finally { setExporting(false); }
  }

  return <section className={panel} aria-label="Bộ lọc và xuất báo cáo">
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <label className="grid gap-1 text-xs font-semibold text-gray-700">Kỳ
        <select className={control} name="period" value={period} onChange={(event) => setPeriod(event.target.value)}>
          <option value="week">Tuần</option><option value="month">Tháng</option><option value="quarter">Quý</option><option value="year">Năm</option><option value="custom">Tùy chọn</option>
        </select>
      </label>
      {period === 'custom' && <>
        <label className="grid gap-1 text-xs font-semibold text-gray-700">Từ ngày
          <input type="date" className={control} name="from" required defaultValue={original.get('from') ?? summary?.period.from} />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-gray-700">Đến ngày
          <input type="date" className={control} name="to" required defaultValue={original.get('to') ?? summary?.period.to} />
        </label>
      </>}
      <label className="grid min-w-36 max-w-full gap-1 text-xs font-semibold text-gray-700">Cơ sở
        <select name="facility" className={control} defaultValue={original.get('facility') ?? ''}>
          <FilterOptions values={options?.facilities ?? []} current={original.get('facility') ?? ''} />
        </select>
      </label>
      <label className="grid min-w-36 max-w-full gap-1 text-xs font-semibold text-gray-700">Dịch vụ
        <select name="service" className={control} defaultValue={original.get('service') ?? ''}>
          <FilterOptions values={options?.services ?? []} current={original.get('service') ?? ''} />
        </select>
      </label>
      <label className="grid min-w-36 max-w-full gap-1 text-xs font-semibold text-gray-700">Phương thức thanh toán
        <select name="method" className={control} defaultValue={original.get('method') ?? ''}>
          <FilterOptions values={options?.methods.map((id) => ({ id, name: methodLabels[id] ?? id })) ?? []} current={original.get('method') ?? ''} />
        </select>
      </label>
      <button className={action} type="submit">Áp dụng</button>
    </form>
    <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-gray-100 pt-3">
      <label className="grid gap-1 text-xs font-semibold text-gray-700">Bảng xuất
        <select className={control} value={table} onChange={(event) => setTable(event.target.value)}>
          <option value="invoices">Đối chiếu hóa đơn</option><option value="services">Theo dịch vụ</option>
        </select>
      </label>
      <button type="button" className={secondaryAction} disabled={!summary || exporting} onClick={() => void download()}>{exporting ? 'Đang xuất…' : 'Xuất CSV'}</button>
      <span className="pb-1.5 text-xs text-gray-600">Theo bộ lọc đã áp dụng</span>
    </div>
    {exportError && <p role="alert" className="mt-2 text-sm text-rose-700">{exportError}</p>}
  </section>;
}

function Drawer({ metric, query, onClose }: { metric: DetailKind; query: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [page, setPage] = useState(1);
  const result = useReport<RecordPage<InvoiceRow | PaymentRow>>(reportUrl('detail', query, { metric, page: String(page) }));
  useEffect(() => { ref.current?.showModal(); }, []);
  const title = metrics.find(({ key }) => key === metric)?.label;
  return <dialog ref={ref} onClose={onClose} aria-labelledby="finance-detail-title"
    className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-full max-w-4xl overflow-y-auto bg-white p-5 shadow-xl backdrop:bg-slate-950/40 sm:p-6">
    <div className="mb-4 flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
      <h2 id="finance-detail-title" className="text-lg font-bold text-gray-900">Chi tiết {title?.toLowerCase()}</h2>
      <button type="button" className={secondaryAction} onClick={() => ref.current?.close()}>Đóng</button>
    </div>
    {result.error ? <LoadError message={result.error} retry={result.retry} /> : !result.data ? <Loading /> : <>
      {metric === 'debt' || metric === 'revenue'
        ? <InvoiceTable rows={result.data.rows as InvoiceRow[]} />
        : <PaymentsTable rows={result.data.rows as PaymentRow[]} metric={metric} />}
      <PageControls data={result.data} onPage={setPage} />
    </>}
  </dialog>;
}

function FormulaNotes() {
  return <details className={panel}>
    <summary className="cursor-pointer font-bold text-gray-900">Cách tính số liệu</summary>
    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-gray-700">
      <li><strong>Doanh thu.</strong> Tổng giá trị hóa đơn đã lập, chưa thanh toán, thanh toán một phần, đã thanh toán hoặc đã hoàn. Hóa đơn nháp và hủy bị loại. Dùng ngày lượt khám vì dữ liệu chưa có ngày lập hóa đơn. Theo dịch vụ, dùng tổng dòng đã trừ giảm giá. Phần lệch với tổng hóa đơn nằm ở nhóm chưa gắn dịch vụ. Hệ thống thiếu trường VAT riêng.</li>
      <li><strong>Đã thu và hoàn tiền.</strong> Tổng sổ thanh toán theo ngày thanh toán, trừ khoản ghi âm. Sổ này thiếu cột trạng thái giao dịch và bảng hoàn tiền. Bộ lọc phương thức áp dụng cho các chỉ số từ sổ thanh toán.</li>
      <li><strong>Chưa thu.</strong> Số dư hóa đơn của kỳ sau khi đối chiếu tiền đến thời điểm xem, kể cả khoản thu ngoài kỳ. Dùng phân bổ theo dòng nếu có, hoặc liên kết trực tiếp tới hóa đơn nếu giao dịch không có phân bổ. Phần tiền dương còn lại sau phân bổ hiển thị riêng. Mỗi hóa đơn có số dư tối thiểu bằng 0 đ.</li>
      <li><strong>Lọc theo dịch vụ.</strong> Khoản thu trực tiếp chỉ quy được về dịch vụ nếu toàn bộ hóa đơn thuộc duy nhất dịch vụ đó và tổng các dòng khớp tổng hóa đơn. Hóa đơn có khoản thu trực tiếp chưa quy được về dịch vụ được đánh dấu chưa đối chiếu và tách khỏi tổng nợ đã xác định.</li>
      <li><strong>Cơ sở và tuổi nợ.</strong> Cơ sở lấy theo phòng của lượt khám. Tuổi nợ tính từ ngày lượt khám. Hóa đơn thiếu ngày đến hạn nên chưa xác định được số ngày quá hạn.</li>
      <li><strong>Giá vốn vật tư.</strong> Khi có số liệu, kỳ tính theo ngày ghi nhận tiêu hao. Chênh lệch doanh thu − giá vốn vật tư chưa phải lợi nhuận ròng. Giá vốn và chênh lệch hiện chưa được tổng hợp trên trang này.</li>
      <li><strong>Cảnh báo kho.</strong> Ảnh chụp tồn hiện tại trên toàn kho. Đếm mặt hàng có tồn bằng hoặc dưới ngưỡng tối thiểu của chính mặt hàng đó.</li>
      <li><strong>Ranh giới kỳ.</strong> Tính theo Asia/Ho_Chi_Minh. Tuần bắt đầu thứ Hai. Ngày kết thúc được tính trọn ngày.</li>
    </ul>
    <p className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">Khác với “Tổng doanh thu” ở trang Báo cáo thống kê, vốn tính theo tiền đã thu.</p>
  </details>;
}

function ReportBody({ summary, query }: { summary: Summary; query: string }) {
  const { totals } = summary;
  const [invoicePage, setInvoicePage] = useState(1);
  const [servicePage, setServicePage] = useState(1);
  const [metric, setMetric] = useState<DetailKind | null>(null);
  const invoices = useReport<RecordPage<InvoiceRow>>(reportUrl('invoices', query, { page: String(invoicePage) }));
  const services = useReport<RecordPage<ServiceRow>>(servicePage === 1 ? null : reportUrl('services', query, { page: String(servicePage) }));
  const serviceData = servicePage === 1 ? summary.services : services.data;
  const notes: Partial<Record<DetailKind, string>> = {
    revenue: 'Theo ngày lượt khám', paid: 'Theo ngày thanh toán', debt: totals.unresolved ? `${totals.unresolved} hóa đơn chưa đối chiếu được theo dịch vụ` : 'Theo hóa đơn thuộc kỳ',
    refund: 'Khoản âm đã ghi vào sổ', unallocated: 'Tiền dương còn lại sau phân bổ',
  };
  return <>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {metrics.map(({ key, label }) => <button type="button" key={key} onClick={() => setMetric(key)} aria-haspopup="dialog"
        className={`rounded-2xl border p-5 text-left shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${key === 'revenue' ? 'border-blue-500 bg-gradient-to-br from-blue-500 to-indigo-600 text-white' : 'border-gray-100 bg-white text-gray-900 hover:border-blue-300'}`}>
        <span className="text-sm font-semibold">{label}</span>
        <strong className="my-1 block text-2xl">{money(totals[key])}</strong>
        <span className={`text-xs ${key === 'revenue' ? 'text-blue-50' : 'text-gray-600'}`}>{notes[key]}</span>
      </button>)}
      <section className={panel}>
        <h2 className="text-sm font-semibold">Cảnh báo tồn thấp</h2>
        <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm"><span><strong>{summary.lowStock.medicines}</strong> thuốc sắp hết</span><span><strong>{summary.lowStock.supplies}</strong> vật tư cảnh báo</span></p>
        <Link href="/admin/inventory" className="mt-3 inline-block text-sm font-semibold text-blue-700 underline">Xem chi tiết trong Kho</Link>
      </section>
    </div>
    {!totals.invoiceCount && !totals.paymentCount && <p role="status" className={panel}>Chưa có dữ liệu tài chính trong kỳ đã chọn.</p>}
    <FinanceCharts data={summary} />
    <section className={panel}>
      <h2 className="mb-3 font-bold text-gray-900">Đối chiếu hóa đơn - tiền đã thu</h2>
      <Aging data={summary.aging} />
      <p className="my-3 text-xs text-gray-600">Nhóm tuổi nợ tính từ ngày lượt khám. Dữ liệu hiện thiếu ngày đến hạn của hóa đơn.</p>
      {invoices.error ? <LoadError message={invoices.error} retry={invoices.retry} /> : !invoices.data ? <Loading /> : <>
        <InvoiceTable rows={invoices.data.rows} /><PageControls data={invoices.data} onPage={setInvoicePage} />
      </>}
    </section>
    <section className={panel}>
      <h2 className="mb-3 font-bold text-gray-900">Theo dịch vụ</h2>
      {services.error ? <LoadError message={services.error} retry={services.retry} /> : !serviceData ? <Loading /> : <>
        <ServicesTable rows={serviceData.rows} /><PageControls data={serviceData} onPage={setServicePage} />
      </>}
    </section>
    {metric && <Drawer key={metric} metric={metric} query={query} onClose={() => setMetric(null)} />}
  </>;
}

export function FinanceReport() {
  const router = useRouter();
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const result = useReport<Summary>(reportUrl('summary', query));
  const date = result.data?.period;
  let report: ReactNode = <div className={panel}><Loading /></div>;
  if (result.error) report = <LoadError message={result.error} retry={result.retry} />;
  if (result.data) report = <ReportBody key={`report:${query}`} summary={result.data} query={query} />;
  return <div className="space-y-4">
    <div className={`flex flex-wrap items-center justify-between gap-2 ${panel}`}>
      <h2 className="font-bold text-gray-800">Tổng quan tài chính</h2>
      <span className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
        Dữ liệu phòng khám{date ? ` · ${dayLabel(date.from)} đến ${dayLabel(date.to)}` : ''} · Giờ Việt Nam (UTC+7)
      </span>
    </div>
    <FiltersForm key={`filters:${query}`} query={query} summary={result.data} apply={(next) => router.push(`${pathname}?${next}`, { scroll: false })} />
    {report}
    <FormulaNotes />
  </div>;
}
