'use client';

import { useState } from 'react';
import { Button, Input, LoadingSpinner } from '@/components/ui';
import { visitsApi } from '../api/visitsApi';
import type { VisitItem } from '../types/visits.types';

interface CancelVisitModalProps {
  visit: VisitItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CancelVisitModal({
  visit,
  isOpen,
  onClose,
  onSuccess,
}: CancelVisitModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !visit) return null;

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await visitsApi.cancelVisit(visit.id, {
        reason: reason.trim() || undefined,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage(res.message || 'Không thể hủy lượt khám.');
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
        <form onSubmit={handleCancel} className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-rose-700 flex items-center gap-2">
              <span>⚠️</span> Hủy lượt khám của bệnh nhân
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Bạn có chắc chắn muốn hủy lượt khám của{' '}
              <strong className="text-slate-800">{visit.patientName}</strong> (STT #{String(visit.queueNumber).padStart(2, '0')})?
            </p>
          </div>

          {errorMessage && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Lý do hủy lượt khám (tùy chọn)
            </label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Bệnh nhân bận về gấp, đổi ý..."
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
              Giữ lại lượt khám
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isSubmitting ? <LoadingSpinner /> : 'Xác nhận hủy'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

