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
    <div className="rounded-2xl border border-[#e2ebf5] bg-white shadow-sm overflow-hidden">
      {isLoading ? (
        <div className="py-20 flex justify-center items-center">
          <LoadingSpinner />
        </div>
      ) : patients.length === 0 ? (
        <div className="p-8">
          <EmptyState>
            <div className="flex flex-col items-center justify-center gap-2">
              <p className="font-semibold text-slate-700">Chưa tìm thấy hồ sơ bệnh nhân nào</p>
              <p className="text-xs text-slate-500">
                Hãy thử tìm kiếm với từ khóa khác hoặc bấm nút "+ Tiếp nhận bệnh nhân" để tạo mới.
              </p>
            </div>
          </EmptyState>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-[#f8fafc] text-xs font-semibold text-[#0e3a78] uppercase border-b border-[#e2ebf5]">
                <tr>
                  <th scope="col" className="px-6 py-4">Mã BN</th>
                  <th scope="col" className="px-6 py-4">Họ và tên</th>
                  <th scope="col" className="px-6 py-4">Ngày sinh (Tuổi)</th>
                  <th scope="col" className="px-6 py-4">Số điện thoại</th>
                  <th scope="col" className="px-6 py-4">Cảnh báo dị ứng</th>
                  <th scope="col" className="px-6 py-4">Lượt khám</th>
                  <th scope="col" className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2ebf5]">
                {patients.map((p) => {
                  const age = calculateAge(p.dateOfBirth);
                  const hasAllergies = p.allergies && p.allergies.length > 0;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-[#f4f8fd] transition-colors duration-150 group cursor-pointer"
                    >
                      <td className="px-6 py-4 font-bold text-[#0e3a78]">
                        <Link
                          href={`/reception/${p.id}`}
                          className="hover:underline flex items-center gap-1.5"
                        >
                          <span className="rounded bg-[#e8f1fc] px-2 py-0.5 text-xs text-[#0e3a78]">
                            {p.patientCode}
                          </span>
                        </Link>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        <Link href={`/reception/${p.id}`} className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-[#e8f1fc] text-[#0e3a78] flex items-center justify-center font-bold text-xs uppercase">
                            {p.fullName.slice(0, 1)}
                          </div>
                          <span>{p.fullName}</span>
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {formatDate(p.dateOfBirth)}
                        {age !== null && (
                          <span className="ml-1.5 text-xs text-slate-400">({age} tuổi)</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-600">
                        {p.phone || <span className="text-slate-400 italic">Chưa có SĐT</span>}
                      </td>
                      <td className="px-6 py-4">
                        {hasAllergies ? (
                          <div className="flex flex-wrap gap-1 items-center">
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#fef2f2] px-2.5 py-0.5 text-xs font-semibold text-[#dc2626] border border-[#fecaca]">
                              {p.allergies.length} dị ứng
                            </span>
                            <span className="text-xs text-slate-500 truncate max-w-[150px]">
                              ({p.allergies.map((a) => a.substance).join(', ')})
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Không ghi nhận</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-semibold text-slate-700">
                          {p.visitsCount} lượt khám
                        </div>
                        {p.lastVisitDate && (
                          <div className="text-[11px] text-slate-400">
                            Gần nhất: {formatDate(p.lastVisitDate)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Link href={`/reception/${p.id}`}>
                            <Button variant="ghost" size="sm">
                              Chi tiết
                            </Button>
                          </Link>
                          <Link href={`/reception/${p.id}/edit`}>
                            <Button variant="secondary" size="sm">
                              Sửa
                            </Button>
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-[#f8fafc] border-t border-[#e2ebf5] text-xs text-slate-600">
            <div>
              Hiển thị <span className="font-semibold text-slate-800">{patients.length}</span> /{' '}
              <span className="font-semibold text-slate-800">{total}</span> hồ sơ bệnh nhân
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
              >
                ← Trang trước
              </Button>
              <span className="font-semibold px-2">
                Trang {page} / {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
              >
                Trang sau →
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

