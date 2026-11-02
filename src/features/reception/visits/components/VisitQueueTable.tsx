'use client';

import { useState } from 'react';
import Link from 'next/link';
import { EmptyState, LoadingSpinner, Button, Input } from '@/components/ui';
import { TransferRoomModal } from './TransferRoomModal';
import { CancelVisitModal } from './CancelVisitModal';
import type { VisitItem, RoomQueueItem, VisitQueueStatus } from '../types/visits.types';

interface VisitQueueTableProps {
  items: VisitItem[];
  rooms: RoomQueueItem[];
  selectedRoomId: string;
  onRoomSelect: (roomId: string) => void;
  selectedStatus: string;
  onStatusSelect: (status: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
  isLoading: boolean;
  onRefresh: () => void;
}

export function VisitQueueTable({
  items,
  rooms,
  selectedRoomId,
  onRoomSelect,
  selectedStatus,
  onStatusSelect,
  search,
  onSearchChange,
  isLoading,
  onRefresh,
}: VisitQueueTableProps) {
  const [transferTarget, setTransferTarget] = useState<VisitItem | null>(null);
  const [cancelTarget, setCancelTarget] = useState<VisitItem | null>(null);

  const getStatusBadge = (status: VisitQueueStatus) => {
    switch (status) {
      case 'WAITING':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            Chờ khám
          </span>
        );
      case 'EXAMINING':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
            Đang khám
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e6f9f0] px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            Hoàn thành
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 border border-rose-200">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
            Đã hủy
          </span>
        );
      default:
        return (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            {status}
          </span>
        );
    }
  };

  const getVisitTypeBadge = (type: string) => {
    switch (type) {
      case 'NEW':
        return <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md font-medium">Khám mới</span>;
      case 'RE_EXAMINATION':
        return <span className="text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md font-medium">Tái khám</span>;
      case 'AESTHETIC':
        return <span className="text-xs text-pink-700 bg-pink-50 px-2 py-0.5 rounded-md font-medium">Thẩm mỹ</span>;
      default:
        return <span className="text-xs text-slate-600">{type}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="bg-white p-5 rounded-2xl border border-[#e2ebf5] shadow-sm space-y-4">
        {/* Row 1: Search & Status dropdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm theo Mã BN, Tên bệnh nhân, Mã lượt khám, Số điện thoại..."
            />
          </div>
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => onStatusSelect(e.target.value)}
              className="w-full rounded-xl border border-[#e2ebf5] bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-[#185adb] focus:outline-none focus:ring-2 focus:ring-[#185adb]/20 transition-all"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="WAITING">Chờ khám (WAITING)</option>
              <option value="EXAMINING">Đang khám (EXAMINING)</option>
              <option value="COMPLETED">Hoàn thành (COMPLETED)</option>
              <option value="CANCELLED">Đã hủy (CANCELLED)</option>
            </select>
          </div>
        </div>

        {/* Row 2: Room filter pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 mr-1">Lọc theo phòng:</span>
            <button
              onClick={() => onRoomSelect('')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                !selectedRoomId
                  ? 'bg-[#0e3a78] text-white shadow-sm'
                  : 'bg-[#f4f8fd] text-slate-700 hover:bg-[#e8f1fc]'
              }`}
            >
              Tất cả phòng khám
            </button>
            {rooms.map((room) => {
              const isSelected = selectedRoomId === room.id;
              return (
                <button
                  key={room.id}
                  onClick={() => onRoomSelect(room.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#0e3a78] text-white shadow-sm'
                      : 'bg-[#f4f8fd] text-slate-700 hover:bg-[#e8f1fc]'
                  }`}
                >
                  <span>{room.name}</span>
                  {typeof room.waitingCount === 'number' && room.waitingCount > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                        isSelected ? 'bg-white text-[#0e3a78]' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {room.waitingCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              Tự động cập nhật 10s
            </span>
            <Button variant="secondary" size="sm" onClick={onRefresh} className="text-xs shadow-none">
              ↻ Làm mới
            </Button>
          </div>
        </div>
      </div>

      {/* Queue Table */}
      <div className="rounded-2xl border border-[#e2ebf5] bg-white shadow-sm overflow-hidden">
        {isLoading && items.length === 0 ? (
          <div className="py-20 flex justify-center items-center">
            <LoadingSpinner />
          </div>
        ) : items.length === 0 ? (
          <div className="p-8">
            <EmptyState>
              <div className="flex flex-col items-center justify-center gap-2">
                <span className="text-3xl">🎫</span>
                <p className="font-semibold text-slate-700">Hiện tại không có lượt khám nào trong hàng đợi</p>
                <p className="text-xs text-slate-500">
                  Bệnh nhân đến trực tiếp tại quầy sẽ được cấp số thứ tự và xuất hiện tại đây theo thứ tự.
                </p>
                <div className="mt-3 flex justify-center">
                  <Link href="/reception/visits/new">
                    <Button variant="primary" size="sm">
                      + Đăng ký lượt khám ngay
                    </Button>
                  </Link>
                </div>
              </div>
            </EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-[#f8fafc] text-xs font-semibold text-[#0e3a78] uppercase border-b border-[#e2ebf5]">
                <tr>
                  <th scope="col" className="px-6 py-4 w-20 text-center">STT</th>
                  <th scope="col" className="px-6 py-4">Mã lượt khám</th>
                  <th scope="col" className="px-6 py-4">Bệnh nhân</th>
                  <th scope="col" className="px-6 py-4">Loại khám</th>
                  <th scope="col" className="px-6 py-4">Phòng khám</th>
                  <th scope="col" className="px-6 py-4">Giờ tiếp nhận</th>
                  <th scope="col" className="px-6 py-4">Trạng thái</th>
                  <th scope="col" className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2ebf5]">
                {items.map((item) => {
                  const isWaiting = item.status === 'WAITING';

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-[#f4f8fd] transition-colors duration-150 group"
                    >
                      {/* STT lớn nổi bật */}
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0e3a78] text-white font-black text-lg shadow-sm">
                          #{String(item.queueNumber).padStart(2, '0')}
                        </div>
                      </td>

                      {/* Mã lượt khám */}
                      <td className="px-6 py-4 font-bold text-[#0e3a78]">
                        <Link
                          href={`/reception/visits/${item.id}`}
                          className="hover:underline flex items-center gap-1"
                        >
                          {item.visitCode}
                        </Link>
                      </td>

                      {/* Thông tin bệnh nhân */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800 text-sm">
                          <Link
                            href={`/reception/${item.patientId}`}
                            className="hover:text-[#0e3a78] hover:underline"
                          >
                            {item.patientName}
                          </Link>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span className="rounded bg-[#e8f1fc] px-1.5 py-0.2 text-[11px] font-semibold text-[#0e3a78]">
                            {item.patientCode}
                          </span>
                          {item.patientPhone && <span>{item.patientPhone}</span>}
                        </div>
                      </td>

                      {/* Loại khám */}
                      <td className="px-6 py-4">
                        {getVisitTypeBadge(item.visitType)}
                      </td>

                      {/* Phòng khám */}
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
                          <span>🏥</span>
                          <span>{item.roomName}</span>
                        </div>
                      </td>

                      {/* Giờ tiếp nhận */}
                      <td className="px-6 py-4 font-semibold text-slate-800 text-xs">
                        {item.checkInTime}
                      </td>

                      {/* Trạng thái */}
                      <td className="px-6 py-4">
                        {getStatusBadge(item.status)}
                      </td>

                      {/* Thao tác */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/reception/visits/${item.id}`}>
                            <Button size="sm" variant="ghost" className="text-xs">
                              Chi tiết
                            </Button>
                          </Link>

                          {isWaiting && (
                            <>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setTransferTarget(item)}
                                className="text-xs shadow-none border-[#cbdff2] text-[#0e3a78] hover:bg-[#e8f1fc]"
                                title="Chuyển sang phòng khám khác"
                              >
                                🔄 Đổi phòng
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setCancelTarget(item)}
                                className="text-rose-600 hover:bg-rose-50 border-rose-200 text-xs shadow-none"
                                title="Hủy lượt khám"
                              >
                                Hủy
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <TransferRoomModal
        visit={transferTarget}
        isOpen={!!transferTarget}
        onClose={() => setTransferTarget(null)}
        onSuccess={onRefresh}
      />

      <CancelVisitModal
        visit={cancelTarget}
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onSuccess={onRefresh}
      />
    </div>
  );
}

