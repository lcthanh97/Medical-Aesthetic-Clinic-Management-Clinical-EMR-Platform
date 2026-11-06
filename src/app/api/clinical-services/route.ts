import { NextRequest, NextResponse } from 'next/server';
import { PrismaAuthRepository } from '@/infrastructure/database/repositories/PrismaAuthRepository';
import { PrismaClinicalServicesRepository } from '@/infrastructure/database/repositories/PrismaClinicalServicesRepository';
import { ClinicalServicesController } from '@/server/controllers/ClinicalServicesController';
import { AuthService } from '@/server/services/AuthService';
import { ClinicalServicesService } from '@/server/services/ClinicalServicesService';
import { isDoctorReadEnvironment } from '@/server/policies/DoctorDatabaseAccess';

const SESSION_COOKIE = 'clinic_session';
const controller = new ClinicalServicesController(
  new ClinicalServicesService(new PrismaClinicalServicesRepository()),
);
const auth = new AuthService(new PrismaAuthRepository());

function isLocalClsTestEnvironment(): boolean {
  const testModeEnabled = process.env.CLS03_TEST_MODE === 'true' || process.env.PRESCRIPTION_TEST_MODE === 'true';
  if (process.env.NODE_ENV === 'production' || !testModeEnabled) return false;
  try {
    const database = new URL(process.env.DATABASE_URL ?? '');
    return ['127.0.0.1', 'localhost'].includes(database.hostname) &&
      database.port === '55432' && database.pathname === '/emr_test';
  } catch {
    return false;
  }
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
  if (code === 'IMAGING_ACCESS_DENIED') return json({ success: false, error: 'Bạn không có quyền thực hiện thao tác hình ảnh cận lâm sàng.' }, 403);
  if (code === 'CLINICAL_ORDER_NOT_FOUND' || code === 'IMAGING_RESULT_NOT_FOUND') {
    return json({ success: false, error: 'Không tìm thấy chỉ định hoặc kết quả trong phạm vi được phép.' }, 404);
  }
  if (code === 'IMAGING_ORDER_TYPE_STATUS_UNVERIFIED') {
    return json({ success: false, error: 'Chưa cấu hình loại/trạng thái chỉ định được phép ghi kết quả.' }, 409);
  }
  if (error && typeof error === 'object' && 'issues' in error) {
    return json({ success: false, error: 'Dữ liệu kết quả hình ảnh không hợp lệ.' }, 400);
  }
  return json({ success: false, error: 'Không thể xử lý yêu cầu hình ảnh cận lâm sàng lúc này.' }, 500);
}

async function requireActor(request: NextRequest, mode: 'read' | 'write') {
  const allowed = mode === 'read' ? isDoctorReadEnvironment() : isLocalClsTestEnvironment();
  if (!allowed) return { unavailable: true as const };
  const actor = await auth.getSession(request.cookies.get(SESSION_COOKIE)?.value);
  return actor ? { actor, unavailable: false as const } : { unavailable: false as const, unauthenticated: true as const };
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireActor(request, 'read');
    if (session.unavailable) return json({ success: false, error: 'CLS-03 đọc cần môi trường Neon đã xác minh và được bật.' }, 503);
    if ('unauthenticated' in session) return json({ success: false, error: 'Vui lòng đăng nhập để tiếp tục.' }, 401);

    const query = request.nextUrl.searchParams;
    const orderId = query.get('orderId');
    if (orderId) return json({ success: true, data: await controller.getImagingOrder(session.actor, orderId) });
    return json({ success: true, data: await controller.getImagingOrders(session.actor, { q: query.get('q') ?? undefined }) });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return json({ success: false, error: 'Yêu cầu không hợp lệ.' }, 403);
  try {
    const session = await requireActor(request, 'write');
    if (session.unavailable) return json({ success: false, error: 'Ghi CLS-03 chỉ được phép trên database test cô lập.' }, 503);
    if ('unauthenticated' in session) return json({ success: false, error: 'Vui lòng đăng nhập để tiếp tục.' }, 401);
    let input: unknown;
    try { input = await request.json(); } catch { return json({ success: false, error: 'Dữ liệu kết quả hình ảnh không hợp lệ.' }, 400); }
    return json({ success: true, data: await controller.createImagingResult(session.actor, input) }, 201);
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: NextRequest) {
  if (!sameOrigin(request)) return json({ success: false, error: 'Yêu cầu không hợp lệ.' }, 403);
  try {
    const session = await requireActor(request, 'write');
    if (session.unavailable) return json({ success: false, error: 'Ghi CLS-03 chỉ được phép trên database test cô lập.' }, 503);
    if ('unauthenticated' in session) return json({ success: false, error: 'Vui lòng đăng nhập để tiếp tục.' }, 401);
    let input: unknown;
    try { input = await request.json(); } catch { return json({ success: false, error: 'Dữ liệu kết quả hình ảnh không hợp lệ.' }, 400); }
    return json({ success: true, data: await controller.updateImagingResult(session.actor, input) });
  } catch (error) {
    return handleError(error);
  }
}
