'use client';

import { BarChart3, Download, LoaderCircle, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { ReportsSchema } from '../schemas/reports.schema';
import { reportsApi } from '../api/reportsApi';
import { useReports } from '../hooks/useReports';
import type { ReportsFilters, ReportsViewModel } from '../types/reports.types';

function CountBars({ rows }: { rows: Array<{ date: string; count: number; appointmentCount: number }> }) {
  const max = Math.max(1, ...rows.flatMap(({ count, appointmentCount }) => [count, appointmentCount]));
  return <div className="overflow-x-auto rounded-lg border border-slate-200 p-4">
    <div className="flex min-w-max items-end gap-2" role="img" aria-label="Lượt khám và lịch hẹn theo ngày">
      {rows.map((row) => <div key={row.date} className="flex w-12 flex-col items-center gap-1">
        <div className="flex h-36 w-full items-end gap-0.5">
          <div title={`${row.date}: ${row.count} lượt khám`} className="w-1/2 rounded-t bg-blue-500" style={{ height: `${row.count === 0 ? 0 : Math.max(3, (row.count / max) * 100)}%` }} />
          <div title={`${row.date}: ${row.appointmentCount} lịch hẹn`} className="w-1/2 rounded-t bg-teal-500" style={{ height: `${row.appointmentCount === 0 ? 0 : Math.max(3, (row.appointmentCount / max) * 100)}%` }} />
        </div>
        <span className="text-[9px] text-slate-500">{row.date.slice(5)}</span>
      </div>)}
    </div>
    <div className="mt-3 flex gap-4 text-xs text-slate-600"><span><i className="mr-1 inline-block h-2 w-2 rounded bg-blue-500" />Lượt khám</span><span><i className="mr-1 inline-block h-2 w-2 rounded bg-teal-500" />Lịch hẹn</span></div>
  </div>;
}

export function ReportsPanel({ initialFilters }: { initialFilters: ReportsFilters }) {
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');
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
      ...(draft.itemSearch?.trim() ? { itemSearch: draft.itemSearch.trim() } : {}),
    });
    if (!parsed.success) { setFilterError('Khoảng thời gian hoặc trạng thái không hợp lệ.'); return; }
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
    } catch (cause) { setExportError(cause instanceof Error ? cause.message : 'Không thể xuất báo cáo.'); }
    finally { setExporting(false); }
  };

  const periods = new Map<string, { date: string; count: number; appointmentCount: number }>();
  const appointments = new Map(data?.appointments.byDate.map(({ date, count }) => [date, count]));
  for (const visit of data?.visits.byDate ?? []) {
    const date = new Date(`${visit.date}T00:00:00Z`);
    if (groupBy === 'week') date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
    const key = groupBy === 'month' ? visit.date.slice(0, 7) : date.toISOString().slice(0, 10);
    const period = periods.get(key) ?? { date: key, count: 0, appointmentCount: 0 };
    period.count += visit.count;
    period.appointmentCount += appointments.get(visit.date) ?? 0;
    periods.set(key, period);
  }
  const dailyRows = [...periods.values()];

  return <div className="space-y-5">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <form className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-5" onSubmit={submitFilters}>
        <label className="text-xs font-medium text-slate-600">Từ ngày<input type="date" value={draft.startDate} onChange={(event) => updateDraft('startDate', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
        <label className="text-xs font-medium text-slate-600">Đến ngày<input type="date" value={draft.endDate} onChange={(event) => updateDraft('endDate', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
        <label className="text-xs font-medium text-slate-600">Trạng thái Visit (giá trị chính xác)<input value={draft.visitStatus ?? ''} onChange={(event) => updateDraft('visitStatus', event.target.value)} maxLength={64} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
        <label className="text-xs font-medium text-slate-600">Trạng thái lịch hẹn (giá trị chính xác)<input value={draft.appointmentStatus ?? ''} onChange={(event) => updateDraft('appointmentStatus', event.target.value)} maxLength={64} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
        <div className="flex items-end gap-2"><button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Áp dụng</button><button type="button" onClick={() => void refresh()} disabled={isLoading} className="rounded-lg border border-slate-300 p-2 text-slate-700 disabled:opacity-50" aria-label="Làm mới báo cáo"><RefreshCw size={17} className={isLoading ? 'animate-spin' : ''} /></button></div>
        {data?.capabilities.treatment && <label className="text-xs font-medium text-slate-600">Trạng thái buổi điều trị (giá trị chính xác)<input value={draft.treatmentSessionStatus ?? ''} onChange={(event) => updateDraft('treatmentSessionStatus', event.target.value)} maxLength={64} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>}
        {data?.capabilities.inventory && <label className="text-xs font-medium text-slate-600">Tên mặt hàng (danh sách và giao dịch)<input value={draft.itemSearch ?? ''} onChange={(event) => updateDraft('itemSearch', event.target.value)} maxLength={100} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>}
      </form>
      {filterError && <p role="alert" className="mt-3 text-sm text-rose-700">{filterError}</p>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-xs text-slate-500">Visit/lịch hẹn theo ngày nghiệp vụ lưu; phác đồ, buổi điều trị, tiêu hao và giao dịch kho theo createdAt. Chỉ Visit được phân công trực tiếp cho nhân viên đăng nhập; tối đa 366 ngày, UTC.</p>
        {data?.capabilities.export && <button type="button" onClick={() => void exportReport()} disabled={exporting || isLoading} className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 px-3 py-2 text-sm font-medium text-indigo-700 disabled:opacity-50"><Download size={16} />{exporting ? 'Đang xuất…' : 'Xuất CSV'}</button>}
      </div>
      {exportError && <p role="alert" className="mt-2 text-sm text-rose-700">{exportError}</p>}
    </section>

    {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}
    {isLoading && <div role="status" className="flex items-center gap-2 rounded-xl bg-white p-8 text-sm text-slate-600"><LoaderCircle size={18} className="animate-spin" />Đang tải báo cáo…</div>}
    {!isLoading && data && <>
      {data.visits.total === 0 && data.appointments.total === 0 && (data.finance?.paymentCount ?? 0) === 0 && (data.treatment?.sessionCount ?? 0) === 0 && (data.inventory?.transactionsByDate.length ?? 0) === 0 && <div className="rounded-xl border border-dashed bg-white p-6 text-center text-sm text-slate-600">Không có bản ghi trong kỳ và phạm vi hiện tại. Tồn kho hiện tại được hiển thị riêng nếu có quyền.</div>}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Lượt khám được phân công" value={data.visits.total} />
        <Metric label="Lịch hẹn được phân công" value={data.appointments.total} />
        <Metric label="Bệnh nhân duy nhất có Visit trong kỳ" value={data.patients.uniqueWithVisits} />
        <Metric label="Bệnh nhân từng có Visit hoặc lịch hẹn được phân công" value={data.patients.totalInScope} />
        <article className="rounded-2xl border border-dashed bg-slate-50 p-5"><p className="font-medium text-slate-700">Bệnh nhân mới: chưa khả dụng</p><p className="mt-1 text-xs text-slate-500">Patient chưa có trường ngày tạo nên không xác định được thời điểm đăng ký.</p></article>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900"><BarChart3 size={19} />Lượt khám và lịch hẹn</h2>
        <label className="mb-3 flex items-center gap-2 text-sm">Nhóm theo
          <select className="rounded border p-2" value={groupBy} onChange={(event) => setGroupBy(event.target.value as typeof groupBy)}>
            <option value="day">Ngày</option><option value="week">Tuần bắt đầu thứ Hai</option><option value="month">Tháng</option>
          </select>
        </label>
        <CountBars rows={dailyRows} />
        <div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Ngày</th><th className="p-3">Visit</th><th className="p-3">Lịch hẹn</th></tr></thead><tbody className="divide-y">{dailyRows.map((row) => <tr key={row.date}><td className="p-3">{row.date}</td><td className="p-3">{row.count}</td><td className="p-3">{row.appointmentCount}</td></tr>)}</tbody></table></div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <StatusTable title="Visit theo trạng thái lưu trong database" rows={data.visits.byStatus} />
        <StatusTable title="Lịch hẹn theo trạng thái lưu trong database" rows={data.appointments.byStatus} />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {data.treatment ? <>
          <Metric label="Phác đồ tạo trong kỳ (Visit được phân công)" value={data.treatment.planCount} />
          <Metric label="Buổi điều trị tạo trong kỳ" value={data.treatment.sessionCount} />
          <StatusTable title="Phác đồ theo trạng thái lưu" rows={data.treatment.plansByStatus} />
          <StatusTable title="Buổi điều trị theo trạng thái lưu" rows={data.treatment.sessionsByStatus} />
          <StatusTable title="Phác đồ tạo theo ngày" rows={data.treatment.plansByDate.map(({ date, count }) => ({ status: date, count }))} />
          <StatusTable title="Buổi điều trị tạo theo ngày" rows={data.treatment.sessionsByDate.map(({ date, count }) => ({ status: date, count }))} />
          <QuantityTable rows={data.treatment.quantityByUnit} />
          <AmountTable title="Chi phí tiêu hao đã ghi nhận theo ngày" rows={data.treatment.consumptionByDate.map((row) => ({ label: row.date, amount: row.amount, count: row.count }))} />
          <article className="rounded-xl border border-dashed bg-slate-50 p-4 text-sm text-slate-600">Tiến độ phần trăm chưa hiển thị vì chưa có quy tắc nghiệp vụ được xác nhận. Các trạng thái được giữ nguyên giá trị database.</article>
        </> : <Locked title="Báo cáo điều trị đang khóa" detail="Cần REPORT_READ, INVENTORY_READ và TREATMENT_READ cùng một role." />}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Tồn kho và giao dịch</h2>
        {data.inventory ? <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3"><Metric label="Mặt hàng thuốc" value={data.inventory.medicineCount} /><Metric label="Mặt hàng vật tư" value={data.inventory.supplyCount} /><Metric label="Mặt hàng dưới/ngang ngưỡng minStock" value={data.inventory.lowStockCount} /></div>
          <article className="rounded-xl border border-dashed bg-amber-50 p-4 text-sm text-amber-900">Dữ liệu tồn kho được tổng hợp theo catalog toàn database vì schema hiện không có facility/department scope. Giá trị tồn kho chưa được tính: chưa xác nhận phương pháp định giá. Giao dịch theo createdAt, nhóm theo transactionType và đơn vị lưu trong database; hệ thống không tự diễn giải loại giao dịch thành nhập/xuất.</article>
          <InventoryTable rows={data.inventory.lowStockItems} total={data.inventory.lowStockCount} />
          <InventoryTable title="Danh sách tồn hiện tại (tối đa 200 mặt hàng)" rows={data.inventory.stockItems} total={data.inventory.medicineCount + data.inventory.supplyCount} />
          <MovementTable rows={data.inventory.transactionsByTypeAndUnit} />
          <MovementByDateTable rows={data.inventory.transactionsByDate} />
        </> : <Locked title="Báo cáo tồn kho đang khóa" detail="Cần REPORT_READ và INVENTORY_READ cùng một role." />}
        {data.finance ? <>
            <Metric label="Payment.amount đã ghi nhận trong kỳ — không phải doanh thu xác nhận" value={`${data.finance.paymentAmount} ₫ (${data.finance.paymentCount} khoản)`} />
            <AmountTable title="Payment theo ngày paidAt" rows={data.finance.byDate.map((row) => ({ label: row.date, amount: row.amount, count: row.count }))} />
            <AmountTable title="Payment theo method lưu trong database" rows={data.finance.byMethod.map((row) => ({ label: row.method, amount: row.amount, count: row.count }))} />
            <Metric label="Tiền đã phân bổ trong kỳ" value={`${data.finance.allocatedAmount} ₫`} />
            <Metric label="Payment trừ phân bổ trong kỳ" value={`${data.finance.unallocatedBalance} ₫`} />
            <section className="overflow-x-auto rounded-2xl border bg-white p-5">
              <h3 className="font-semibold">Đối chiếu hóa đơn theo ngày Visit trong kỳ</h3>
              <p className="mb-3 text-sm text-slate-600">Đối chiếu với toàn bộ Payment của các hóa đơn này theo trạng thái lưu hiện tại.</p>
              {data.finance.invoicesByStatus.length === 0 ? <p>Không có hóa đơn trong phạm vi.</p> :
                <table className="w-full text-left text-sm">
                  <thead><tr><th>Trạng thái</th><th>Số hóa đơn</th><th>Giá trị</th><th>Payment</th><th>Chênh lệch</th></tr></thead>
                  <tbody>{data.finance.invoicesByStatus.map((row) => <tr key={row.status} className="border-t">
                    <td className="py-2">{row.status}</td><td>{row.count}</td><td>{row.invoiceAmount} ₫</td><td>{row.paymentAmount} ₫</td><td>{row.balance} ₫</td>
                  </tr>)}</tbody>
                </table>}
            </section>
        </> : <Locked title="Báo cáo Payment đang khóa" detail="Cần REPORT_READ và BILLING_READ cùng một role." />}
      </section>
    </>}
  </div>;
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return <article className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-slate-900">{value}</p></article>;
}
function Locked({ title, detail }: { title: string; detail: string }) {
  return <article className="rounded-2xl border border-dashed bg-slate-50 p-5"><p className="font-medium text-slate-700">{title}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></article>;
}
function StatusTable({ title, rows }: { title: string; rows: Array<{ status: string; count: number }> }) {
  return <section className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="mb-3 font-semibold text-slate-900">{title}</h2>{rows.length === 0 ? <p className="text-sm text-slate-500">Không có dữ liệu.</p> : <table className="min-w-full text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="py-2">Trạng thái</th><th className="py-2 text-right">Số lượng</th></tr></thead><tbody className="divide-y">{rows.map((row) => <tr key={row.status}><td className="py-2">{row.status}</td><td className="py-2 text-right">{row.count}</td></tr>)}</tbody></table>}</section>;
}
function AmountTable({ title, rows }: { title: string; rows: Array<{ label: string; amount: string; count: number }> }) {
  return <section className="overflow-x-auto rounded-2xl border bg-white p-5 shadow-sm"><h2 className="mb-3 font-semibold text-slate-900">{title}</h2>{rows.length === 0 ? <p className="text-sm text-slate-500">Không có dữ liệu.</p> : <table className="min-w-full text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="py-2">Ngày</th><th className="py-2 text-right">Số bản ghi</th><th className="py-2 text-right">Tổng tiền đã lưu</th></tr></thead><tbody className="divide-y">{rows.map((row) => <tr key={row.label}><td className="py-2">{row.label}</td><td className="py-2 text-right">{row.count}</td><td className="py-2 text-right">{row.amount} ₫</td></tr>)}</tbody></table>}</section>;
}
function QuantityTable({ rows }: { rows: Array<{ unit: string; quantity: string; lineCount: number }> }) {
  return <section className="overflow-x-auto rounded-2xl border bg-white p-5 shadow-sm"><h2 className="mb-3 font-semibold text-slate-900">Tiêu hao theo đơn vị lưu</h2>{rows.length === 0 ? <p className="text-sm text-slate-500">Không có dữ liệu.</p> : <table className="min-w-full text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="py-2">Đơn vị</th><th className="py-2 text-right">Số dòng</th><th className="py-2 text-right">Tổng lượng</th></tr></thead><tbody className="divide-y">{rows.map((row) => <tr key={row.unit}><td className="py-2">{row.unit}</td><td className="py-2 text-right">{row.lineCount}</td><td className="py-2 text-right">{row.quantity}</td></tr>)}</tbody></table>}</section>;
}
function InventoryTable({ rows, total, title = 'Mặt hàng dưới hoặc bằng ngưỡng tồn' }: { rows: NonNullable<ReportsViewModel['inventory']>['lowStockItems']; total: number; title?: string }) {
  return <section className="overflow-x-auto rounded-2xl border bg-white p-5 shadow-sm"><h2 className="mb-3 font-semibold">{title} ({rows.length}/{total})</h2>{rows.length === 0 ? <p className="text-sm text-slate-500">Không có mặt hàng phù hợp.</p> : <table className="min-w-full text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="py-2">Loại</th><th className="py-2">Mặt hàng</th><th className="py-2">Tồn</th><th className="py-2">Ngưỡng</th><th className="py-2">Trạng thái</th></tr></thead><tbody className="divide-y">{rows.map((row) => <tr key={`${row.kind}-${row.id}`}><td className="py-2">{row.kind}</td><td className="py-2">{row.name}</td><td className="py-2">{row.stock} {row.unit}</td><td className="py-2">{row.minStock} {row.unit}</td><td className="py-2">{row.status}</td></tr>)}</tbody></table>}</section>;
}
function MovementTable({ rows }: { rows: NonNullable<ReportsViewModel['inventory']>['transactionsByTypeAndUnit'] }) {
  return <section className="overflow-x-auto rounded-2xl border bg-white p-5 shadow-sm"><h2 className="mb-3 font-semibold">Giao dịch theo transactionType và đơn vị trong kỳ</h2>{rows.length === 0 ? <p className="text-sm text-slate-500">Không có giao dịch trong kỳ.</p> : <table className="min-w-full text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="py-2">transactionType (nguyên trạng)</th><th className="py-2">Đơn vị</th><th className="py-2 text-right">Số bản ghi</th><th className="py-2 text-right">Tổng quantity</th></tr></thead><tbody className="divide-y">{rows.map((row) => <tr key={`${row.transactionType}-${row.unit}`}><td className="py-2">{row.transactionType}</td><td className="py-2">{row.unit}</td><td className="py-2 text-right">{row.count}</td><td className="py-2 text-right">{row.quantity}</td></tr>)}</tbody></table>}</section>;
}
function MovementByDateTable({ rows }: { rows: NonNullable<ReportsViewModel['inventory']>['transactionsByDate'] }) {
  return <section className="overflow-x-auto rounded-2xl border bg-white p-5 shadow-sm"><h2 className="mb-3 font-semibold">Giao dịch kho theo ngày</h2>{rows.length === 0 ? <p className="text-sm text-slate-500">Không có giao dịch trong kỳ.</p> : <table className="min-w-full text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="py-2">Ngày</th><th className="py-2">transactionType</th><th className="py-2">Đơn vị</th><th className="py-2 text-right">Số bản ghi</th><th className="py-2 text-right">Tổng quantity</th></tr></thead><tbody className="divide-y">{rows.map((row) => <tr key={`${row.date}-${row.transactionType}-${row.unit}`}><td className="py-2">{row.date}</td><td className="py-2">{row.transactionType}</td><td className="py-2">{row.unit}</td><td className="py-2 text-right">{row.count}</td><td className="py-2 text-right">{row.quantity}</td></tr>)}</tbody></table>}</section>;
}
