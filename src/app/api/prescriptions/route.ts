import { NextRequest, NextResponse } from 'next/server';
import { PrismaAuthRepository } from '@/infrastructure/database/repositories/PrismaAuthRepository';
import { PrismaPrescriptionsRepository } from '@/infrastructure/database/repositories/PrismaPrescriptionsRepository';
import { PrescriptionsController } from '@/server/controllers/PrescriptionsController';
import { AuthService } from '@/server/services/AuthService';
import { PrescriptionsService } from '@/server/services/PrescriptionsService';
import {
  isDoctorDemoWriteAllowed,
  isDoctorReadEnvironment,
  isLocalDoctorTestDatabase,
  isNeonPrescriptionDemoWriter,
  isNeonPrescriptionDemoVisitAllowed,
  isNeonPrescriptionDemoWriteEnvironment,
} from '@/server/policies/DoctorDatabaseAccess';

const SESSION_COOKIE = 'clinic_session';
const controller = new PrescriptionsController(
  new PrescriptionsService(new PrismaPrescriptionsRepository()),
);
const auth = new AuthService(new PrismaAuthRepository());

function isLocalPrescriptionTestEnvironment(): boolean {
  if (process.env.PRESCRIPTION_TEST_MODE !== 'true') return false;
  return isLocalDoctorTestDatabase() || isDoctorReadEnvironment();
}

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host')?.split(',')[0].trim()
    ?? request.headers.get('host')?.split(',')[0].trim();
  const protocol = request.headers.get('x-forwarded-proto')?.split(',')[0].trim()
    ?? request.nextUrl.protocol.replace(':', '');
  if (!origin || !host || !['http', 'https'].includes(protocol)) return false;
  try {
    return new URL(origin).origin.toLowerCase() === new URL(`${protocol}://${host}`).origin.toLowerCase();
  } catch {
    return false;
  }
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}

function handleError(error: unknown) {
  const code = error instanceof Error ? error.message : '';
  if (code === 'PRESCRIPTION_ACCESS_DENIED') return json({ success: false, error: 'Bạn không có quyền thực hiện thao tác này.' }, 403);
  if (code === 'PRESCRIPTION_NOT_FOUND' || code === 'PRESCRIPTION_VISIT_FORBIDDEN') {
    return json({ success: false, error: 'Không tìm thấy đơn thuốc hoặc lượt khám trong phạm vi được phép.' }, 404);
  }
  if (code === 'PRESCRIPTION_NOT_EDITABLE') return json({ success: false, error: 'Đơn thuốc không còn ở trạng thái nháp hoặc không thuộc người kê.' }, 409);
  if (code === 'PRESCRIPTION_MEDICINE_UNAVAILABLE') return json({ success: false, error: 'Một hoặc nhiều thuốc không tồn tại hoặc đã ngừng hoạt động.' }, 400);
  if (error && typeof error === 'object' && 'issues' in error) {
    return json({ success: false, error: 'Dữ liệu kê đơn không hợp lệ.' }, 400);
  }
  return json({ success: false, error: 'Không thể xử lý yêu cầu kê đơn lúc này.' }, 500);
}

async function requireActor(request: NextRequest) {
  const productionDraftWriteMode = isNeonPrescriptionDemoWriteEnvironment();
  if (!isLocalPrescriptionTestEnvironment() && !productionDraftWriteMode) return { unavailable: true as const };
  const actor = await auth.getSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!actor) return { unavailable: false as const, unauthenticated: true as const };
  if (productionDraftWriteMode && !isNeonPrescriptionDemoWriter(actor)) {
    return { unavailable: false as const, forbidden: true as const };
  }
  return { actor, unavailable: false as const };
}

function mayWritePrescriptionForVisit(actor: NonNullable<Awaited<ReturnType<typeof auth.getSession>>>, visitId: string) {
  return isNeonPrescriptionDemoWriteEnvironment()
    ? isNeonPrescriptionDemoVisitAllowed(actor, visitId)
    : isDoctorDemoWriteAllowed(actor, visitId);
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireActor(request);
    if (session.unavailable) return json({ success: false, error: 'MED-01 chỉ bật trong database test PostgreSQL localhost.' }, 503);
    if ('unauthenticated' in session) return json({ success: false, error: 'Vui lòng đăng nhập để tiếp tục.' }, 401);
    if ('forbidden' in session) return json({ success: false, error: 'Bạn không có quyền truy cập kê đơn.' }, 403);

    const query = request.nextUrl.searchParams;
    const resource = query.get('resource');
    const q = query.get('q') ?? undefined;
    if (resource === 'visits') return json({ success: true, data: await controller.getAssignedVisits(session.actor, { q }) });
    if (resource === 'medicines') return json({ success: true, data: await controller.getMedicines(session.actor, { q }) });
    const id = query.get('id');
    if (id) return json({ success: true, data: await controller.getById(session.actor, id) });
    const data = await controller.getList(session.actor, { q });
    data.canWrite = data.canWrite && (isLocalDoctorTestDatabase() || isNeonPrescriptionDemoWriter(session.actor));
    return json({ success: true, data });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return json({ success: false, error: 'Yêu cầu không hợp lệ.' }, 403);
  try {
    const session = await requireActor(request);
    if (session.unavailable) return json({ success: false, error: 'MED-01 chỉ bật trong database test PostgreSQL localhost.' }, 503);
    if ('unauthenticated' in session) return json({ success: false, error: 'Vui lòng đăng nhập để tiếp tục.' }, 401);
    if ('forbidden' in session) return json({ success: false, error: 'Bạn không có quyền truy cập kê đơn.' }, 403);
    let input: unknown;
    try { input = await request.json(); } catch { return json({ success: false, error: 'Dữ liệu kê đơn không hợp lệ.' }, 400); }
    const visitId = input && typeof input === 'object' && 'visitId' in input && typeof input.visitId === 'string'
      ? input.visitId
      : undefined;
    if (!visitId || !mayWritePrescriptionForVisit(session.actor, visitId)) return json({ success: false, error: 'Demo write scope denied.' }, 403);
    return json({ success: true, data: await controller.create(session.actor, input) }, 201);
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: NextRequest) {
  if (!sameOrigin(request)) return json({ success: false, error: 'Yêu cầu không hợp lệ.' }, 403);
  try {
    const session = await requireActor(request);
    if (session.unavailable) return json({ success: false, error: 'MED-01 chỉ bật trong database test PostgreSQL localhost.' }, 503);
    if ('unauthenticated' in session) return json({ success: false, error: 'Vui lòng đăng nhập để tiếp tục.' }, 401);
    if ('forbidden' in session) return json({ success: false, error: 'Bạn không có quyền truy cập kê đơn.' }, 403);
    const id = request.nextUrl.searchParams.get('id');
    if (!id || id.length > 100) return json({ success: false, error: 'Mã đơn thuốc không hợp lệ.' }, 400);
    let input: unknown;
    try { input = await request.json(); } catch { return json({ success: false, error: 'Dữ liệu kê đơn không hợp lệ.' }, 400); }
    const existing = await controller.getById(session.actor, id);
    if (!mayWritePrescriptionForVisit(session.actor, existing.visit.id)) return json({ success: false, error: 'Demo write scope denied.' }, 403);
    return json({ success: true, data: await controller.update(session.actor, id, input) });
  } catch (error) {
    return handleError(error);
  }
}
