import { CSV_LIMIT, encodeCsv, invoiceLabels, requestSchemas, resolvePeriod, type DetailKind, type Filters } from './rules';

type Reports = Pick<typeof import('./service'),
  'areKnownFilters' | 'reportSummary' | 'reportInvoices' | 'reportServices' | 'reportDetails' | 'exportInvoices' | 'exportServices'>;

const privateHeaders = { 'Cache-Control': 'private, no-store, max-age=0' };
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: privateHeaders });
const invalid = () => json({ error: 'Bộ lọc không hợp lệ. Hãy chọn lại kỳ, ngày, cơ sở, dịch vụ hoặc phương thức thanh toán.' }, 400);
const wholeVnd = (value: string | null) => value === null ? null : BigInt(value);

function csvResponse(filename: string, csv: string) {
  return new Response(csv, {
    headers: {
      ...privateHeaders,
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export function createFinanceReportHandler(hasAdminSession: () => Promise<boolean>, reports: Reports, clock = () => new Date()) {
  return async (request: Request, report: string) => {
    try {
      if (!await hasAdminSession()) return json({ error: 'Bạn cần quyền quản trị để xem báo cáo tài chính.' }, 403);
      if (!Object.hasOwn(requestSchemas, report)) return json({ error: 'Không tìm thấy báo cáo.' }, 404);
      const query = new URL(request.url).searchParams;
      if (new Set(query.keys()).size !== [...query.keys()].length) return invalid();
      const params = Object.fromEntries(query);
      const view = report as keyof typeof requestSchemas;
      const parsed = requestSchemas[view].safeParse(params);
      if (!parsed.success) return invalid();
      const filters = parsed.data as Filters & { page?: number; metric?: DetailKind; table?: 'invoices' | 'services' };
      const now = clock();
      const period = resolvePeriod(filters, now);
      if (!period) return json({ error: 'Hãy chọn khoảng ngày hợp lệ, tối đa 366 ngày.' }, 400);
      if (!await reports.areKnownFilters(filters)) return invalid();

      if (view === 'summary') return json(await reports.reportSummary(filters, period, now));
      const page = filters.page ?? 1;
      if (view === 'invoices') return json(await reports.reportInvoices(filters, period, now, page));
      if (view === 'services') return json(await reports.reportServices(filters, period, now, page));
      if (view === 'detail' && filters.metric) return json(await reports.reportDetails(filters, period, now, page, filters.metric));

      if (filters.table === 'invoices') {
        const rows = await reports.exportInvoices(filters, period, now);
        if (rows.length > CSV_LIMIT) return json({ error: 'Báo cáo vượt quá 50.000 dòng. Hãy thu hẹp kỳ hoặc bộ lọc.' }, 413);
        return csvResponse('doi-chieu-hoa-don.csv', encodeCsv(
          ['Mã hóa đơn', 'Mã bệnh nhân', 'Ngày lượt khám', 'Tổng (VND)', 'Đã thu (VND)', 'Còn nợ (VND)', 'Trạng thái hóa đơn', 'Tuổi nợ (ngày)', 'Ngày quá hạn'],
          rows.map((r) => [r.id, r.patientCode, r.date, wholeVnd(r.totalVnd), wholeVnd(r.paidVnd), wholeVnd(r.remainingVnd),
            invoiceLabels[r.status as keyof typeof invoiceLabels] ?? r.status, r.remaining !== null && !/^0(?:\.0+)?$/.test(r.remaining) ? String(r.age) : null, null]),
        ));
      }
      if (filters.table === 'services') {
        const rows = await reports.exportServices(filters, period, now);
        if (rows.length > CSV_LIMIT) return json({ error: 'Báo cáo vượt quá 50.000 dòng. Hãy thu hẹp kỳ hoặc bộ lọc.' }, 413);
        return csvResponse('doanh-thu-theo-dich-vu.csv', encodeCsv(
          ['Mã dịch vụ', 'Dịch vụ', 'Doanh thu (VND)', 'Giá vốn vật tư (VND)', 'Chênh lệch doanh thu − giá vốn (VND)'],
          rows.map((r) => [r.code, r.name, wholeVnd(r.revenue_vnd), null, null]),
        ));
      }
      return invalid();
    } catch {
      return json({ error: 'Chưa thể tải báo cáo tài chính. Vui lòng thử lại.' }, 500);
    }
  };
}
