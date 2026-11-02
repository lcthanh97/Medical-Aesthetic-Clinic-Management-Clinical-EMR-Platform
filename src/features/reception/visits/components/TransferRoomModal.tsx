'use client';

import { useState, useEffect } from 'react';
import { Button, Input, LoadingSpinner } from '@/components/ui';
import { visitsApi } from '../api/visitsApi';
import type { VisitItem, RoomQueueItem } from '../types/visits.types';

interface TransferRoomModalProps {
  visit: VisitItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TransferRoomModal({
  visit,
  isOpen,
  onClose,
  onSuccess,
}: TransferRoomModalProps) {
  const [rooms, setRooms] = useState<RoomQueueItem[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [reason, setReason] = useState('');
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    async function loadRooms() {
      setIsLoadingRooms(true);
      try {
        const res = await visitsApi.getRooms();
        if (res.success && res.data) {
          setRooms(res.data);
          const otherRoom = res.data.find((r) => r.id !== visit?.roomId);
          if (otherRoom) {
            setSelectedRoomId(otherRoom.id);
          }
        }
      } catch (err) {
        console.error('Failed to load rooms:', err);
      } finally {
        setIsLoadingRooms(false);
      }
    }
    loadRooms();
  }, [isOpen, visit?.roomId]);

  if (!isOpen || !visit) return null;

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId) {
      setErrorMessage('Vui lòng chọn phòng khám đích cần chuyển tới.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await visitsApi.transferRoom(visit.id, {
        targetRoomId: selectedRoomId,
        reason: reason.trim() || undefined,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage(res.message || 'Không thể chuyển phòng khám.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối máy chủ.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#e2ebf5]">
        <form onSubmit={handleTransfer} className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-[#0e3a78] flex items-center gap-2">
              <span>🔄</span> Điều chuyển phòng khám
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Chuyển bệnh nhân đang chờ sang phòng khám chuyên khoa khác để giảm tải thời gian chờ.
            </p>
          </div>

          {errorMessage && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
              {errorMessage}
            </div>
          )}

          <div className="rounded-xl border border-[#e2ebf5] bg-[#f8fafc] p-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Bệnh nhân:</span>
              <span className="font-semibold text-slate-800">
                {visit.patientName} (#{String(visit.queueNumber).padStart(2, '0')})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Phòng khám hiện tại:</span>
              <span className="font-semibold text-amber-700">{visit.roomName}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Chọn phòng khám đích tiếp nhận <span className="text-rose-500">*</span>
            </label>
            {isLoadingRooms ? (
              <div className="py-2 text-xs text-slate-500">Đang tải danh sách phòng...</div>
            ) : (
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="w-full rounded-xl border border-[#e2ebf5] bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-[#185adb] focus:outline-none focus:ring-2 focus:ring-[#185adb]/20 transition-all"
                required
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id} disabled={r.id === visit.roomId}>
                    {r.name} {r.id === visit.roomId ? '(Phòng hiện tại)' : `(Đang chờ: ${r.waitingCount})`}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Lý do chuyển phòng (tùy chọn)
            </label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Phòng hiện tại quá tải, chuyển giảm tải..."
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#e2ebf5]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              className="bg-[#0e3a78] hover:bg-[#124794] text-white"
            >
              {isSubmitting ? <LoadingSpinner /> : 'Xác nhận chuyển phòng'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

