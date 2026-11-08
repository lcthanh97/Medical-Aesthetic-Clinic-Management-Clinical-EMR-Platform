'use client';

import Link from 'next/link';
import { Button, Input } from '@/components/ui';

interface PatientSearchFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function PatientSearchFilters({
  search,
  onSearchChange,
  onRefresh,
  isLoading,
}: PatientSearchFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5 bg-white p-3.5 rounded-[9px] border border-[#dce5ef] shadow-2xs">
      <div className="relative flex-1">
        <Input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm theo Mã hồ sơ (BN...), Họ tên bệnh nhân hoặc Số điện thoại..."
          className="pr-10 text-[12px] h-10 border-[#dce5ef] rounded-[7px] focus:border-[#246dce]"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="h-10 px-4 rounded-[7px] border border-[#dce5ef] bg-white text-[12px] font-semibold text-[#6c7e93] hover:text-[#20334b] hover:bg-[#f8fafd] transition-colors cursor-pointer"
        >
          {isLoading ? 'Đang tải...' : 'Làm mới'}
        </button>

        <Link
          href="/reception/new"
          className="h-10 px-4 rounded-[7px] bg-[#246dce] hover:bg-[#1f5cb0] text-[12px] font-semibold text-white shadow-2xs transition-colors inline-flex items-center justify-center cursor-pointer"
        >
          + Tiếp nhận bệnh nhân
        </Link>
      </div>
    </div>
  );
}

