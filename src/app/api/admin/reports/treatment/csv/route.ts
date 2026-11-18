import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getStaffSession } from '@/server/auth/staff-session';
import { getDoctorSession } from '@/server/auth/doctor-session';
import { getPatientSession } from '@/server/auth/patient-session';
import { TreatmentReportService } from '@/features/reports/treatment-report.service';
import { csvText } from '@/features/reports/treatment-report.metrics';
import { reportCsvSchema } from '@/features/reports/treatment-report.schema';

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
      return NextResponse.json({ success: false, error: status === 403 ? 'Bạn không có quyền xuất báo cáo quản trị.' : 'Vui lòng đăng nhập quản trị.' }, { status });
    }
    const filters = reportCsvSchema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    const plans = await service.csv(filters);
    const body = csvText(
      ['Mã phác đồ', 'Mã bệnh nhân', 'Trạng thái', 'Bác sĩ lập phác đồ', 'Ngày bắt đầu/tạo', 'Buổi hoàn thành', 'Tổng buổi kế hoạch', 'Tiến độ (%)'],
      plans.map((plan) => [plan.id, plan.patientCode, plan.status, plan.doctorName,
        plan.reportDate?.slice(0, 10), plan.progress.completed, plan.progress.total, plan.progress.percent ?? 'Chưa xác định']),
    );
    return new NextResponse(body, { headers: { 'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="bao-cao-dieu-tri.csv"', 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof ZodError || error instanceof Error && error.message === 'REPORT_DATE_RANGE_INVALID') {
      status = 400; reasonCode = 'REPORT_FILTER_INVALID';
      return NextResponse.json({ success: false, error: 'Bộ lọc ngày không hợp lệ hoặc dài hơn 366 ngày.' }, { status });
    }
    if (error instanceof Error && error.message === 'REPORT_CSV_TOO_LARGE') {
      status = 413; reasonCode = 'REPORT_CSV_TOO_LARGE';
      return NextResponse.json({ success: false, error: 'Báo cáo có hơn 50.000 dòng. Vui lòng thu hẹp bộ lọc.' }, { status });
    }
    status = 500; reasonCode = 'REPORT_CSV_FAILED';
    return NextResponse.json({ success: false, error: 'Không thể xuất CSV. Vui lòng thử lại.' }, { status });
  } finally {
    if (process.env.REPORT_DEBUG_LOG === 'true') console.info('[treatment-report]', { route: 'CSV', status, reasonCode, elapsedMs: Math.round(performance.now() - started) });
  }
}
