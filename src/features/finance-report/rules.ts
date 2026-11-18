import { z } from 'zod';

export const TIME_ZONE = 'Asia/Ho_Chi_Minh';
export const PAGE_SIZE = 20;
export const CSV_LIMIT = 50_000;
export const invoiceLabels = {
  ISSUED: 'Đã lập', UNPAID: 'Chưa thanh toán', PARTIAL: 'Thanh toán một phần',
  PAID: 'Đã thanh toán', REFUNDED: 'Đã hoàn tiền',
} as const;
export const methodLabels: Record<string, string> = {
  BANK_TRANSFER: 'Chuyển khoản', CARD: 'Thẻ', CASH: 'Tiền mặt', E_WALLET: 'Ví điện tử', VNPAY: 'VNPay',
};
export const collectionLabels = {
  unpaid: 'Chưa thu', partial: 'Thu một phần', paid: 'Đã thu đủ', unknown: 'Chưa đối chiếu được',
};

const DAY = 86_400_000;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const identifier = z.string().trim().regex(/^[\w-]{1,128}$/);
const kind = z.enum(['week', 'month', 'quarter', 'year', 'custom']);
export const filterSchema = z.object({
  period: kind.default('month'),
  from: z.string().regex(datePattern).optional(),
  to: z.string().regex(datePattern).optional(),
  facility: identifier.optional(),
  service: identifier.optional(),
  method: identifier.optional(),
});
const page = z.string().regex(/^[1-9]\d{0,5}$/).transform(Number).optional();
export const detailKind = z.enum(['revenue', 'paid', 'debt', 'refund', 'unallocated']);
export const requestSchemas = {
  summary: filterSchema.strict(),
  invoices: filterSchema.extend({ page }).strict(),
  services: filterSchema.extend({ page }).strict(),
  detail: filterSchema.extend({ page, metric: detailKind }).strict(),
  csv: filterSchema.extend({ table: z.enum(['invoices', 'services']) }).strict(),
};

export type Filters = z.infer<typeof filterSchema>;
export type DetailKind = z.infer<typeof detailKind>;
export type Grain = 'day' | 'week' | 'month';
export type Period = { from: string; to: string; start: string; end: string; grain: Grain };

const isoDay = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY);
const firstOfMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 1));

function parseDay(value?: string) {
  if (!value || !datePattern.test(value) || Number(value.slice(0, 4)) < 1900 || Number(value.slice(0, 4)) > 9998) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && isoDay(date) === value ? date : null;
}

export function resolvePeriod(filters: Pick<Filters, 'period' | 'from' | 'to'>, now: Date): Period | null {
  let start: Date;
  let end: Date;
  if (filters.period === 'custom') {
    const from = parseDay(filters.from);
    const to = parseDay(filters.to);
    if (!from || !to || from > to) return null;
    start = from;
    end = addDays(to, 1);
  } else {
    if (filters.from || filters.to) return null;
    const localDay = new Intl.DateTimeFormat('sv-SE', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    const today = new Date(`${localDay}T00:00:00.000Z`);
    const year = today.getUTCFullYear();
    const month = today.getUTCMonth();
    if (filters.period === 'week') {
      start = addDays(today, -((today.getUTCDay() + 6) % 7));
      end = addDays(start, 7);
    } else {
      const first = filters.period === 'year' ? 0 : filters.period === 'quarter' ? Math.floor(month / 3) * 3 : month;
      const months = filters.period === 'year' ? 12 : filters.period === 'quarter' ? 3 : 1;
      start = firstOfMonth(year, first);
      end = firstOfMonth(year, first + months);
    }
  }
  const days = (end.getTime() - start.getTime()) / DAY;
  if (days > 366) return null;
  const targetMonth = start.getUTCMonth() + 6;
  const lastDay = addDays(firstOfMonth(start.getUTCFullYear(), targetMonth + 1), -1).getUTCDate();
  const sixMonths = addDays(firstOfMonth(start.getUTCFullYear(), targetMonth), Math.min(lastDay, start.getUTCDate()) - 1);
  const toUtc = (day: Date) => new Date(`${isoDay(day)}T00:00:00+07:00`).toISOString();
  return { from: isoDay(start), to: isoDay(addDays(end, -1)), start: toUtc(start), end: toUtc(end), grain: days <= 31 ? 'day' : end <= sixMonths ? 'week' : 'month' };
}

// Values received from SQL are already rounded once to whole VND for CSV.
export function encodeCsv(header: string[], rows: Array<Array<string | bigint | null>>) {
  const cell = (value: string | bigint | null) => {
    if (typeof value === 'bigint') return value.toString();
    const text = value ?? '';
    const safe = /^[\s\u0000-\u001f]*[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  return '\uFEFF' + [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';
}
