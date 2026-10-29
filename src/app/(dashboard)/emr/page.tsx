import { redirect } from 'next/navigation';

export default async function EmrRedirectPage({ searchParams }: { searchParams: Promise<{ patientId?: string }> }) {
  const resolved = await searchParams;
  if (resolved.patientId) {
    redirect(`/bacsi/emr?patientId=${resolved.patientId}`);
  }
  redirect('/bacsi/emr');
}
