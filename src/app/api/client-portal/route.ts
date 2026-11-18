import { NextRequest, NextResponse } from 'next/server'
import { getClientPortalData } from '@/features/client-portal/server/getClientPortalData'
import { getPatientSession } from '@/server/auth/patient-session'

export async function GET(request: NextRequest) {
  const session = await getPatientSession()
  if (!session) return NextResponse.json({ success: false, message: 'Yêu cầu đăng nhập khách hàng.' }, { status: 401 })
  const requestedId = request.nextUrl.searchParams.get('patientId')?.trim()
  if (requestedId && requestedId !== session.patientId) {
    return NextResponse.json({ success: false, message: 'Không có quyền xem hồ sơ này.' }, { status: 403 })
  }
  try {
    const data = await getClientPortalData(session.patientId)
    return NextResponse.json({ success: true, data }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ success: false, message: 'Không thể tải cổng khách hàng.' }, { status: 500 })
  }
}
