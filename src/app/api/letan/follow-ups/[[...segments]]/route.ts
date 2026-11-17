import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { prisma } from '@/infrastructure/database/prisma';
import { getStaffSession } from '@/server/auth/staff-session';
import { getDoctorSession } from '@/server/auth/doctor-session';
import { getPatientSession } from '@/server/auth/patient-session';
import { followUpSameOrigin } from '@/server/services/FollowUpApi';
import { FollowUpReceptionService, prismaReceptionStore, type ReceptionActor } from '@/features/follow-ups/reception/follow-up-reception.service';
import { bookingSchema, contactSchema, listSchema, rescheduleSchema } from '@/features/follow-ups/reception/follow-up-reception.schema';

export const runtime = 'nodejs';
const service = new FollowUpReceptionService(prismaReceptionStore);
type Context = { params: Promise<{ segments?: string[] }> };
const errorMap: Record<string, [number, string]> = {
  FOLLOWUP_RECEPTION_FORBIDDEN: [403, 'Bạn không có quyền quản lý lịch tái khám của lễ tân.'],
  FOLLOWUP_PLAN_UNAVAILABLE: [409, 'Kế hoạch tái khám không còn hiệu lực. Vui lòng tải lại danh sách.'],
  FOLLOWUP_PLAN_NOT_SCHEDULED: [409, 'Kế hoạch này không yêu cầu đặt lịch tái khám.'],
  FOLLOWUP_ALREADY_BOOKED: [409, 'Kế hoạch đã có lịch hẹn hoạt động. Vui lòng tải lại danh sách.'],
  FOLLOWUP_APPOINTMENT_NOT_FOUND: [404, 'Không tìm thấy lịch hẹn hoạt động để đổi lịch.'],
  FOLLOWUP_APPOINTMENT_PAST: [400, 'Thời gian hẹn phải ở tương lai.'],
  FOLLOWUP_DOCTOR_INVALID: [400, 'Bác sĩ được chọn không hợp lệ.'],
  FOLLOWUP_SERVICE_INVALID: [400, 'Dịch vụ được chọn không còn hoạt động.'],
  FOLLOWUP_ROOM_INVALID: [400, 'Phòng khám được chọn không hợp lệ.'],
  FOLLOWUP_NO_CHANGE_TO_ACK: [409, 'Không có thay đổi kế hoạch nào cần xác nhận đã xem.'],
};

async function actor(): Promise<{ actor: ReceptionActor | null; status: number }> {
  const session = await getStaffSession('letan');
  if (!session) {
    const [admin, doctor, patient] = await Promise.all([getStaffSession('admin'), getDoctorSession(), getPatientSession()]);
    return { actor: null, status: admin || doctor || patient ? 403 : 401 };
  }
  const account = await prisma.account.findFirst({ where: { id: session.accountId, status: 'ACTIVE', employee: { id: session.employeeId } },
    select: { roles: { select: { role: { select: { name: true } } } } } });
  const isReceptionist = account?.roles.some(({ role }) => role.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes('le tan'));
  return { actor: { accountId: session.accountId, employeeId: session.employeeId, role: isReceptionist ? 'RECEPTIONIST' : 'OTHER' }, status: isReceptionist ? 200 : 403 };
}

