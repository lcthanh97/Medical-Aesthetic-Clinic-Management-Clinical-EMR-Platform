import { ReceptionPanel } from '@/features/reception';

export default function LetanReceptionPage() {
  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mb-2">
            📋 Phân hệ Lễ tân / Tiếp đón
          </span>
          <h1 className="text-2xl font-bold text-gray-900">Tiếp đón & Danh sách chờ khám</h1>
          <p className="text-sm text-gray-500">Tiếp đón bệnh nhân đến khám, check-in tạo lượt khám và kiểm tra tiền sử dị ứng</p>
        </div>
      </div>
      <ReceptionPanel />
    </main>
  );
}
