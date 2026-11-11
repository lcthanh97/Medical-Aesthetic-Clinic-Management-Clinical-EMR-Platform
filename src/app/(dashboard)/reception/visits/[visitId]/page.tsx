import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface VisitDetailPageProps {
  params: Promise<{ visitId: string }>;
}

export default async function ReceptionVisitDetailRedirect({ params }: VisitDetailPageProps) {
  const { visitId } = await params;
  redirect(`/letan/reception/visits/${visitId}`);
}
