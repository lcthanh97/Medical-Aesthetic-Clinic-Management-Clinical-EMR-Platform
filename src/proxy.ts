import { NextRequest, NextResponse } from 'next/server';

function previewEnabledForRequest(request: NextRequest): boolean {
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

export function proxy(request: NextRequest) {
  if (!previewEnabledForRequest(request) || request.cookies.has('clinic_session')) return NextResponse.next();
  const url = new URL('/api/dev/doctor-preview', `http://${request.headers.get('host')}`);
  url.searchParams.set('returnTo', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(url);
}

export const config = { matcher: ['/bacsi', '/bacsi/:path*'] };
