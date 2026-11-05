import { redirect } from 'next/navigation';

export default async function TreatmentsRedirectPage({ searchParams }: { searchParams: Promise<{ visitId?: string }> }) {
  const resolved = await searchParams;
  if (resolved.visitId) {
    redirect(`/bacsi/treatments?visitId=${resolved.visitId}`);
  }
  redirect('/bacsi/treatments');
}
