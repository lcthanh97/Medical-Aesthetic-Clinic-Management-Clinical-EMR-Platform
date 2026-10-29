import { redirect } from 'next/navigation';

export default async function PatientAllergiesPage({
  params
}: {
  params: Promise<{ patientId: string }>
}) {
  const resolvedParams = await params;
  redirect(`/letan/reception/patients/${resolvedParams.patientId}/allergies`);
}

