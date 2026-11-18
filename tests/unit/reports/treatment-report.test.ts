import { describe, expect, it, vi } from 'vitest';
import { csvText, grainForRange, progress, sessionGroup, vnDateRange, vnDay, weightedProgress } from '@/features/reports/treatment-report.metrics';
import { reportQuerySchema } from '@/features/reports/treatment-report.schema';

vi.mock('@/infrastructure/database/prisma', () => ({ prisma: {} }));
import { TreatmentReportService } from '@/features/reports/treatment-report.service';

describe('định nghĩa báo cáo điều trị', () => {
  it('giới hạn buổi làm lại, giữ mẫu số khi buổi hủy và bỏ mẫu số không xác định', () => {
    expect(progress(3, 5, 0)).toEqual({ completed: 3, total: 3, percent: 100 });
    expect(progress(4, 2, 1)).toEqual({ completed: 3, total: 4, percent: 75 });
    expect(progress(0, 0, 2)).toEqual({ completed: 2, total: 0, percent: null });
    expect(weightedProgress([{ completed: 2, total: 4 }, { completed: 2, total: 0 }, { completed: 1, total: 1 }]))
      .toEqual({ completed: 3, total: 5, percent: 60 });
  });

  it('phân loại buổi hoàn thành, hủy, sắp tới và quá hẹn', () => {
    const now = new Date('2026-11-17T00:00:00Z');
    expect(sessionGroup('COMPLETED', null, now)).toBe('completed');
    expect(sessionGroup('CANCELLED', null, now)).toBe('cancelled');
    expect(sessionGroup('SCHEDULED', new Date('2026-11-18T00:00:00Z'), now)).toBe('upcoming');
    expect(sessionGroup('IN_PROGRESS', new Date('2026-11-16T00:00:00Z'), now)).toBe('overdue');
    expect(sessionGroup('IN_PROGRESS', null, now)).toBeNull();
  });

  it('cắt kỳ theo giờ Việt Nam, kể cả ranh giới UTC và năm nhuận', () => {
    expect(vnDay(new Date('2026-11-16T18:00:00Z'))).toBe('2026-11-17');
    const month = vnDateRange('month', new Date('2026-11-16T18:00:00Z'));
    expect(month.from.toISOString()).toBe('2026-10-31T17:00:00.000Z');
    expect(month.to.toISOString()).toBe('2026-11-30T17:00:00.000Z');
    expect(vnDateRange('quarter', new Date('2026-11-17T00:00:00Z')).fromDay).toBe('2026-10-01');
    expect(vnDateRange('year', new Date('2024-02-29T00:00:00Z')).toDay).toBe('2024-12-31');
    expect(vnDateRange('custom', new Date(), '2024-02-29', '2024-02-29').toDay).toBe('2024-02-29');
    expect(() => vnDateRange('custom', new Date(), '2024-01-01', '2025-12-31')).toThrow('REPORT_DATE_RANGE_INVALID');
  });

  it('chọn độ mịn biểu đồ theo độ dài kỳ', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    expect(grainForRange(start, new Date('2026-02-01T00:00:00Z'))).toBe('day');
    expect(grainForRange(start, new Date('2026-05-01T00:00:00Z'))).toBe('week');
    expect(grainForRange(start, new Date('2027-01-01T00:00:00Z'))).toBe('month');
  });

  it('CSV có BOM, thoát dấu nháy và vô hiệu công thức; không thêm trường bệnh nhân khác', () => {
    const csv = csvText(['Mã bệnh nhân', 'Phác đồ'], [['BN-1', '=SUM(1,2)'], ['BN-2', 'Tên "mẫu"']]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('"\'=SUM(1,2)"');
    expect(csv).toContain('"Tên ""mẫu"""');
    expect(csv).not.toContain('SĐT');
  });

  it('tham số sai bị từ chối', () => {
    expect(reportQuerySchema.safeParse({ period: 'sai' }).success).toBe(false);
    expect(reportQuerySchema.safeParse({ page: '-1' }).success).toBe(false);
    expect(reportQuerySchema.safeParse({ planStatus: 'UNKNOWN' }).success).toBe(false);
  });
});

describe('truy vấn tổng hợp với Prisma giả trong bộ nhớ', () => {
  it('kỳ không có dữ liệu trả 0 và mảng rỗng', async () => {
    const query = vi.fn().mockResolvedValue([]);
    const db = { $queryRaw: query } as unknown as ConstructorParameters<typeof TreatmentReportService>[0];
    const result = await new TreatmentReportService(db, () => new Date('2026-11-17T00:00:00Z'))
      .summary(reportQuerySchema.parse({ period: 'month' }));
    expect(result.plans.total).toBe(0);
    expect(result.sessions.total).toBe(0);
    expect(result.progress.percent).toBeNull();
    expect(result.timeline).toEqual([]);
    expect(query).toHaveBeenCalledTimes(5);
  });

  it('bộ lọc bác sĩ, thủ thuật và trạng thái được tham số hóa trong truy vấn', async () => {
    const query = vi.fn().mockResolvedValue([]);
    const db = { $queryRaw: query } as unknown as ConstructorParameters<typeof TreatmentReportService>[0];
    await new TreatmentReportService(db, () => new Date('2026-11-17T00:00:00Z'))
      .summary(reportQuerySchema.parse({ doctorId: 'doctor-1', procedureId: 'procedure-1', planStatus: 'ACTIVE' }));
    const values = query.mock.calls.flatMap((call) => (call[0] as { values: unknown[] }).values);
    expect(values).toContain('doctor-1');
    expect(values).toContain('procedure-1');
    expect(values).toContain('ACTIVE');
  });
});
