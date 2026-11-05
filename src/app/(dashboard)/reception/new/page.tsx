import Link from 'next/link';
import { PatientForm } from '@/features/reception';

export const metadata = {
  title: 'Tiếp nhận bệnh nhân mới | DERMACARE',
  description: 'Tạo mới hồ sơ bệnh nhân trong hệ thống phòng khám.',
};

export default function NewPatientPage() {
  return (
    <div className="min-h-screen bg-[#f4f8fd] py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/reception" className="hover:text-[#0e3a78]">
            Hồ sơ bệnh nhân
          </Link>
          <span>/</span>
          <span className="font-semibold text-[#0e3a78]">Tiếp nhận mới</span>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0e3a78] tracking-tight">
            Tiếp nhận bệnh nhân mới
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Tạo lập hồ sơ ban đầu, ghi nhận cảnh báo dị ứng và tiền sử điều trị của khách hàng.
          </p>
        </div>

        <PatientForm />
      </div>
    </div>
  );
}

