import { NextResponse } from 'next/server';
import prisma from '@/infrastructure/database/prisma';
import { getDoctorSession } from '@/server/auth/doctor-session';
import { getTreatmentImageUrl, isStoredTreatmentImage } from '@/server/storage/neon-object-storage';

function isDoctorRole(name: string) {
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return normalized.includes('bac si') || normalized.includes('doctor');
}

export async function GET(_request: Request, { params }: { params: Promise<{ imageId: string }> }) {
  try {
    const session = await getDoctorSession();
    if (!session) return NextResponse.json({ error: 'Phiên bác sĩ không hợp lệ.' }, { status: 401 });
    const account = await prisma.account.findFirst({
      where: { id: session.accountId, status: 'ACTIVE', employee: { id: session.employeeId } },
      include: { roles: { include: { role: true } } },
    });
    if (!account?.roles.some(({ role }) => isDoctorRole(role.name))) return NextResponse.json({ error: 'Không có quyền xem ảnh lâm sàng.' }, { status: 403 });
    const { imageId } = await params;
    const image = await prisma.treatmentImage.findFirst({
      where: { id: imageId, visit: { employeeId: session.employeeId } },
      select: { imageUrl: true },
    });
    if (!image) return NextResponse.json({ error: 'Ảnh không thuộc Visit được phân công cho bác sĩ.' }, { status: 404 });
    if (!isStoredTreatmentImage(image.imageUrl)) return NextResponse.redirect(image.imageUrl);
    const signedUrl = await getTreatmentImageUrl(image.imageUrl);
    return NextResponse.redirect(signedUrl, { headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể mở ảnh theo dõi.' }, { status: 500 });
  }
}
