'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';
import { VisitQueueSummaryCards } from './VisitQueueSummaryCards';
import { VisitQueueTable } from './VisitQueueTable';
import { useVisitsQueue } from '../hooks/useVisitsQueue';

export function VisitsQueuePanel() {
  const {
    queue,
    summary,
    rooms,
    selectedRoomId,
    setSelectedRoomId,
    selectedStatus,
    setSelectedStatus,
    search,
    setSearch,
    isLoading,
    refresh,
  } = useVisitsQueue();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#0e3a78]">Hàng đợi khám bệnh</h1>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi danh sách bệnh nhân đang chờ tại các phòng khám và điều phối số thứ tự thời gian thực.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/letan/reception">
            <Button variant="secondary" size="md" className="border-[#cbdff2] text-[#0e3a78]">
              Danh sách bệnh nhân
            </Button>
          </Link>
          <Link href="/letan/reception/visits/new">
            <Button variant="primary" size="md" className="bg-[#0e3a78] hover:bg-[#124794]">
              + Đăng ký lượt khám (Lấy STT)
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <VisitQueueSummaryCards summary={summary} isLoading={isLoading} />

      {/* Queue Table with Filters */}
      <VisitQueueTable
        items={queue}
        rooms={rooms}
        selectedRoomId={selectedRoomId}
        onRoomSelect={setSelectedRoomId}
        selectedStatus={selectedStatus}
        onStatusSelect={setSelectedStatus}
        search={search}
        onSearchChange={setSearch}
        isLoading={isLoading}
        onRefresh={refresh}
      />
    </div>
  );
}

