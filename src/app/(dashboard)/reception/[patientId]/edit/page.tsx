import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ReceptionPatientEditRedirect(props: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await props.params;
  redirect(`/letan/reception/${patientId}/edit`);
}
