import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getStaffSession } from '@/server/auth/staff-session';
import { getDoctorSession } from '@/server/auth/doctor-session';
import { getPatientSession } from '@/server/auth/patient-session';
import { TreatmentReportService } from '@/features/reports/treatment-report.service';
import { reportQuerySchema } from '@/features/reports/treatment-report.schema';

export const runtime = 'nodejs';
const service = new TreatmentReportService();

export async function GET(request: NextRequest) {
  const started = performance.now();
  let status = 200;
  let reasonCode = 'OK';
  try {
    const session = await getStaffSession('admin');
    if (!session) {
      const [reception, doctor, patient] = await Promise.all([getStaffSession('letan'), getDoctorSession(), getPatientSession()]);
      status = reception || doctor || patient ? 403 : 401;
      reasonCode = status === 403 ? 'REPORT_FORBIDDEN' : 'REPORT_UNAUTHORIZED';
      return NextResponse.json({ success: false, error: status === 403 ? 'Bạn không có quyền xem báo cáo quản trị.' : 'Vui lòng đăng nhập quản trị.' }, { status });
    }
    const query = reportQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    let data: unknown;
    if (query.view === 'options') data = await service.options();
    else if (query.view === 'plans') data = await service.plans(query);
    else if (query.view === 'sessions') data = await service.sessions(query);
    else data = await service.summary(query);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof ZodError || error instanceof Error && error.message === 'REPORT_DATE_RANGE_INVALID') {
      status = 400; reasonCode = 'REPORT_FILTER_INVALID';
      return NextResponse.json({ success: false, error: 'Bộ lọc không hợp lệ. Khoảng ngày tối đa 366 ngày; vui lòng kiểm tra kỳ, ngày và các giá trị đã chọn.' }, { status });
    }
    status = 500; reasonCode = 'REPORT_QUERY_FAILED';
    return NextResponse.json({ success: false, error: 'Không thể tải báo cáo điều trị. Vui lòng thử lại.' }, { status });
  } finally {
    if (process.env.REPORT_DEBUG_LOG === 'true') console.info('[treatment-report]', { route: 'GET', status, reasonCode, elapsedMs: Math.round(performance.now() - started) });
  }
}
