import { BillingPanel } from '@/features/billing';

export default function LetanBillingPage() {
  return (
    <main className="space-y-4">
      <div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mb-2">
          📋 Phân hệ Lễ tân / Thu ngân
        </span>
        <h1 className="text-2xl font-bold text-gray-900">Thanh toán & Hóa đơn viện phí</h1>
        <p className="text-sm text-gray-500">Quản lý thu ngân, xuất hóa đơn dịch vụ lâm sàng và thanh toán đơn thuốc</p>
      </div>
      <BillingPanel />
    </main>
  );
}
