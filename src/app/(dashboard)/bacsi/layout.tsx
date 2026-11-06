import { redirect } from 'next/navigation';
import { getDoctorSession } from '@/server/auth/doctor-session';

export default async function DoctorLayout({ children }: { children: React.ReactNode }) {
  const session = await getDoctorSession();
  if (!session) redirect('/dang-nhap/bac-si?next=/bacsi');
  return children;
}
