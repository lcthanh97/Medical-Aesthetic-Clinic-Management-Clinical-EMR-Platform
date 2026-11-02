'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { TransferRoomModal } from './TransferRoomModal';
import { CancelVisitModal } from './CancelVisitModal';
import type { VisitItem, VisitQueueStatus } from '../types/visits.types';

interface VisitDetailViewProps {
  visit: VisitItem;
  onRefresh?: () => void;
}

export function VisitDetailView({ visit, onRefresh }: VisitDetailViewProps) {
  const [transferOpen, setTransferOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const isWaiting = visit.status === 'WAITING';

  const getStatusBadge = (status: VisitQueueStatus) => {
    switch (status) {
      case 'WAITING':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            Chờ khám
          </span>
        );
      case 'EXAMINING':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
            <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            Đang trong phòng khám
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e6f9f0] px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-600" />
            Đã hoàn thành khám
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 border border-rose-200">
            <span className="h-2 w-2 rounded-full bg-rose-600" />
            Đã hủy lượt khám
          </span>
        );
      default:
        return <span className="text-xs text-slate-600">{status}</span>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-[#0e3a78]">Chi tiết lượt khám: {visit.visitCode}</h1>
            {getStatusBadge(visit.status)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Thông tin tiếp nhận hành chính và số thứ tự phòng khám.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/reception/visits">
            <Button variant="secondary" size="sm">
              ← Quay lại hàng đợi
            </Button>
          </Link>
          {isWaiting && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setTransferOpen(true)}
                className="text-[#0e3a78] border-[#cbdff2]"
              >
                🔄 Đổi phòng khám
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCancelOpen(true)}
                className="text-rose-600 border-rose-200 hover:bg-rose-50"
              >
                Hủy lượt
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Grid: 2 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Số thứ tự & Phòng */}
        <div className="rounded-2xl border border-[#e2ebf5] bg-white p-6 shadow-sm text-center space-y-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Số thứ tự hàng đợi (STT)
          </span>
          <div className="text-6xl font-black text-[#0e3a78]">
            #{String(visit.queueNumber).padStart(2, '0')}
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700">
            <span>🏥</span>
            <span>{visit.roomName}</span>
          </div>
          <div className="text-xs text-slate-500 pt-2 border-t border-slate-100">
            Giờ tiếp nhận: <strong className="text-slate-800">{visit.checkInTime}</strong>
          </div>
        </div>

        {/* Right: Thông tin chi tiết */}
        <div className="md:col-span-2 space-y-6">
          {/* Card Bệnh nhân */}
          <div className="rounded-2xl border border-[#e2ebf5] bg-white p-6 shadow-sm space-y-3">
            <h3 className="font-bold text-[#0e3a78] text-sm flex items-center justify-between border-b border-[#e2ebf5] pb-2">
              <span>👤 Thông tin bệnh nhân</span>
              <Link
                href={`/reception/${visit.patientId}`}
                className="text-xs text-[#0e3a78] underline hover:text-[#124794]"
              >
                Xem hồ sơ bệnh án ↗
              </Link>
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500">Họ và tên:</span>
                <div className="font-bold text-slate-800 text-sm mt-0.5">{visit.patientName}</div>
              </div>
              <div>
                <span className="text-slate-500">Mã bệnh nhân:</span>
                <div className="font-bold text-[#0e3a78] mt-0.5">{visit.patientCode}</div>
              </div>
              <div>
                <span className="text-slate-500">Số điện thoại:</span>
                <div className="text-slate-800 mt-0.5">{visit.patientPhone || 'Chưa cập nhật'}</div>
              </div>
              <div>
                <span className="text-slate-500">Ngày tiếp nhận:</span>
                <div className="text-slate-800 mt-0.5">
                  {new Date(visit.visitDate).toLocaleDateString('vi-VN')}
                </div>
              </div>
            </div>
          </div>

          {/* Card Lượt khám */}
          <div className="rounded-2xl border border-[#e2ebf5] bg-white p-6 shadow-sm space-y-3">
            <h3 className="font-bold text-[#0e3a78] text-sm border-b border-[#e2ebf5] pb-2">
              📋 Chi tiết lượt khám tại quầy
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500">Loại lượt khám:</span>
                <div className="font-semibold text-slate-800 mt-0.5">
                  {visit.visitType === 'NEW'
                    ? 'Khám mới ban đầu'
                    : visit.visitType === 'RE_EXAMINATION'
                    ? 'Tái khám trực tiếp'
                    : 'Khám dịch vụ thẩm mỹ / Chăm sóc da'}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Lý do khám (triệu chứng sơ bộ):</span>
                <div className="rounded-xl bg-[#f8fafc] border border-slate-200 p-3 text-slate-800 mt-1">
                  {visit.reason}
                </div>
              </div>
              {visit.receptionNote && (
                <div>
                  <span className="text-slate-500">Ghi chú tiếp nhận:</span>
                  <div className="rounded-xl bg-[#f8fafc] border border-slate-200 p-3 text-slate-700 italic mt-1">
                    {visit.receptionNote}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <TransferRoomModal
        visit={visit}
        isOpen={transferOpen}
        onClose={() => setTransferOpen(false)}
        onSuccess={() => {
          if (onRefresh) onRefresh();
        }}
      />

      <CancelVisitModal
        visit={visit}
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onSuccess={() => {
          if (onRefresh) onRefresh();
        }}
      />
    </div>
  );
}

