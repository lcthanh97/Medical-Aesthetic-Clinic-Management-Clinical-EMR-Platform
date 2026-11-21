'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { createPlanFromTemplate } from '../actions';

export function ProtocolTemplateApplyButton({
  templateId,
  visitId,
}: {
  templateId: string;
  visitId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const applyTemplate = () => {
    if (!visitId || isPending) return;
    setError(null);
    startTransition(async () => {
      const result = await createPlanFromTemplate({ visitId, templateId });
      if (!result.success) {
        setError(result.error ?? 'Không thể tạo phác đồ từ mẫu.');
        return;
      }
      router.push(`/bacsi/treatments?visitId=${encodeURIComponent(visitId)}`);
      router.refresh();
    });
  };

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={applyTemplate}
        disabled={!visitId || isPending}
        className="inline-flex h-9 items-center gap-2 rounded-md bg-[#2864c8] px-3 text-[11px] font-semibold text-white hover:bg-[#1f55ad] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? <LoaderCircle size={14} className="animate-spin" /> : <ArrowRight size={14} />}
        {isPending ? 'Đang tạo phác đồ...' : 'Áp dụng cho lượt khám này'}
      </button>
      {!visitId && <p className="mt-2 text-[10px] text-[#8392a8]">Mở thư viện từ trang điều trị sau khi chọn lượt khám.</p>}
      {error && <p role="alert" className="mt-2 text-[10px] font-medium text-red-600">{error}</p>}
    </div>
  );
}
