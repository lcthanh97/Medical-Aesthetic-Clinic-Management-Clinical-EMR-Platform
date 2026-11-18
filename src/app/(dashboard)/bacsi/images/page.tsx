import { redirect } from 'next/navigation';
import { getDoctorSession } from '@/server/auth/doctor-session';
import { TreatmentImageWorkspace } from '@/features/emr/components/TreatmentImageWorkspace';

export const dynamic = 'force-dynamic';

export default async function DoctorImagesPage({ searchParams }: { searchParams: Promise<{ visitId?: string }> }) {
  if (!await getDoctorSession()) redirect('/bacsi/dang-nhap');
  const params = await searchParams;
  return <TreatmentImageWorkspace initialVisitId={params.visitId ?? ''} />;
}
