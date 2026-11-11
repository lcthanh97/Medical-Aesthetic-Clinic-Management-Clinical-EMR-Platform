import { BillingPanel } from '@/features/billing';
import { Suspense } from 'react';

export default function LetanBillingPage() {
  return (
    <main className="space-y-4 max-w-[1180px] mx-auto text-[#20334b]">
      <header className="border-b border-[#e1e9f2] pb-3">
        <h1 className="text-[25px] font-bold text-[#20334b]">Thanh toán & Hóa đơn viện phí</h1>
        <p className="mt-1 text-[12px] text-[#6c7e93]">
          Quản lý thu ngân, xuất hóa đơn dịch vụ lâm sàng và thanh toán đơn thuốc
        </p>
      </header>
      <Suspense fallback={<div className="p-4 text-xs text-[#6c7e93]">Đang tải dữ liệu viện phí...</div>}>
        <BillingPanel />
      </Suspense>
    </main>
  );
}
