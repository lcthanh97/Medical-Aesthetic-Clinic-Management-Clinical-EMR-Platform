import { NextRequest, NextResponse } from 'next/server';
import { PrismaAuthRepository } from '@/infrastructure/database/repositories/PrismaAuthRepository';
import { AuthService } from '@/server/services/AuthService';

const SESSION_COOKIE = 'clinic_session';
const auth = new AuthService(new PrismaAuthRepository());

function previewRequestAllowed(request: NextRequest): boolean {
  if (process.env.NODE_ENV === 'production' || !['development', 'test'].includes(process.env.NODE_ENV ?? '') ||
    process.env.DOCTOR_PREVIEW_MODE !== 'true' || process.env.DOCTOR_PREVIEW_BIND_HOST !== '127.0.0.1') return false;
  const host = request.headers.get('host')?.toLowerCase();
  if (!host || !/^127\.0\.0\.1:\d{1,5}$/.test(host)) return false;
  try {
    const database = new URL(process.env.DATABASE_URL ?? '');
    return ['127.0.0.1', 'localhost', '::1'].includes(database.hostname) &&
      database.port === '55432' && database.pathname === '/emr_test';
  } catch {
    return false;
  }
}

function sameLocalOrigin(request: NextRequest): boolean {
  const host = request.headers.get('host');
  const site = request.headers.get('sec-fetch-site');
  if (!host || (site && site !== 'same-origin' && site !== 'none')) return false;
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).origin === `http://${host}`;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!previewRequestAllowed(request)) return NextResponse.json({ success: false }, { status: 404 });
  if (!sameLocalOrigin(request)) return NextResponse.json({ success: false }, { status: 403 });

  const returnTo = request.nextUrl.searchParams.get('returnTo') ?? '/bacsi';
  const target = returnTo.startsWith('/bacsi') && !returnTo.startsWith('//') ? returnTo : '/bacsi';
  const existingToken = request.cookies.get(SESSION_COOKIE)?.value;
  if (existingToken) {
    try {
      if (await auth.getSession(existingToken)) return NextResponse.redirect(new URL(target, `http://${request.headers.get('host')}`));
    } catch {
      return NextResponse.json({ success: false, error: 'Local preview session unavailable.' }, { status: 503 });
    }
  }

  const accountId = process.env.DOCTOR_PREVIEW_ACCOUNT_ID;
  if (!accountId) return NextResponse.json({ success: false, error: 'Local preview account is not configured.' }, { status: 503 });
  try {
    const result = await auth.createLocalPreviewSession(accountId);
    if (result.kind !== 'authenticated') return NextResponse.json({ success: false, error: 'Local preview account is unavailable.' }, { status: 503 });
    const response = NextResponse.redirect(new URL(target, `http://${request.headers.get('host')}`));
    response.headers.set('Cache-Control', 'no-store');
    response.cookies.set(SESSION_COOKIE, result.token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60,
    });
    return response;
  } catch {
    return NextResponse.json({ success: false, error: 'Local preview session unavailable.' }, { status: 503 });
  }
}
