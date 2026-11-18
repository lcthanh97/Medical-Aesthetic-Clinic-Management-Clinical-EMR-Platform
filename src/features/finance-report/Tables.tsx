import type { ReactNode } from 'react';
import { invoiceLabels, methodLabels, type DetailKind } from './rules';
import { dayLabel, money, secondaryAction } from './presentation';
import type { InvoiceRow, PaymentRow, RecordPage, ServiceRow, Summary } from './service';

const agingLabel = { '0-7': '0–7 ngày', '8-30': '8–30 ngày', '30+': 'Trên 30 ngày' };
const invoiceStatus = (status: string) => invoiceLabels[status as keyof typeof invoiceLabels] ?? status;

function Grid({ headers, children }: { headers: string[]; children: ReactNode }) {
  return <div className="overflow-x-auto" tabIndex={0} aria-label="Bảng số liệu có thể cuộn ngang">
    <table className="w-full whitespace-nowrap text-left text-sm [&_td]:px-3 [&_td]:py-3 [&_th]:px-3 [&_th]:py-2.5">
      <thead className="border-b border-gray-200 bg-gray-50 text-xs text-gray-700">
        <tr>{headers.map((header) => <th key={header} scope="col">{header}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-gray-100 text-gray-800">{children}</tbody>
    </table>
  </div>;
}

export function PageControls({ data, onPage }: { data: Pick<RecordPage<unknown>, 'page' | 'hasMore'>; onPage: (page: number) => void }) {
  return <nav aria-label="Phân trang" className="mt-4 flex flex-wrap items-center justify-end gap-2">
    <button type="button" disabled={data.page <= 1} onClick={() => onPage(data.page - 1)} className={secondaryAction}>Trang trước</button>
    <span className="px-2 text-sm text-gray-700">Trang {data.page}</span>
    <button type="button" disabled={!data.hasMore} onClick={() => onPage(data.page + 1)} className={secondaryAction}>Trang sau</button>
  </nav>;
}

export function Aging({ data }: { data: Summary['aging'] }) {
  if (!data.length) return <p className="text-sm text-gray-600">Chưa có số dư nợ để phân nhóm.</p>;
  return <ul className="grid gap-2 sm:grid-cols-3">
    {Object.entries(agingLabel).map(([key, label]) => {
      const row = data.find((entry) => entry.key === key);
      return <li key={key} className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm">
        <h3 className="font-semibold text-gray-700">{label}</h3>
        <p className="mt-1 font-bold text-gray-900">{money(row?.amount ?? '0')}</p>
        <p className="text-xs text-gray-600">{row?.count ?? 0} hóa đơn</p>
      </li>;
    })}
  </ul>;
}

export function InvoiceTable({ rows }: { rows: InvoiceRow[] }) {
  if (!rows.length) return <p className="py-5 text-sm text-gray-600">Chưa có hóa đơn phù hợp.</p>;
  return <Grid headers={['Mã hóa đơn', 'Mã bệnh nhân', 'Ngày lượt khám', 'Tổng', 'Đã thu', 'Còn nợ', 'Trạng thái hóa đơn', 'Tuổi nợ', 'Ngày quá hạn']}>
    {rows.map((row) => {
      const percentage = row.paid === null ? null
        : Number(row.total) > 0 ? Math.min(100, Math.max(0, Math.round(Number(row.paid) / Number(row.total) * 100))) : null;
      const age = row.remaining !== null && /[1-9]/.test(row.remaining) ? row.age : null;
      return <tr key={row.id}>
        <td className="font-medium">{row.id}</td>
        <td>{row.patientCode}</td>
        <td>{dayLabel(row.date)}</td>
        <td>{money(row.total)}</td>
        <td>
          {money(row.paid)}
          {percentage !== null && <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-600">
            <progress value={percentage} max={100} className="h-1.5 w-14 accent-blue-700" aria-label="Tỷ lệ đã thu" />
            {percentage}%
          </div>}
        </td>
        <td className="font-semibold">{money(row.remaining)}</td>
        <td><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800">{invoiceStatus(row.status)}</span></td>
        <td>{age === null ? '—' : `${age} ngày`}</td>
        <td>{row.overdueDays ?? '—'}</td>
      </tr>;
    })}
  </Grid>;
}

export function PaymentsTable({ rows, metric }: { rows: PaymentRow[]; metric: DetailKind }) {
  if (!rows.length) return <p className="py-5 text-sm text-gray-600">Chưa có giao dịch phù hợp.</p>;
  const key = metric === 'refund' ? 'refund' : metric === 'unallocated' ? 'unallocated' : 'amount';
  const label = key === 'refund' ? 'Hoàn tiền' : key === 'unallocated' ? 'Chưa phân bổ' : 'Đã thu ròng';
  return <Grid headers={['Mã thanh toán', 'Ngày thanh toán', 'Phương thức', label]}>
    {rows.map((row) => <tr key={row.id}>
      <td className="font-medium">{row.id}</td><td>{dayLabel(row.date)}</td>
      <td>{methodLabels[row.method] ?? row.method}</td><td>{money(row[key])}</td>
    </tr>)}
  </Grid>;
}

export function ServicesTable({ rows }: { rows: ServiceRow[] }) {
  if (!rows.length) return <p className="py-5 text-sm text-gray-600">Chưa có doanh thu theo dịch vụ trong kỳ đã chọn.</p>;
  return <Grid headers={['Dịch vụ', 'Doanh thu', 'Giá vốn vật tư', 'Chênh lệch doanh thu − giá vốn']}>
    {rows.map((row) => <tr key={row.id ?? 'unassigned'}>
      <td><strong>{row.name}</strong>{row.code && <span className="ml-2 text-xs text-gray-600">{row.code}</span>}</td>
      <td className="font-semibold">{money(row.revenue)}</td>
      <td>—</td><td>—</td>
    </tr>)}
  </Grid>;
}
