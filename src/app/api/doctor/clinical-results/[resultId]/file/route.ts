import { NextResponse } from 'next/server';
import prisma from '@/infrastructure/database/prisma';
import { getDoctorSession } from '@/server/auth/doctor-session';
import { getTreatmentImageUrl, isStoredClinicalObject } from '@/server/storage/neon-object-storage';

function isDoctorRole(name: string) {
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return normalized.includes('bac si') || normalized.includes('doctor');
}

export async function GET(_request: Request, { params }: { params: Promise<{ resultId: string }> }) {
  try {
    const session = await getDoctorSession();
    if (!session) return NextResponse.json({ error: 'Phiên bác sĩ không hợp lệ.' }, { status: 401 });
    const account = await prisma.account.findFirst({
      where: { id: session.accountId, status: 'ACTIVE', employee: { id: session.employeeId } },
      include: { roles: { include: { role: true } } },
    });
    if (!account?.roles.some(({ role }) => isDoctorRole(role.name))) return NextResponse.json({ error: 'Không có quyền xem tệp kết quả.' }, { status: 403 });
    const { resultId } = await params;
    const result = await prisma.imagingResult.findFirst({
      where: { id: resultId, order: { visit: { employeeId: session.employeeId } } },
      select: { fileUrl: true },
    });
    if (!result?.fileUrl || !isStoredClinicalObject(result.fileUrl) || !result.fileUrl.startsWith('cls-results/')) {
      return NextResponse.json({ error: 'Tệp kết quả không thuộc lượt khám được phân công.' }, { status: 404 });
    }
    const signedUrl = await getTreatmentImageUrl(result.fileUrl);
    return NextResponse.redirect(signedUrl, { headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể mở tệp kết quả.' }, { status: 500 });
  }
}
