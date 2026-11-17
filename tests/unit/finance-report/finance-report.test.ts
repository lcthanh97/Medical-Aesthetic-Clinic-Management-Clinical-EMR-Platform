import { describe, expect, it, vi } from 'vitest';
import { ledger } from '@/features/finance-report/queries';
import { resolvePeriod, encodeCsv, CSV_LIMIT, type Filters, type Period } from '@/features/finance-report/rules';
import { money } from '@/features/finance-report/presentation';
import { createFinanceReportHandler } from '@/features/finance-report/handler';

vi.mock('server-only', () => ({}));
vi.mock('@/infrastructure/database/prisma', () => ({ default: {} }));
import { summaryQuery } from '@/features/finance-report/service';

const now = new Date('2024-02-29T17:00:00Z');
const request = (query = '') => new Request(`http://localhost/api/admin/finance-report/summary${query}`);
const empty = { rows: [], page: 1, pageSize: 20, hasMore: false };

function mocks() {
  return {
    areKnownFilters: vi.fn(async () => true),
    reportSummary: vi.fn(async (_filters: Filters, period: Period) => ({
      period, timeZone: 'Asia/Ho_Chi_Minh', services: empty,
      totals: { revenue: '0', paid: '0', debt: '0', refund: '0', unallocated: '0', invoiceCount: 0, paymentCount: 0, unresolved: 0 },
      lowStock: { medicines: 0, supplies: 0 }, trend: [], distribution: [], aging: [],
      options: { facilities: [], services: [], methods: [] },
    })),
    reportInvoices: vi.fn(async () => empty),
    reportServices: vi.fn(async () => empty),
    reportDetails: vi.fn(async () => empty),
    exportInvoices: vi.fn(async () => [{
      id: 'HD-1', patientCode: '=PAT', date: '2024-03-01', status: 'ISSUED', age: 1, overdueDays: null,
      total: '5580000', paid: '-500', remaining: '5580500', totalVnd: '5580000', paidVnd: '-500', remainingVnd: '5580500',
      fullName: 'DO_NOT_EXPORT', phone: 'DO_NOT_EXPORT_PHONE',
    }]),
    exportServices: vi.fn(async () => [{ id: 'S-1', code: 'S-1', name: '@Dịch vụ', revenue: '500', revenue_vnd: '500' }]),
  };
}

describe('kỳ báo cáo theo giờ Việt Nam', () => {
  it('chuyển tháng đúng lúc 17:00 UTC và nhận đủ ngày nhuận', () => {
    expect(resolvePeriod({ period: 'month' }, new Date(now.getTime() - 1))).toEqual({
      from: '2024-02-01', to: '2024-02-29', start: '2024-01-31T17:00:00.000Z', end: '2024-02-29T17:00:00.000Z', grain: 'day',
    });
    expect(resolvePeriod({ period: 'month' }, now)).toMatchObject({ from: '2024-03-01', to: '2024-03-31', grain: 'day' });
  });

  it('đổi quý, tuần và năm tại đúng nửa đêm địa phương', () => {
    expect(resolvePeriod({ period: 'quarter' }, new Date('2024-03-31T17:00:00Z'))).toMatchObject({
      from: '2024-04-01', to: '2024-06-30', grain: 'week',
    });
    expect(resolvePeriod({ period: 'week' }, new Date('2024-03-31T17:00:00Z'))).toMatchObject({
      from: '2024-04-01', to: '2024-04-07', grain: 'day',
    });
    expect(resolvePeriod({ period: 'year' }, new Date('2023-12-31T17:00:00Z'))).toEqual({
      from: '2024-01-01', to: '2024-12-31', start: '2023-12-31T17:00:00.000Z', end: '2024-12-31T17:00:00.000Z', grain: 'month',
    });
  });

  it('kiểm tra giới hạn 366 ngày, mốc 31 ngày và 6 tháng, ngày sai hoặc ngược', () => {
    const custom = (from: string, to: string) => resolvePeriod({ period: 'custom', from, to }, now);
    expect(custom('2024-01-01', '2024-01-31')?.grain).toBe('day');
    expect(custom('2024-01-01', '2024-02-01')?.grain).toBe('week');
    expect(custom('2024-01-01', '2024-06-30')?.grain).toBe('week');
    expect(custom('2024-01-01', '2024-07-01')?.grain).toBe('month');
    expect(custom('2024-01-01', '2024-12-31')).not.toBeNull();
    expect(custom('2024-01-01', '2025-01-01')).toBeNull();
    expect(custom('2024-02-30', '2024-03-01')).toBeNull();
    expect(custom('2024-03-02', '2024-03-01')).toBeNull();
  });
});

