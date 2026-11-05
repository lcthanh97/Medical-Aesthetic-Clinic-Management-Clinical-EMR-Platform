import React from 'react';
import PatientAllergiesAndHistory from '@/features/reception/components/PatientAllergiesAndHistory';

export default async function LetanPatientAllergiesPage({
  params
}: {
  params: Promise<{ patientId: string }>
}) {
  const resolvedParams = await params;
  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mb-2">
            📋 Phân hệ Lễ tân
          </span>
          <h1 className="text-2xl font-bold text-gray-900">Hồ sơ sức khỏe & Dị ứng của bệnh nhân</h1>
          <p className="text-gray-500 mt-1">Quản lý các thông tin tiền sử bệnh lý và dị ứng trước khi vào khám</p>
        </div>
      </div>
      
      <PatientAllergiesAndHistory patientId={resolvedParams.patientId} />
    </div>
  );
}
