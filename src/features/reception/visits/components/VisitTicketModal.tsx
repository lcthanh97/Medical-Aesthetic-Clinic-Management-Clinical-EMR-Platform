'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';
import type { VisitItem } from '../types/visits.types';

interface VisitTicketModalProps {
  visit: VisitItem | null;
  isOpen: boolean;
  onClose: () => void;
  onNext: () => void;
}

export function VisitTicketModal({ visit, isOpen, onClose, onNext }: VisitTicketModalProps) {
  if (!isOpen || !visit) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-[#e2ebf5] text-center space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Đăng ký lượt khám thành công!</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Phiếu khám đã được ghi nhận vào hàng đợi phòng khám.
          </p>
        </div>

        {/* Big Ticket Badge */}
        <div className="rounded-2xl border border-emerald-200 bg-[#e6f9f0]/40 p-5 space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
            Số thứ tự khám (STT)
          </span>
          <div className="text-5xl font-black text-emerald-700">
            #{String(visit.queueNumber).padStart(2, '0')}
          </div>
          <div className="pt-2 border-t border-emerald-200/60 text-xs font-bold text-[#0e3a78]">
            {visit.roomName}
          </div>
        </div>

        {/* Detailed ticket info */}
        <div className="rounded-xl border border-[#e2ebf5] bg-[#f8fafc] p-3.5 space-y-1.5 text-xs text-left">
          <div className="flex justify-between">
            <span className="text-slate-500">Mã lượt khám:</span>
            <span className="font-bold text-[#0e3a78]">{visit.visitCode}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Bệnh nhân:</span>
            <span className="font-semibold text-slate-800">{visit.patientName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Mã BN:</span>
            <span className="text-slate-700">{visit.patientCode}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Giờ tiếp nhận:</span>
            <span className="text-slate-700">{visit.checkInTime}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Trạng thái:</span>
            <span className="font-semibold text-amber-700">Chờ khám</span>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 flex flex-col gap-2">
          <Link href="/letan/reception" className="w-full">
            <Button variant="primary" className="w-full">
              Xem hàng đợi phòng khám →
            </Button>
          </Link>
          <Button
            variant="secondary"
            onClick={() => {
              onClose();
              onNext();
            }}
            className="w-full"
          >
            Tiếp nhận bệnh nhân tiếp theo
          </Button>
        </div>
      </div>
    </div>
  );
}

