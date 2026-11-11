'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';
import type { PatientDetail } from '../types/reception.types';

interface PatientDetailViewProps {
  patient: PatientDetail;
}

export function PatientDetailView({ patient }: PatientDetailViewProps) {
  const calculateAge = (dobString?: string | null) => {
    if (!dobString) return null;
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return null;
    const diffMs = Date.now() - dob.getTime();
    const ageDt = new Date(diffMs);
    return Math.abs(ageDt.getUTCFullYear() - 1970);
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'Chưa cập nhật';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Chưa cập nhật';
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const age = calculateAge(patient.dateOfBirth);

  return (
    <div className="space-y-6">
      {/* Top Patient Hero Card */}
      <div className="rounded-3xl border border-[#e2ebf5] bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-[#0e3a78] text-white flex items-center justify-center font-bold text-2xl sm:text-3xl shadow-sm uppercase">
              {patient.fullName.slice(0, 1)}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="rounded-lg bg-[#e8f1fc] px-2.5 py-1 text-xs font-bold text-[#0e3a78]">
                  {patient.patientCode}
                </span>
                <span className="rounded-full bg-[#e6f9f0] px-2.5 py-0.5 text-xs font-semibold text-[#059669]">
                  Đang điều trị
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0e3a78]">
                {patient.fullName}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-500">
                <span>
                  Ngày sinh: <strong className="text-slate-700">{formatDate(patient.dateOfBirth)}</strong>
                  {age !== null && ` (${age} tuổi)`}
                </span>
                <span>•</span>
                <span>
                  Số điện thoại: <strong className="text-slate-700">{patient.phone || 'Chưa cập nhật'}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/letan/reception">
              <Button variant="secondary">
                ← Danh sách
              </Button>
            </Link>
            <Link href={`/letan/reception/${patient.id}/edit`}>
              <Button variant="primary">
                Chỉnh sửa hồ sơ
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Column (Allergies & Medical History) | Right Column (Visits History) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Allergies Card */}
          <div className="rounded-2xl border border-[#e2ebf5] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-[#e2ebf5] pb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#0e3a78]">Cảnh báo Dị ứng</h2>
              </div>
              <span className="rounded-full bg-[#f8fafc] px-3 py-1 text-xs font-semibold text-slate-600 border border-[#e2ebf5]">
                {patient.allergies.length} dị nguyên
              </span>
            </div>

            {patient.allergies.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Không có ghi nhận dị ứng thuốc hoặc mỹ phẩm.</p>
            ) : (
              <div className="space-y-3">
                {patient.allergies.map((allergy, idx) => {
                  const isSevere = allergy.severity?.includes('Nặng');
                  const badgeColor = isSevere
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200';

                  return (
                    <div
                      key={allergy.id || idx}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl border border-[#e2ebf5] bg-[#f8fafc]"
                    >
                      <div>
                        <div className="font-bold text-sm text-slate-800">
                          {allergy.substance}
                        </div>
                        {allergy.reaction && (
                          <div className="text-xs text-slate-500 mt-0.5">
                            Biểu hiện: {allergy.reaction}
                          </div>
                        )}
                      </div>
                      <div>
                        <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-lg border ${badgeColor}`}>
                          Mức độ: {allergy.severity || 'Nhẹ'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Medical History Card */}
          <div className="rounded-2xl border border-[#e2ebf5] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-[#e2ebf5] pb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#0e3a78]">Tiền sử y khoa</h2>
              </div>
              <span className="rounded-full bg-[#f8fafc] px-3 py-1 text-xs font-semibold text-slate-600 border border-[#e2ebf5]">
                {patient.histories.length} mục
              </span>
            </div>

            {patient.histories.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Chưa có thông tin tiền sử bệnh lý được lưu trữ.</p>
            ) : (
              <div className="divide-y divide-[#e2ebf5]">
                {patient.histories.map((h, idx) => (
                  <div key={h.id || idx} className="py-3 first:pt-0 last:pb-0">
                    <span className="inline-block rounded-md bg-[#e8f1fc] px-2 py-0.5 text-xs font-semibold text-[#0e3a78] mb-1">
                      {h.type}
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {h.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Visits History */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#e2ebf5] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-[#e2ebf5] pb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#0e3a78]">Lịch sử khám</h2>
              </div>
              <span className="rounded-full bg-[#e8f1fc] px-2.5 py-0.5 text-xs font-bold text-[#0e3a78]">
                {patient.visits.length}
              </span>
            </div>

            {patient.visits.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs text-slate-400">Bệnh nhân chưa có lượt khám nào.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {patient.visits.map((visit) => (
                  <div
                    key={visit.id}
                    className="p-3 bg-[#f8fafc] border border-[#e2ebf5] rounded-xl text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">
                        {formatDate(visit.visitDate)}
                      </span>
                      <span className="rounded bg-[#e6f9f0] px-2 py-0.5 text-[10px] font-bold text-[#059669]">
                        {visit.status}
                      </span>
                    </div>
                    {visit.roomId && (
                      <div className="text-slate-500">Phòng: {visit.roomId}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

