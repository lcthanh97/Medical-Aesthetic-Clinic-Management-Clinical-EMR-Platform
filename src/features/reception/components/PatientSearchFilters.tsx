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
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6 bg-white p-4 rounded-2xl border border-[#e2ebf5] shadow-sm">
      <div className="relative flex-1">
        <Input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm theo Mã hồ sơ (BN...), Họ tên bệnh nhân hoặc Số điện thoại..."
          className="pr-10"
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
        <Button
          variant="secondary"
          onClick={onRefresh}
          disabled={isLoading}
          title="Tải lại dữ liệu"
        >
          {isLoading ? 'Đang tải...' : 'Làm mới'}
        </Button>

        <Link href="/reception/new">
          <Button variant="primary">
            + Tiếp nhận bệnh nhân
          </Button>
        </Link>
      </div>
    </div>
  );
}

