import { ConsentsPanel } from '@/features/consents';

export default function LetanConsentsPage() {
  return (
    <main className="space-y-4">
      <div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mb-2">
          📋 Phân hệ Lễ tân & Hồ sơ
        </span>
        <h1 className="text-2xl font-bold text-gray-900">Biểu mẫu & Cam kết điều trị</h1>
        <p className="text-sm text-gray-500">Ký giấy đồng thuận thực hiện thủ thuật xâm lấn, laser và liệu trình thẩm mỹ</p>
      </div>
      <ConsentsPanel />
    </main>
  );
}
