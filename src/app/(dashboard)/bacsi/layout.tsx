import { redirect } from 'next/navigation';
import { getDoctorSession } from '@/server/auth/doctor-session';

export const dynamic = 'force-dynamic';

export default async function DoctorLayout({ children }: { children: React.ReactNode }) {
  const session = await getDoctorSession();
  if (!session) redirect('/bacsi/dang-nhap');
  return children;
}
