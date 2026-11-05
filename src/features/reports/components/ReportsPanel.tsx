'use client';

import { BarChart3, Download, LoaderCircle, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { ReportsSchema } from '../schemas/reports.schema';
import { reportsApi } from '../api/reportsApi';
import { useReports } from '../hooks/useReports';
import type { ReportsFilters } from '../types/reports.types';

function CountBars({ rows, label }: { rows: Array<{ date: string; count: number; appointmentCount?: number }>; label: string }) {
  const max = Math.max(1, ...rows.flatMap(({ count, appointmentCount }) => [count, appointmentCount ?? 0]));
  return <div className="overflow-x-auto rounded-lg border border-slate-200 p-4">
    <div className="flex min-w-max items-end gap-2" role="img" aria-label={label}>
      {rows.map((row) => <div key={row.date} className="flex w-12 flex-col items-center gap-1">
        <span className="text-[10px] text-slate-500">{row.count}</span>
        <div className="flex h-36 w-full items-end gap-0.5">
          <div title={`${row.date}: ${row.count} lượt khám`} className="w-1/2 rounded-t bg-blue-500" style={{ height: `${row.count === 0 ? 0 : Math.max(3, (row.count / max) * 100)}%` }} />
          <div title={`${row.date}: ${row.appointmentCount ?? 0} lịch hẹn`} className="w-1/2 rounded-t bg-teal-500" style={{ height: `${!row.appointmentCount ? 0 : Math.max(3, ((row.appointmentCount ?? 0) / max) * 100)}%` }} />
        </div>
        <span className="text-[9px] text-slate-500">{row.date.slice(5)}</span>
      </div>)}
    </div>
    <div className="mt-3 flex gap-4 text-xs text-slate-600"><span><i className="mr-1 inline-block h-2 w-2 rounded bg-blue-500" />Lượt khám</span><span><i className="mr-1 inline-block h-2 w-2 rounded bg-teal-500" />Lịch hẹn</span></div>
  </div>;
}

export function ReportsPanel({ initialFilters }: { initialFilters: ReportsFilters }) {
  const [draft, setDraft] = useState(initialFilters);
  const [filters, setFilters] = useState(initialFilters);
  const [filterError, setFilterError] = useState('');
  const [exportError, setExportError] = useState('');
  const [exporting, setExporting] = useState(false);
  const { data, error, isLoading, refresh } = useReports(filters);

  const updateDraft = (key: keyof ReportsFilters, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const submitFilters = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = ReportsSchema.safeParse({
      startDate: draft.startDate,
      endDate: draft.endDate,
      ...(draft.visitStatus?.trim() ? { visitStatus: draft.visitStatus.trim() } : {}),
      ...(draft.appointmentStatus?.trim() ? { appointmentStatus: draft.appointmentStatus.trim() } : {}),
      ...(draft.treatmentSessionStatus?.trim() ? { treatmentSessionStatus: draft.treatmentSessionStatus.trim() } : {}),
    });
    if (!parsed.success) {
      setFilterError('Ngày bắt đầu/kết thúc hoặc bộ lọc trạng thái không hợp lệ.');
      return;
    }
    setFilterError('');
    setFilters(parsed.data);
  };

  const exportReport = async () => {
    setExporting(true);
    setExportError('');
    try {
      const blob = await reportsApi.exportCsv(filters);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `clinic-report-${filters.startDate}-${filters.endDate}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setExportError(cause instanceof Error ? cause.message : 'Không thể xuất báo cáo.');
    } finally {
      setExporting(false);
    }
  };

  const dailyRows = data?.visits.byDate.map((visit, index) => ({
    ...visit,
    appointmentCount: data.appointments.byDate[index]?.count ?? 0,
  })) ?? [];

  return <div className="space-y-5">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <form className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-5" onSubmit={submitFilters}>
        <label className="text-xs font-medium text-slate-600">Từ ngày<input type="date" value={draft.startDate} onChange={(event) => updateDraft('startDate', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
        <label className="text-xs font-medium text-slate-600">Đến ngày<input type="date" value={draft.endDate} onChange={(event) => updateDraft('endDate', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
        <label className="text-xs font-medium text-slate-600">Trạng thái Visit (giá trị chính xác)<input value={draft.visitStatus ?? ''} onChange={(event) => updateDraft('visitStatus', event.target.value)} maxLength={64} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
        <label className="text-xs font-medium text-slate-600">Trạng thái lịch hẹn (giá trị chính xác)<input value={draft.appointmentStatus ?? ''} onChange={(event) => updateDraft('appointmentStatus', event.target.value)} maxLength={64} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
        <div className="flex items-end gap-2"><button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Áp dụng</button><button type="button" onClick={() => void refresh()} disabled={isLoading} className="rounded-lg border border-slate-300 p-2 text-slate-700 disabled:opacity-50" aria-label="Làm mới báo cáo"><RefreshCw size={17} className={isLoading ? 'animate-spin' : ''} /></button></div>
        {data?.capabilities.treatment && <label className="text-xs font-medium text-slate-600">Trạng thái TreatmentSession (giá trị chính xác)<input value={draft.treatmentSessionStatus ?? ''} onChange={(event) => updateDraft('treatmentSessionStatus', event.target.value)} maxLength={64} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>}
      </form>
      {filterError && <p role="alert" className="mt-3 text-sm text-rose-700">{filterError}</p>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-xs text-slate-500">Chỉ tổng hợp Visit và lịch hẹn được phân công trực tiếp cho tài khoản đang đăng nhập. Khoảng tối đa 366 ngày; ngày theo UTC.</p>
        {data?.capabilities.export && <button type="button" onClick={() => void exportReport()} disabled={exporting || isLoading} className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 px-3 py-2 text-sm font-medium text-indigo-700 disabled:opacity-50"><Download size={16} />{exporting ? 'Đang xuất…' : 'Xuất CSV'}</button>}
      </div>
      {exportError && <p role="alert" className="mt-2 text-sm text-rose-700">{exportError}</p>}
    </section>

    {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}
    {isLoading && <div role="status" className="flex items-center gap-2 rounded-xl bg-white p-8 text-sm text-slate-600"><LoaderCircle size={18} className="animate-spin" />Đang tải báo cáo…</div>}

    {!isLoading && data && <>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase text-slate-500">Lượt khám được phân công</p><p className="mt-2 text-3xl font-bold text-slate-900">{data.visits.total}</p></article>
        <article className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase text-slate-500">Lịch hẹn được phân công</p><p className="mt-2 text-3xl font-bold text-slate-900">{data.appointments.total}</p></article>
        {data.finance ? <article className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase text-slate-500">Payment theo paidAt</p><p className="mt-2 text-2xl font-bold text-slate-900">{data.finance.paymentAmount} ₫</p><p className="mt-1 text-xs text-slate-500">{data.finance.paymentCount} bản ghi thanh toán; không đồng nghĩa doanh thu được công nhận.</p></article> : <article className="rounded-2xl border border-dashed bg-slate-50 p-5"><p className="font-medium text-slate-700">Báo cáo tài chính đang khóa</p><p className="mt-1 text-xs text-slate-500">Cần REPORT_READ và BILLING_READ cùng role.</p></article>}
        {data.treatment ? <article className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase text-slate-500">Giá vốn tiêu hao đã ghi nhận</p><p className="mt-2 text-2xl font-bold text-slate-900">{data.treatment.consumptionTotalCost} ₫</p><p className="mt-1 text-xs text-slate-500">Dùng TreatmentConsumption.totalCost đã lưu.</p></article> : <article className="rounded-2xl border border-dashed bg-slate-50 p-5"><p className="font-medium text-slate-700">Báo cáo tiêu hao đang khóa</p><p className="mt-1 text-xs text-slate-500">Cần REPORT_READ, INVENTORY_READ và TREATMENT_READ cùng role.</p></article>}
      </section>

      {data.visits.total === 0 && data.appointments.total === 0 && (!data.finance || data.finance.paymentCount === 0) && (!data.treatment || data.treatment.sessionCount === 0) && <div className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-slate-600">Không có dữ liệu trong khoảng thời gian và phạm vi hiện tại.</div>}

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900"><BarChart3 size={19} />Lượt khám và lịch hẹn theo ngày</h2>
        <CountBars rows={dailyRows} label="Biểu đồ lượt khám và lịch hẹn hằng ngày" />
        <div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Ngày</th><th className="p-3">Visit</th><th className="p-3">Lịch hẹn</th></tr></thead><tbody className="divide-y">{dailyRows.map((row) => <tr key={row.date}><td className="p-3">{row.date}</td><td className="p-3">{row.count}</td><td className="p-3">{row.appointmentCount}</td></tr>)}</tbody></table></div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <StatusTable title="Visit theo trạng thái lưu trong database" rows={data.visits.byStatus} />
        <StatusTable title="Lịch hẹn theo trạng thái lưu trong database" rows={data.appointments.byStatus} />
      </section>

      {data.finance && <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <AmountTable title="Payment theo ngày paidAt" rows={data.finance.byDate.map((row) => ({ label: row.date, amount: row.amount, count: row.count }))} />
        <AmountTable title="Payment theo method lưu trong database" rows={data.finance.byMethod.map((row) => ({ label: row.method, amount: row.amount, count: row.count }))} />
      </section>}

      {data.treatment && <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <StatusTable title="TreatmentSession theo trạng thái (lọc theo createdAt)" rows={data.treatment.sessionsByStatus} />
        <AmountTable title="Giá vốn đã ghi nhận theo ngày tạo dòng tiêu hao" rows={data.treatment.consumptionByDate.map((row) => ({ label: row.date, amount: row.amount, count: row.count }))} />
        <QuantityTable rows={data.treatment.quantityByUnit} />
      </section>}
    </>}
  </div>;
}

function StatusTable({ title, rows }: { title: string; rows: Array<{ status: string; count: number }> }) {
  return <section className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="mb-3 font-semibold text-slate-900">{title}</h2>{rows.length === 0 ? <p className="text-sm text-slate-500">Không có dữ liệu.</p> : <table className="min-w-full text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="py-2">Trạng thái</th><th className="py-2 text-right">Số lượng</th></tr></thead><tbody className="divide-y">{rows.map((row) => <tr key={row.status}><td className="py-2">{row.status}</td><td className="py-2 text-right">{row.count}</td></tr>)}</tbody></table>}</section>;
}

function AmountTable({ title, rows }: { title: string; rows: Array<{ label: string; amount: string; count: number }> }) {
  return <section className="overflow-x-auto rounded-2xl border bg-white p-5 shadow-sm"><h2 className="mb-3 font-semibold text-slate-900">{title}</h2>{rows.length === 0 ? <p className="text-sm text-slate-500">Không có dữ liệu.</p> : <table className="min-w-full text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="py-2">Ngày / Nhóm</th><th className="py-2 text-right">Số bản ghi</th><th className="py-2 text-right">Tổng tiền đã lưu</th></tr></thead><tbody className="divide-y">{rows.map((row) => <tr key={row.label}><td className="py-2">{row.label}</td><td className="py-2 text-right">{row.count}</td><td className="py-2 text-right">{row.amount} ₫</td></tr>)}</tbody></table>}</section>;
}

function QuantityTable({ rows }: { rows: Array<{ unit: string; quantity: string; lineCount: number }> }) {
  return <section className="overflow-x-auto rounded-2xl border bg-white p-5 shadow-sm"><h2 className="mb-3 font-semibold text-slate-900">Tiêu hao cộng theo đơn vị</h2>{rows.length === 0 ? <p className="text-sm text-slate-500">Không có dữ liệu.</p> : <table className="min-w-full text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="py-2">Đơn vị</th><th className="py-2 text-right">Số dòng</th><th className="py-2 text-right">Tổng lượng</th></tr></thead><tbody className="divide-y">{rows.map((row) => <tr key={row.unit}><td className="py-2">{row.unit}</td><td className="py-2 text-right">{row.lineCount}</td><td className="py-2 text-right">{row.quantity}</td></tr>)}</tbody></table>}</section>;
}
