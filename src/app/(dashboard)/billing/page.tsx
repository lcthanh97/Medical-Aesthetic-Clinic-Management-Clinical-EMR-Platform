import { redirect } from 'next/navigation';

export default async function BillingLegacyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const queryString = new URLSearchParams();

  if (params) {
    for (const [key, val] of Object.entries(params)) {
      if (typeof val === 'string') {
        queryString.set(key, val);
      } else if (Array.isArray(val)) {
        val.forEach((v) => queryString.append(key, v));
      }
    }
  }

  const qs = queryString.toString();
  redirect(`/letan/billing${qs ? `?${qs}` : ''}`);
}
