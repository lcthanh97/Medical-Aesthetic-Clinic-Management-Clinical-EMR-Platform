import { NextRequest, NextResponse } from 'next/server';
import { PrismaAuthRepository } from '@/infrastructure/database/repositories/PrismaAuthRepository';
import { AuthController } from '@/server/controllers/AuthController';
import { AuthConfigurationError, AuthService } from '@/server/services/AuthService';
import { AuthLoginSchema } from '@/features/auth/schemas/auth.schema';

const SESSION_COOKIE = 'clinic_session';
const ABSOLUTE_SESSION_SECONDS = 8 * 60 * 60;
const controller = new AuthController(new AuthService(new PrismaAuthRepository()));

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const requestHost = request.headers.get('x-forwarded-host')?.split(',')[0].trim()
    ?? request.headers.get('host')?.split(',')[0].trim();
  const requestProtocol = request.headers.get('x-forwarded-proto')?.split(',')[0].trim()
    ?? request.nextUrl.protocol.replace(':', '');
  if (!origin || !requestHost || !['http', 'https'].includes(requestProtocol)) return false;
  try {
    return new URL(origin).origin.toLowerCase() === new URL(`${requestProtocol}://${requestHost}`).origin.toLowerCase();
  } catch {
    return false;
  }
}

function sessionCookieOptions(request: NextRequest) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || request.nextUrl.protocol === 'https:',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: ABSOLUTE_SESSION_SECONDS,
  };
}

function publicUser(actor: NonNullable<Awaited<ReturnType<AuthController['getSession']>>>) {
  return { username: actor.username, employeeName: actor.employeeName, roleNames: actor.roleNames };
}

function unavailable() {
  return NextResponse.json(
    { success: false, error: 'Dịch vụ xác thực hiện chưa sẵn sàng.' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function GET(request: NextRequest) {
  try {
    const actor = await controller.getSession(request.cookies.get(SESSION_COOKIE)?.value);
    return NextResponse.json(
      { success: true, user: actor ? publicUser(actor) : null },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return unavailable();
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ success: false, error: 'Yêu cầu không hợp lệ.' }, { status: 403 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Thông tin đăng nhập không hợp lệ.' }, { status: 400 });
  }

  const parsed = AuthLoginSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Thông tin đăng nhập không hợp lệ.' }, { status: 400 });
  }

  try {
    const result = await controller.login(parsed.data.username, parsed.data.password);
    if (result.kind === 'invalid') {
      return NextResponse.json({ success: false, error: 'Tên đăng nhập hoặc mật khẩu không đúng.' }, { status: 401 });
    }
    if (result.kind === 'rate-limited') {
      return NextResponse.json(
        { success: false, error: 'Không thể đăng nhập lúc này. Vui lòng thử lại sau.' },
        { status: 429, headers: { 'Retry-After': '900' } },
      );
    }

    await controller.logout(request.cookies.get(SESSION_COOKIE)?.value);
    const response = NextResponse.json(
      { success: true, user: publicUser(result.actor) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
    response.cookies.set(SESSION_COOKIE, result.token, sessionCookieOptions(request));
    return response;
  } catch (error) {
    if (error instanceof AuthConfigurationError) return unavailable();
    return unavailable();
  }
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ success: false, error: 'Yêu cầu không hợp lệ.' }, { status: 403 });
  }

  try {
    await controller.logout(request.cookies.get(SESSION_COOKIE)?.value);
    const response = NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions(request), maxAge: 0 });
    return response;
  } catch {
    return unavailable();
  }
}
