export type Period = 'week' | 'month' | 'quarter' | 'year' | 'custom';
export type SessionGroup = 'completed' | 'upcoming' | 'cancelled' | 'overdue';
export type Grain = 'day' | 'week' | 'month';

const DAY = 86_400_000;
const VN_OFFSET = 7 * 60 * 60_000;
export const PLAN_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Đang điều trị', COMPLETED: 'Hoàn thành', DRAFT: 'Bản nháp',
};
export const SESSION_STATUS_LABELS: Record<string, string> = {
  COMPLETED: 'Đã thực hiện', IN_PROGRESS: 'Đang thực hiện', SCHEDULED: 'Đã xếp lịch', CANCELLED: 'Đã hủy',
};

export function vnDay(date: Date): string {
  return new Date(date.getTime() + VN_OFFSET).toISOString().slice(0, 10);
}

export function vnDateRange(period: Period, now: Date, from?: string, to?: string) {
  const day = vnDay(now);
  const [year, month, date] = day.split('-').map(Number);
  let first: Date;
  let last: Date;
  if (period === 'custom') {
    if (!from || !to || from > to) throw new Error('REPORT_DATE_RANGE_INVALID');
    first = new Date(`${from}T00:00:00+07:00`);
    last = new Date(`${to}T00:00:00+07:00`);
  } else {
    const dayUtc = new Date(Date.UTC(year, month - 1, date));
    if (period === 'week') {
      const mondayOffset = (dayUtc.getUTCDay() + 6) % 7;
      first = new Date(Date.UTC(year, month - 1, date - mondayOffset));
      last = new Date(Date.UTC(year, month - 1, date - mondayOffset + 6));
    } else if (period === 'month') {
      first = new Date(Date.UTC(year, month - 1, 1));
      last = new Date(Date.UTC(year, month, 0));
    } else if (period === 'quarter') {
      const quarterMonth = Math.floor((month - 1) / 3) * 3;
      first = new Date(Date.UTC(year, quarterMonth, 1));
      last = new Date(Date.UTC(year, quarterMonth + 3, 0));
    } else {
      first = new Date(Date.UTC(year, 0, 1));
      last = new Date(Date.UTC(year, 12, 0));
    }
    first = new Date(first.getTime() - VN_OFFSET);
    last = new Date(last.getTime() - VN_OFFSET);
  }
  const endExclusive = new Date(last.getTime() + DAY);
  if (!Number.isFinite(first.getTime()) || !Number.isFinite(last.getTime()) || (endExclusive.getTime() - first.getTime()) / DAY > 366) {
    throw new Error('REPORT_DATE_RANGE_INVALID');
  }
  return { from: first, to: endExclusive, fromDay: vnDay(first), toDay: vnDay(last) };
}

export function progress(capacity: number, linkedCompleted: number, unlinkedCompleted: number) {
  if (capacity <= 0) return { completed: linkedCompleted + unlinkedCompleted, total: 0, percent: null };
  const completed = Math.min(capacity, Math.max(0, linkedCompleted + unlinkedCompleted));
  return { completed, total: capacity, percent: Math.round(completed / capacity * 100) };
}

export function weightedProgress(rows: Array<{ completed: number; total: number }>) {
  const valid = rows.filter((row) => row.total > 0);
  const total = valid.reduce((sum, row) => sum + row.total, 0);
  const completed = valid.reduce((sum, row) => sum + Math.min(row.completed, row.total), 0);
  return { completed, total, percent: total ? Math.round(completed / total * 100) : null };
}

export function sessionGroup(status: string, scheduledAt: Date | null, now: Date): SessionGroup | null {
  if (status === 'COMPLETED') return 'completed';
  if (status === 'CANCELLED') return 'cancelled';
  if (!scheduledAt) return null;
  return scheduledAt >= now ? 'upcoming' : 'overdue';
}

export function grainForRange(from: Date, to: Date): Grain {
  const days = (to.getTime() - from.getTime()) / DAY;
  return days <= 31 ? 'day' : days <= 183 ? 'week' : 'month';
}

export function csvCell(value: unknown): string {
  const raw = String(value ?? '');
  const safe = /^[\s]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function csvText(headers: string[], rows: unknown[][]): string {
  return `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
}
