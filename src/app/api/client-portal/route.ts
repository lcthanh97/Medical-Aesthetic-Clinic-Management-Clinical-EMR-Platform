import { NextRequest, NextResponse } from 'next/server'
import { getClientPortalData } from '@/features/client-portal/server/getClientPortalData'

export async function GET(request: NextRequest) {
  try {
    const patientId = request.nextUrl.searchParams.get('patientId')?.trim() || undefined
    const data = await getClientPortalData(patientId)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Không thể tải cổng khách hàng.' }, { status: 500 })
  }
}
