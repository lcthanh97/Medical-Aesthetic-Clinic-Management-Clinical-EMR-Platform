import { collectionLabels } from './rules';
import { money, panel, shortDay } from './presentation';
import type { Summary } from './service';

export function FinanceCharts({ data }: { data: Summary }) {
  const rows = data.trend;
  // Number is used only for SVG coordinates. Labels retain the original decimal strings.
  const values = rows.flatMap((row) => [Number(row.revenue), Number(row.paid)]);
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  const step = 46;
  const left = 114;
  const top = 15;
  const plotHeight = 160;
  const width = left + Math.max(rows.length, 5) * step + 8;
  const y = (value: number) => top + ((max - value) / (max - min)) * plotHeight;
  const zero = y(0);
  const ticks = [...new Set([max, 0, min])];
  const labels = data.period.grain === 'week' ? 'Tuần từ ' : data.period.grain === 'month' ? 'Tháng ' : '';
  const maxCount = Math.max(1, ...data.distribution.map((row) => row.count));

  return <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
    <section className={panel}>
      <h2 className="font-bold text-gray-900">Doanh thu, đã thu và giá vốn theo kỳ</h2>
      <p className="mt-1 text-xs text-gray-600">Chưa có chuỗi giá vốn trong báo cáo này.</p>
      {rows.length ? <>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-700">
          <span><b className="text-blue-700">■</b> Doanh thu</span>
          <span><b className="text-indigo-700">▤</b> Đã thu</span>
        </div>
        <div className="mt-3 overflow-x-auto" tabIndex={0} aria-label="Biểu đồ tài chính có thể cuộn ngang">
          <svg width={width} height="207" viewBox={`0 0 ${width} 207`} role="img" aria-label="Cột doanh thu và đã thu theo kỳ, đơn vị đồng">
            <defs><pattern id="finance-collected" patternUnits="userSpaceOnUse" width="5" height="5">
              <rect width="5" height="5" className="fill-indigo-100" />
              <path d="M0 5L5 0" className="stroke-indigo-700" strokeWidth="1" />
            </pattern></defs>
            {ticks.map((value) => <g key={value}>
              <line x1={left} y1={y(value)} x2={width - 8} y2={y(value)} className="stroke-gray-300" />
              <text x={left - 7} y={y(value) + 4} textAnchor="end" className="fill-gray-600 text-[10px]">{value.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}</text>
            </g>)}
            {rows.map((row, index) => {
              const x = left + index * step + 6;
              return <g key={row.date}>
                {(['revenue', 'paid'] as const).map((key, bar) => {
                  const end = y(Number(row[key]));
                  return <rect key={key} x={x + bar * 16} y={Math.min(end, zero)} width="14" height={Math.abs(end - zero)}
                    rx="2" fill={bar ? 'url(#finance-collected)' : 'currentColor'} className="text-blue-600">
                    <title>{labels}{shortDay(row.date)} · {bar ? 'Đã thu' : 'Doanh thu'} {money(row[key])}</title>
                  </rect>;
                })}
                <text x={x + 15} y={plotHeight + top + 19} textAnchor="middle" className="fill-gray-600 text-[10px]">
                  {data.period.grain === 'month' ? row.date.slice(5, 7) : shortDay(row.date)}
                </text>
              </g>;
            })}
          </svg>
        </div>
        <details className="mt-2 text-xs text-gray-700">
          <summary className="cursor-pointer font-medium text-blue-700">Xem số liệu của biểu đồ</summary>
          <ul className="mt-2 space-y-1">
            {rows.map((row) => <li key={row.date}>{labels}{shortDay(row.date)} · Doanh thu {money(row.revenue)} · Đã thu {money(row.paid)}</li>)}
          </ul>
        </details>
      </> : <p className="py-10 text-center text-sm text-gray-500">Chưa có dữ liệu để vẽ biểu đồ.</p>}
    </section>
    <section className={panel}>
      <h2 className="font-bold text-gray-900">Trạng thái thanh toán</h2>
      <p className="mt-1 text-xs text-gray-600">Theo số tiền thực tế đối chiếu vào hóa đơn trong kỳ.</p>
      {data.distribution.length ? <ul className="mt-4 space-y-4">
        {data.distribution.map(({ key, count }) => <li key={key}>
          <div className="flex justify-between gap-2 text-sm"><span>{collectionLabels[key]}</span><strong>{count} hóa đơn</strong></div>
          <div className="mt-1.5 h-2 rounded-full bg-gray-100" aria-hidden="true">
            <div className="h-full rounded-full bg-indigo-600" style={{ width: `${count / maxCount * 100}%` }} />
          </div>
        </li>)}
      </ul> : <p className="py-10 text-center text-sm text-gray-500">Chưa có hóa đơn hợp lệ.</p>}
    </section>
  </div>;
}
