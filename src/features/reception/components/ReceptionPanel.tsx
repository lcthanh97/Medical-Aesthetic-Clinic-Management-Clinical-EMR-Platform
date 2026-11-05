'use client';

import { useReception } from '../hooks/useReception';
import { PatientSummaryCards } from './PatientSummaryCards';
import { PatientSearchFilters } from './PatientSearchFilters';
import { PatientTable } from './PatientTable';

export function ReceptionPanel() {
  const {
    patients,
    stats,
    total,
    page,
    totalPages,
    search,
    setSearch,
    setPage,
    isLoading,
    error,
    refresh,
  } = useReception();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e2ebf5] pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0e3a78] tracking-tight">
            Tiếp nhận & Quản lý Hồ sơ bệnh nhân
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Tra cứu, tiếp nhận bệnh nhân mới, quản lý thông tin hành chính, tiền sử và dị ứng lâm sàng.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={refresh}
            className="text-xs underline font-semibold cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* 3 Summary Cards */}
      <PatientSummaryCards stats={stats} isLoading={isLoading} />

      {/* Search & Actions Bar */}
      <PatientSearchFilters
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        onRefresh={refresh}
        isLoading={isLoading}
      />

      {/* Patient Table with Pagination */}
      <PatientTable
        patients={patients}
        isLoading={isLoading}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
      />
    </div>
  );
}
