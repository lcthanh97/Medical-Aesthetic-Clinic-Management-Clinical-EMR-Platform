import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession } from '@/server/auth/staff-session'
import { proxyToFastApi } from '@/lib/derma-ai/backendBridge'

export async function GET(request: NextRequest) {
  if (!await getStaffSession('admin')) return NextResponse.json({ detail: 'Yêu cầu quyền quản trị.' }, { status: 401 });
  return await proxyToFastApi(request, '/api/logs') ??
    NextResponse.json({ detail: 'Dịch vụ chưa kết nối.' }, { status: 503 });
}
