'use client';

import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';

export function VisitSelector({ 
  visits, 
  currentVisitId 
}: { 
  visits: any[], 
  currentVisitId: string 
}) {
  const router = useRouter();

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex items-center gap-4">
      <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
        <Users size={20} />
      </div>
      <div className="flex-1">
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Chọn bệnh nhân / Lượt khám
        </label>
        <select 
          value={currentVisitId}
          onChange={(e) => {
            if (e.target.value) {
              router.push(`/bacsi/treatments?visitId=${encodeURIComponent(e.target.value)}`);
            }
          }}
          className="w-full max-w-md rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border outline-none text-sm text-gray-800 bg-gray-50 hover:bg-white transition-colors cursor-pointer"
        >
          <option value="">{visits.length ? 'Chọn Visit được phân công' : 'Không có Visit nào được phân công'}</option>
          {visits.map(visit => (
            <option key={visit.id} value={visit.id}>
              {visit.patient.fullName} - {visit.patient.patientCode} ({new Date(visit.visitDate).toLocaleDateString('vi-VN')})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
