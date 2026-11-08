import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface NewVisitPageProps {
  searchParams: Promise<{ patientId?: string }>;
}

export default async function ReceptionVisitsNewRedirect({ searchParams }: NewVisitPageProps) {
  const { patientId } = await searchParams;
  if (patientId) {
    redirect(`/letan/reception/visits/new?patientId=${encodeURIComponent(patientId)}`);
  }
  redirect('/letan/reception/visits/new');
}
