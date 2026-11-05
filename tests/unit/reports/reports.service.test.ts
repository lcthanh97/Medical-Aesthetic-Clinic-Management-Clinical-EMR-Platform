import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthActor } from '@/server/services/AuthService';
import type { IReportsRepository, ReportRepositoryData } from '@/server/repositories/IReportsRepository';
import { ReportsService } from '@/server/services/ReportsService';
import { ReportsValidator } from '@/server/validators/ReportsValidator';
import { ReportsMapper } from '@/server/mappers/ReportsMapper';

const baseData: ReportRepositoryData = {
  visits: { total: 0, byStatus: [], byDate: [] },
  appointments: { total: 0, byStatus: [], byDate: [] },
  finance: null,
  treatment: null,
};

const baseActor: AuthActor = {
  accountId: 'synthetic-account', sessionId: 'synthetic-session', username: 'synthetic',
  employeeId: 'synthetic-employee', employeeName: 'Synthetic', roleNames: ['reporter'],
  rolePermissions: [{ roleName: 'reporter', permissionCodes: ['REPORT_READ'] }],
};

describe('ReportsService and ReportsValidator', () => {
  let repository: IReportsRepository;
  let service: ReportsService;

  beforeEach(() => {
    repository = { getDashboardReport: vi.fn().mockResolvedValue(baseData) };
    service = new ReportsService(repository);
  });

  it('fails closed without a linked employee or REPORT_READ', async () => {
    const filters = { startDate: '2026-03-01', endDate: '2026-03-01' };
    await expect(service.getDashboardReport({ ...baseActor, employeeId: null }, filters)).rejects.toThrow('REPORT_ACCESS_DENIED');
    await expect(service.getDashboardReport({ ...baseActor, rolePermissions: [] }, filters)).rejects.toThrow('REPORT_ACCESS_DENIED');
    expect(repository.getDashboardReport).not.toHaveBeenCalled();
  });

  it('does not combine report, finance, treatment, or export permissions across roles', async () => {
    const splitActor = {
      ...baseActor,
      rolePermissions: [
        { roleName: 'report-role', permissionCodes: ['REPORT_READ'] },
        { roleName: 'billing-role', permissionCodes: ['BILLING_READ'] },
        { roleName: 'inventory-role', permissionCodes: ['INVENTORY_READ', 'TREATMENT_READ'] },
        { roleName: 'export-role', permissionCodes: ['REPORT_EXPORT'] },
      ],
    };
    const data = await service.getDashboardReport(splitActor, { startDate: '2026-03-01', endDate: '2026-03-01' });
    expect(data.capabilities).toEqual({ finance: false, treatment: false, export: false });
    expect(repository.getDashboardReport).toHaveBeenCalledWith(
      { accountId: 'synthetic-account', employeeId: 'synthetic-employee' },
      expect.objectContaining({ startDate: '2026-03-01', endDate: '2026-03-01' }),
      { finance: false, treatment: false },
    );
    await expect(service.getDashboardReport(splitActor, { startDate: '2026-03-01', endDate: '2026-03-01' }, true))
      .rejects.toThrow('REPORT_EXPORT_DENIED');
  });

  it('uses same-role permissions, preserves Decimal amounts and fills empty chart days with zero', async () => {
    vi.mocked(repository.getDashboardReport).mockResolvedValue({
      ...baseData,
      visits: { total: 2, byStatus: [{ status: 'STORED_STATUS', count: 2 }], byDate: [{ date: '2026-03-02', count: 2 }] },
      finance: { paymentCount: 1, paymentAmount: '9007199254740993.01', byMethod: [], byDate: [{ date: '2026-03-02', amount: '9007199254740993.01', count: 1 }] },
    });
    const actor = {
      ...baseActor,
      rolePermissions: [{ roleName: 'reporter', permissionCodes: ['REPORT_READ', 'BILLING_READ', 'REPORT_EXPORT'] }],
    };
    const report = await service.getDashboardReport(actor, { startDate: '2026-03-01', endDate: '2026-03-03' });
    expect(report.visits.byDate).toEqual([
      { date: '2026-03-01', count: 0 }, { date: '2026-03-02', count: 2 }, { date: '2026-03-03', count: 0 },
    ]);
    expect(report.finance?.paymentAmount).toBe('9007199254740993.01');
    expect(report.capabilities.finance).toBe(true);
  });

  it('validates dates, ordering, and the maximum 366-day range', () => {
    const validator = new ReportsValidator();
    expect(validator.parseFilters({ startDate: '2026-03-01', endDate: '2026-03-02', visitStatus: 'SCHEDULED' }).visitStatus).toBe('SCHEDULED');
    expect(() => validator.parseFilters({ startDate: '2026-03-02', endDate: '2026-03-01' })).toThrow('REPORT_INVALID_RANGE');
    expect(() => validator.parseFilters({ startDate: '2026-02-30', endDate: '2026-03-01' })).toThrow('REPORT_INVALID_DATE');
    expect(() => validator.parseFilters({ startDate: '2025-01-01', endDate: '2026-01-02' })).toThrow('REPORT_RANGE_TOO_LARGE');
  });

  it('escapes untrusted status text in UTF-8 CSV while exporting only aggregate rows', () => {
    const report = {
      ...baseData,
      visits: { total: 1, byStatus: [{ status: '=HYPERLINK("x")', count: 1 }], byDate: [] },
      period: { startDate: '2026-03-01', endDate: '2026-03-01' },
      capabilities: { finance: false, treatment: false, export: true },
    };
    const csv = ReportsMapper.toCsv(report);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain("'=HYPERLINK(\"\"x\"\")");
    expect(csv).not.toContain('patient');
  });
});
