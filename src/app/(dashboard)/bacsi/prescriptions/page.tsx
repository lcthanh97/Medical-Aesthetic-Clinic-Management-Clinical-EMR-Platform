import { PrescriptionsPanel } from '@/features/prescriptions';

export default function BacSiPrescriptionsPage() {
  return (
    <main className="space-y-4">
      <div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 mb-2">
          🩺 Phân hệ Bác sĩ Điều trị
        </span>
        <h1 className="text-2xl font-bold text-gray-900">Kê đơn thuốc điện tử</h1>
        <p className="text-sm text-gray-500">Kê đơn thuốc uống, thuốc bôi đặc trị da liễu và hướng dẫn liều dùng cho bệnh nhân</p>
      </div>
      <PrescriptionsPanel />
    </main>
  );
}
