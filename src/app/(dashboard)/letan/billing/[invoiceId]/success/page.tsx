import { PaymentSuccessPanel } from '@/features/billing';

interface PageProps {
  params: Promise<{ invoiceId: string }>;
}

export default async function PaymentSuccessPage(props: PageProps) {
  const { invoiceId } = await props.params;

  return (
    <main className="space-y-4 max-w-[1180px] mx-auto text-[#20334b]">
      <PaymentSuccessPanel invoiceId={invoiceId} />
    </main>
  );
}
