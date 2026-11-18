import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession } from '@/server/auth/staff-session'
import { proxyToFastApi } from '@/lib/derma-ai/backendBridge'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getStaffSession('admin')) return NextResponse.json({ detail: 'Yêu cầu quyền quản trị.' }, { status: 401 });
  const { id } = await params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ detail: 'Mã bản ghi không hợp lệ.' }, { status: 400 });
  return await proxyToFastApi(request, `/api/diseases/${id}`) ??
    NextResponse.json({ detail: 'Kho tri thức hiện chưa kết nối.' }, { status: 503 });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getStaffSession('admin')) return NextResponse.json({ detail: 'Yêu cầu quyền quản trị.' }, { status: 401 });
  const { id } = await params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ detail: 'Mã bản ghi không hợp lệ.' }, { status: 400 });
  return await proxyToFastApi(request, `/api/diseases/${id}`) ??
    NextResponse.json({ detail: 'Kho tri thức hiện chưa kết nối.' }, { status: 503 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getStaffSession('admin')) return NextResponse.json({ detail: 'Yêu cầu quyền quản trị.' }, { status: 401 });
  const { id } = await params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ detail: 'Mã bản ghi không hợp lệ.' }, { status: 400 });
  return await proxyToFastApi(request, `/api/diseases/${id}`) ??
    NextResponse.json({ detail: 'Kho tri thức hiện chưa kết nối.' }, { status: 503 });
}
