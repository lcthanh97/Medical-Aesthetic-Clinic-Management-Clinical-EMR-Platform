import { NextRequest, NextResponse } from 'next/server';
import { PrismaAuthRepository } from '@/infrastructure/database/repositories/PrismaAuthRepository';
import { PrismaNotificationsRepository } from '@/infrastructure/database/repositories/PrismaNotificationsRepository';
import { NotificationsController } from '@/server/controllers/NotificationsController';
import { AuthService } from '@/server/services/AuthService';
import { NotificationsService } from '@/server/services/NotificationsService';

const SESSION_COOKIE = 'clinic_session';
const controller = new NotificationsController(
  new NotificationsService(new PrismaNotificationsRepository()),
);
const auth = new AuthService(new PrismaAuthRepository());

function isLocalNotificationTestEnvironment(): boolean {
  if (process.env.NODE_ENV === 'production' || process.env.NOTIFICATIONS_TEST_MODE !== 'true') return false;
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
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}

function handleError(error: unknown) {
  const code = error instanceof Error ? error.message : '';
  if (code === 'NOTIFICATION_ACCESS_DENIED') {
    return json({ success: false, error: 'Bạn không có quyền xem thông báo trong phạm vi được phép.' }, 403);
  }
  if (code === 'NOTIFICATION_NOT_FOUND') {
    return json({ success: false, error: 'Không tìm thấy thông báo trong phạm vi được phép.' }, 404);
  }
  if (error && typeof error === 'object' && 'issues' in error) {
    return json({ success: false, error: 'Bộ lọc thông báo không hợp lệ.' }, 400);
  }
  return json({ success: false, error: 'Không thể tải thông báo lúc này.' }, 500);
}

export async function GET(request: NextRequest) {
  if (!isLocalNotificationTestEnvironment()) {
    return json({ success: false, error: 'Notification chỉ được bật trên PostgreSQL test localhost.' }, 503);
  }

  try {
    const actor = await auth.getSession(request.cookies.get(SESSION_COOKIE)?.value);
    if (!actor) return json({ success: false, error: 'Vui lòng đăng nhập để tiếp tục.' }, 401);

    const query = request.nextUrl.searchParams;
    const id = query.get('id');
    if (id !== null) return json({ success: true, data: await controller.getById(actor, id) });

    const pageValue = query.get('page');
    const page = pageValue === null ? 0 : Number(pageValue);
    return json({
      success: true,
      data: await controller.getList(actor, {
        ...(query.has('type') ? { type: query.get('type') } : {}),
        ...(query.has('status') ? { status: query.get('status') } : {}),
        page,
      }),
    });
  } catch (error) {
    return handleError(error);
  }
}
