'use client';

import Link from 'next/link';
import { EmptyState, LoadingSpinner, Button } from '@/components/ui';
import type { PatientItem } from '../types/reception.types';

interface PatientTableProps {
  patients: PatientItem[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function PatientTable({
  patients,
  isLoading,
  page,
  totalPages,
  total,
  onPageChange,
}: PatientTableProps) {
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

  return (
    <div className="rounded-[9px] border border-[#dce5ef] bg-white shadow-2xs overflow-hidden">
      {isLoading ? (
        <div className="py-20 flex justify-center items-center">
          <LoadingSpinner />
        </div>
      ) : patients.length === 0 ? (
        <div className="p-8">
          <EmptyState>
            <div className="flex flex-col items-center justify-center gap-2">
              <p className="font-semibold text-[#20334b]">Chưa tìm thấy hồ sơ bệnh nhân nào</p>
              <p className="text-[12px] text-[#6c7e93]">
                Hãy thử tìm kiếm với từ khóa khác hoặc bấm nút "+ Tiếp nhận bệnh nhân" để tạo mới.
              </p>
            </div>
          </EmptyState>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px] text-[#20334b]">
              <thead className="bg-[#f5f8fc] text-[11px] font-semibold text-[#6c7e93] border-b border-[#e6edf5]">
                <tr>
                  <th scope="col" className="px-4 py-3">Mã BN</th>
                  <th scope="col" className="px-4 py-3">Họ và tên</th>
                  <th scope="col" className="px-4 py-3">Ngày sinh (Tuổi)</th>
                  <th scope="col" className="px-4 py-3">Số điện thoại</th>
                  <th scope="col" className="px-4 py-3">Cảnh báo dị ứng</th>
                  <th scope="col" className="px-4 py-3">Lượt khám</th>
                  <th scope="col" className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6edf5]">
                {patients.map((p) => {
                  const age = calculateAge(p.dateOfBirth);
                  const hasAllergies = p.allergies && p.allergies.length > 0;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-[#f8fafd] transition-colors duration-150 group cursor-pointer"
                    >
                      <td className="px-4 py-3 font-bold text-[#235f9e]">
                        <Link
                          href={`/letan/reception/${p.id}`}
                          className="hover:underline flex items-center gap-1.5"
                        >
                          <span className="rounded-[5px] bg-[#edf5ff] px-2 py-0.5 text-[11px] font-semibold text-[#235f9e]">
                            {p.patientCode}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#20334b]">
                        <Link href={`/letan/reception/${p.id}`} className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-[#edf5ff] text-[#246dce] flex items-center justify-center font-bold text-[11px] uppercase">
                            {p.fullName.slice(0, 1)}
                          </div>
                          <span>{p.fullName}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[#38536d]">
                        {formatDate(p.dateOfBirth)}
                        {age !== null && (
                          <span className="ml-1.5 text-[11px] text-[#6c7e93]">({age} tuổi)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[#38536d]">
                        {p.phone || <span className="text-[#8091a5] italic">Chưa có SĐT</span>}
                      </td>
                      <td className="px-4 py-3">
                        {hasAllergies ? (
                          <div className="flex flex-wrap gap-1 items-center">
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-200/60">
                              {p.allergies.length} dị ứng
                            </span>
                            <span className="text-[11px] text-[#6c7e93] truncate max-w-[150px]">
                              ({p.allergies.map((a) => a.substance).join(', ')})
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#8091a5]">Không ghi nhận</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[11px] font-semibold text-[#20334b]">
                          {p.visitsCount} lượt khám
                        </div>
                        {p.lastVisitDate && (
                          <div className="text-[10px] text-[#6c7e93]">
                            Gần nhất: {formatDate(p.lastVisitDate)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Link href={`/letan/reception/${p.id}`}>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-[7px] text-[11px] font-semibold text-[#246dce] hover:bg-[#edf5ff] transition-colors">
                              Chi tiết
                            </span>
                          </Link>
                          <Link href={`/letan/reception/${p.id}/edit`}>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-[7px] text-[11px] font-semibold text-[#6c7e93] hover:text-[#20334b] hover:bg-[#f8fafd] border border-[#dce5ef] transition-colors">
                              Sửa
                            </span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-[#f8fafc] border-t border-[#e6edf5] text-[11px] text-[#6c7e93]">
            <div>
              Hiển thị <span className="font-semibold text-[#20334b]">{patients.length}</span> /{' '}
              <span className="font-semibold text-[#20334b]">{total}</span> hồ sơ bệnh nhân
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                className="px-3 py-1 rounded-[7px] border border-[#dce5ef] bg-white text-[#20334b] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f8fafd] transition-colors cursor-pointer text-[11px] font-medium"
              >
                ← Trang trước
              </button>
              <span className="font-medium px-2 text-[#20334b]">
                Trang {page} / {totalPages || 1}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                className="px-3 py-1 rounded-[7px] border border-[#dce5ef] bg-white text-[#20334b] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f8fafd] transition-colors cursor-pointer text-[11px] font-medium"
              >
                Trang sau →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