function failure(error: unknown, route: string) {
  let status = 500;
  let reasonCode = 'FOLLOWUP_RECEPTION_ERROR';
  let message = 'Không thể xử lý yêu cầu tái khám lúc này.';
  if (error instanceof ZodError) {
    const field = String(error.issues[0]?.path[0] ?? '');
    const fieldNames: Record<string, string> = { scheduledAt: 'thời gian hẹn', employeeId: 'bác sĩ', serviceId: 'dịch vụ', roomId: 'phòng khám',
      outcome: 'kết quả liên hệ', callbackAt: 'thời điểm gọi lại', note: 'ghi chú', reason: 'lý do đổi lịch',
      from: 'ngày bắt đầu', to: 'ngày kết thúc', priority: 'mức ưu tiên', page: 'trang', search: 'từ khóa tìm kiếm' };
    status = 400; reasonCode = 'FOLLOWUP_INPUT_INVALID';
    message = error.issues[0]?.message.includes('Vui lòng') || error.issues[0]?.message.includes('tối đa') || error.issues[0]?.message.includes('không hợp lệ')
      ? error.issues[0].message : `Giá trị ${fieldNames[field] ?? 'nhập vào'} không hợp lệ.`;
  } else if (error instanceof Error && error.message.startsWith('FOLLOWUP_CONFLICT:')) {
    status = 409; reasonCode = 'FOLLOWUP_CONFLICT'; message = error.message.slice('FOLLOWUP_CONFLICT:'.length);
  } else if (error instanceof Error && errorMap[error.message]) {
    reasonCode = error.message; [status, message] = errorMap[error.message];
  } else if (error && typeof error === 'object' && 'code' in error && error.code === 'P2003') {
    status = 409; reasonCode = 'FOLLOWUP_REFERENCE_CHANGED'; message = 'Dữ liệu liên kết đã thay đổi. Vui lòng tải lại và thử lại.';
  } else if (error && typeof error === 'object' && 'code' in error && error.code === 'P2034') {
    status = 409; reasonCode = 'FOLLOWUP_CONCURRENT_CHANGE'; message = 'Lịch hẹn vừa được thay đổi. Vui lòng tải lại và thử lại.';
  }
  if (process.env.FOLLOWUP_DEBUG_LOG === 'true') console.error('[follow-up-reception]', { route, status, reasonCode });
  return NextResponse.json({ success: false, code: reasonCode, error: message }, { status });
}

export async function GET(request: NextRequest, context: Context) {
  try {
    const path = (await context.params).segments ?? [];
    const access = await actor();
    if (!access.actor || access.status !== 200) return NextResponse.json({ success: false, error: access.status === 401 ? 'Vui lòng đăng nhập.' : 'Bạn không có quyền truy cập.' }, { status: access.status });
    if (path.length === 0) {
      const params = Object.fromEntries(request.nextUrl.searchParams.entries());
      return NextResponse.json({ success: true, data: await service.list(access.actor, listSchema.parse(params)) });
    }
    if (path.length === 1 && path[0] === 'options') return NextResponse.json({ success: true, data: await service.options(access.actor) });
    if (path.length === 1 && path[0] && path[0].length <= 100) return NextResponse.json({ success: true, data: await service.detail(access.actor, path[0]) });
    return NextResponse.json({ success: false, error: 'Đường dẫn không hợp lệ.' }, { status: 404 });
  } catch (error) { return failure(error, 'GET'); }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const path = (await context.params).segments ?? [];
    const access = await actor();
    if (!access.actor || access.status !== 200) return NextResponse.json({ success: false, error: access.status === 401 ? 'Vui lòng đăng nhập.' : 'Bạn không có quyền thao tác.' }, { status: access.status });
    if (!followUpSameOrigin(request)) return NextResponse.json({ success: false, error: 'Nguồn yêu cầu không hợp lệ.' }, { status: 403 });
    if (path.length !== 2 || !path[0] || path[0].length > 100) return NextResponse.json({ success: false, error: 'Đường dẫn không hợp lệ.' }, { status: 404 });
    const body = await request.json().catch(() => null);
    if (path[1] === 'contact') return NextResponse.json({ success: true, data: await service.contact(access.actor, path[0], contactSchema.parse(body)) });
    if (path[1] === 'book') return NextResponse.json({ success: true, data: await service.book(access.actor, path[0], bookingSchema.parse(body)) });
    if (path[1] === 'reschedule') return NextResponse.json({ success: true, data: await service.reschedule(access.actor, path[0], rescheduleSchema.parse(body)) });
    if (path[1] === 'ack') return NextResponse.json({ success: true, data: await service.acknowledge(access.actor, path[0]) });
    return NextResponse.json({ success: false, error: 'Đường dẫn không hợp lệ.' }, { status: 404 });
  } catch (error) { return failure(error, 'POST'); }
}