describe('hợp đồng truy vấn chỉ đọc', () => {
  const filter = { period: 'month' } as const;
  const period = resolvePeriod(filter, now)!;

  it('chọn hóa đơn hợp lệ và tổng hợp theo hóa đơn hoặc dòng dịch vụ riêng', () => {
    const all = ledger(filter, period, now);
    expect(all.values).toEqual(expect.arrayContaining(['ISSUED', 'UNPAID', 'PAID']));
    expect(all.values).not.toEqual(expect.arrayContaining(['DRAFT']));
    expect(all.values).not.toEqual(expect.arrayContaining(['CANCELLED']));
    expect(all.sql).toContain('SELECT * FROM invoice_base');
    const scoped = ledger({ ...filter, service: 'service-fixture', facility: 'facility-fixture', method: 'CASH' }, period, now);
    expect(scoped.sql).toContain('sum(total) AS total FROM invoice_lines WHERE service_id = ? GROUP BY invoice_id');
    expect(scoped.sql).toContain('AND p.method = ?');
    expect(scoped.values).toEqual(expect.arrayContaining(['service-fixture', 'facility-fixture', 'CASH']));
    expect(scoped.sql).not.toContain('service-fixture');
  });

  it('mỗi khoản thu tách thành các phần và gom theo mã thanh toán trước khi cộng', () => {
    const { sql } = ledger(filter, period, now);
    expect(sql).toContain('CASE WHEN p.amount < 0 THEN -abs(a.amount)');
    expect(sql).toContain('p.amount - a.amount');
    expect(sql).toContain('WHERE a.payment_id IS NULL');
    expect(sql).toContain("WHERE pp.kind <> 'unallocated'");
    expect(sql).toContain('greatest(i.total - coalesce(r.paid, 0), 0)');
    expect(sql).toContain('GROUP BY p.id, p.method, p."paidAt"');
  });

  it('tổng hợp bằng numeric, giữ mảng rỗng và phân nhóm tuổi nợ', () => {
    const { sql } = summaryQuery(filter, period, now);
    expect(sql).toContain('coalesce(sum(total), 0)::text AS revenue');
    expect(sql).toContain('coalesce(sum(amount), 0)::text AS paid');
    expect(sql).toContain("WHEN age <= 7 THEN '0-7' WHEN age <= 30 THEN '8-30' ELSE '30+'");
    expect(sql).toContain("'[]'::jsonb");
    expect(sql).toContain('WHERE EXISTS (SELECT 1 FROM series_totals)');
    expect(sql).not.toMatch(/::float|::double|Patient|fullName|\bphone\b/);
    expect(money('9007199254740993.51')).toBe('9.007.199.254.740.994 đ');
  });
});

describe('API báo cáo tài chính', () => {
  it('từ chối phiên ngoài quản trị trước khi đọc báo cáo', async () => {
    const db = mocks();
    expect((await createFinanceReportHandler(async () => false, db)(request(), 'summary')).status).toBe(403);
    expect(db.reportSummary).not.toHaveBeenCalled();
  });

  it.each(['?period=bad', '?period=custom&from=2024-02-30&to=2024-03-02', '?period=week&period=year', '?date=2024-02-01'])(
    'trả 400 cho bộ lọc sai %s', async (query) => {
      const db = mocks();
      expect((await createFinanceReportHandler(async () => true, db)(request(query), 'summary')).status).toBe(400);
      expect(db.reportSummary).not.toHaveBeenCalled();
    },
  );

  it('trả 400 khi dịch vụ hoặc phương thức không tồn tại', async () => {
    const db = mocks();
    db.areKnownFilters.mockResolvedValueOnce(false);
    expect((await createFinanceReportHandler(async () => true, db)(request('?service=unknown'), 'summary')).status).toBe(400);
  });

  it('chuyển bộ lọc sang dịch vụ, giữ kỳ trống và phân trang chi tiết', async () => {
    const db = mocks();
    const handle = createFinanceReportHandler(async () => true, db, () => now);
    const summary = await handle(request('?period=month&facility=f-1&service=s-1&method=CASH'), 'summary');
    expect(summary.status).toBe(200);
    expect(summary.headers.get('cache-control')).toContain('no-store');
    expect(await summary.json()).toMatchObject({ totals: { revenue: '0', paid: '0', debt: '0', refund: '0', unallocated: '0' }, trend: [] });
    expect(db.reportSummary).toHaveBeenCalledWith(expect.objectContaining({ service: 's-1', method: 'CASH' }), expect.objectContaining({ from: '2024-03-01' }), now);
    await handle(request('?period=month&metric=refund&page=2'), 'detail');
    expect(db.reportDetails).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), now, 2, 'refund');
  });

  it('xuất BOM, chỉ chọn cột cho phép, ngăn công thức và giữ nguyên số tiền', async () => {
    const handle = createFinanceReportHandler(async () => true, mocks(), () => now);
    const csv = await handle(request('?table=invoices'), 'csv');
    expect(csv.headers.get('content-type')).toContain('text/csv');
    const bytes = new Uint8Array(await csv.arrayBuffer());
    expect(Array.from(bytes.slice(0, 3))).toEqual([239, 187, 191]);
    const content = new TextDecoder().decode(bytes);
    expect(content).toContain('Mã bệnh nhân');
    expect(content).toContain(`"'=PAT"`);
    expect(content).toContain(',5580000,-500,5580500,');
    expect(content).not.toContain('DO_NOT_EXPORT');
    expect(encodeCsv(['A'], [['  @cmd'], ['+1'], ['-bad'], ['"quoted"']])).toContain(`"'  @cmd"\r\n"'+1"\r\n"'-bad"\r\n"""quoted"""`);
    const services = await handle(request('?table=services'), 'csv');
    expect(await services.text()).toContain(`"'@Dịch vụ",500`);
  });

  it('không xuất CSV vượt 50.000 dòng và trả lỗi chung khi truy vấn lỗi', async () => {
    const db = mocks();
    const handle = createFinanceReportHandler(async () => true, db);
    const [row] = await db.exportInvoices();
    db.exportInvoices.mockResolvedValueOnce(Array(CSV_LIMIT + 1).fill(row));
    expect((await handle(request('?table=invoices'), 'csv')).status).toBe(413);
    db.reportSummary.mockRejectedValueOnce(new Error('private db error'));
    const response = await handle(request(), 'summary');
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain('private db error');
  });
});
