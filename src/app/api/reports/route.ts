import { NextRequest, NextResponse } from 'next/server';
import { PrismaAuthRepository } from '@/infrastructure/database/repositories/PrismaAuthRepository';
import { PrismaReportsRepository } from '@/infrastructure/database/repositories/PrismaReportsRepository';
import { ReportsController } from '@/server/controllers/ReportsController';
import { AuthService } from '@/server/services/AuthService';
import { isNeonModuleReadEnabled } from '@/server/policies/NeonModuleReadAccess';
import { ReportsService } from '@/server/services/ReportsService';

const controller = new ReportsController(new ReportsService(new PrismaReportsRepository()));
const auth = new AuthService(new PrismaAuthRepository());

function isLocalReportsTestEnvironment(): boolean {
  if (process.env.NODE_ENV === 'production' || process.env.REPORTS_TEST_MODE !== 'true') return false;
  try {
    const database = new URL(process.env.DATABASE_URL ?? '');
    return ['127.0.0.1', 'localhost'].includes(database.hostname)
      && database.port === '55432'
      && database.pathname === '/emr_test';
  } catch {
    return false;
  }
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
}

function handleError(error: unknown) {
  const code = error instanceof Error ? error.message : '';
  if (code === 'REPORT_ACCESS_DENIED' || code === 'REPORT_EMPLOYEE_SCOPE_REQUIRED' || code === 'REPORT_EXPORT_DENIED') {
    return json({ success: false, error: 'Bạn không có quyền xem hoặc xuất báo cáo trong phạm vi được phép.' }, 403);
  }
  if (code.startsWith('REPORT_INVALID_') || code === 'REPORT_RANGE_TOO_LARGE' || (error && typeof error === 'object' && 'issues' in error)) {
    return json({ success: false, error: 'Khoảng thời gian hoặc bộ lọc báo cáo không hợp lệ.' }, 400);
  }
  return json({ success: false, error: 'Không thể tải báo cáo lúc này.' }, 500);
}

export async function GET(request: NextRequest) {
  const neonRead = isNeonModuleReadEnabled('REPORTS');
  if (!neonRead && !isLocalReportsTestEnvironment()) {
    return json({ success: false, error: 'Nguồn dữ liệu báo cáo chưa được bật.' }, 503);
  }

  try {
    const actor = await auth.getSession(request.cookies.get('clinic_session')?.value, { readOnly: neonRead });
    if (!actor) return json({ success: false, error: 'Vui lòng đăng nhập để tiếp tục.' }, 401);

    const query = request.nextUrl.searchParams;
    const format = query.get('format');
    if (format !== null && format !== 'csv') return json({ success: false, error: 'Định dạng xuất không hợp lệ.' }, 400);
    const input = {
      startDate: query.get('startDate'),
      endDate: query.get('endDate'),
      ...(query.has('visitStatus') ? { visitStatus: query.get('visitStatus') } : {}),
      ...(query.has('appointmentStatus') ? { appointmentStatus: query.get('appointmentStatus') } : {}),
      ...(query.has('treatmentSessionStatus') ? { treatmentSessionStatus: query.get('treatmentSessionStatus') } : {}),
      ...(query.has('itemSearch') ? { itemSearch: query.get('itemSearch') } : {}),
    };
    if (format === 'csv') {
      const csv = await controller.exportCsv(actor, input);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="clinic-report.csv"',
          'Cache-Control': 'private, no-store, max-age=0',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }
    return json({ success: true, data: await controller.getDashboard(actor, input) });
  } catch (error) {
    return handleError(error);
  }
}
