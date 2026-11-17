import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  staff: vi.fn(), doctor: vi.fn(), patient: vi.fn(), summary: vi.fn(), csv: vi.fn(),
}));
vi.mock('@/server/auth/staff-session', () => ({ getStaffSession: mocks.staff }));
vi.mock('@/server/auth/doctor-session', () => ({ getDoctorSession: mocks.doctor }));
vi.mock('@/server/auth/patient-session', () => ({ getPatientSession: mocks.patient }));
vi.mock('@/features/reports/treatment-report.service', () => ({ TreatmentReportService: class {
  summary = mocks.summary;
  csv = mocks.csv;
} }));

import { GET as reportGet } from '@/app/api/admin/reports/treatment/route';
import { GET as csvGet } from '@/app/api/admin/reports/treatment/csv/route';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.staff.mockImplementation(async (portal: string) => portal === 'admin' ? { accountId: 'admin-1' } : null);
  mocks.doctor.mockResolvedValue(null);
  mocks.patient.mockResolvedValue(null);
  mocks.summary.mockResolvedValue({ plans: { total: 0 } });
  mocks.csv.mockResolvedValue([]);
});

describe('API báo cáo điều trị', () => {
  it('chặn vai trò lễ tân bằng 403', async () => {
    mocks.staff.mockImplementation(async (portal: string) => portal === 'letan' ? { accountId: 'reception-1' } : null);
    const response = await reportGet(new NextRequest('http://localhost/api/admin/reports/treatment'));
    expect(response.status).toBe(403);
    expect(mocks.summary).not.toHaveBeenCalled();
  });

  it('bộ lọc sai trả 400 trước khi truy vấn', async () => {
    const response = await reportGet(new NextRequest('http://localhost/api/admin/reports/treatment?period=khong-hop-le'));
    expect(response.status).toBe(400);
    expect(mocks.summary).not.toHaveBeenCalled();
  });

  it('admin nhận số liệu tổng hợp', async () => {
    const response = await reportGet(new NextRequest('http://localhost/api/admin/reports/treatment?period=month'));
    expect(response.status).toBe(200);
    expect((await response.json()).data.plans.total).toBe(0);
    expect(mocks.summary).toHaveBeenCalledOnce();
  });

  it('CSV có BOM và không chứa tên bệnh nhân hoặc số điện thoại', async () => {
    mocks.csv.mockResolvedValue([{ id: 'plan-1', patientCode: '=SUM(1,2)', status: 'ACTIVE',
      doctorName: 'Bác sĩ thử', reportDate: '2026-11-17', progress: { completed: 1, total: 2, percent: 50 } }]);
    const response = await csvGet(new NextRequest('http://localhost/api/admin/reports/treatment/csv?period=month'));
    expect(response.status).toBe(200);
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    const body = new TextDecoder().decode(bytes);
    expect(body).toContain('"\'=SUM(1,2)"');
    expect(body).not.toContain('Tên bệnh nhân');
    expect(body).not.toContain('SĐT');
  });
});
