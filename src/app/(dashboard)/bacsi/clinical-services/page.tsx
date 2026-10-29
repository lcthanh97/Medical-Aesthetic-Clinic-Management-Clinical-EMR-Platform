import { ClinicalServicesPanel } from '@/features/clinical-services';

export default function BacSiClinicalServicesPage() {
  return (
    <main className="space-y-4">
      <div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 mb-2">
          🩺 Phân hệ Bác sĩ Điều trị
        </span>
        <h1 className="text-2xl font-bold text-gray-900">Dịch vụ lâm sàng & Cận lâm sàng</h1>
        <p className="text-sm text-gray-500">Chỉ định khám chuyên khoa, xét nghiệm vi sinh da, soi da và các dịch vụ laser, thẩm mỹ</p>
      </div>
      <ClinicalServicesPanel />
    </main>
  );
}
