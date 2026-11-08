import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function ReceptionNewRedirect() {
  redirect('/letan/reception/new');
}
