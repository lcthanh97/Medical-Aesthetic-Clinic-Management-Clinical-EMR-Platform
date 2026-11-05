'use client';

import type { QueueSummary } from '../types/visits.types';

interface VisitQueueSummaryCardsProps {
  summary: QueueSummary;
  isLoading: boolean;
}

export function VisitQueueSummaryCards({ summary, isLoading }: VisitQueueSummaryCardsProps) {
  const cards = [
    {
      title: 'Tổng tiếp nhận hôm nay',
      value: summary.totalVisits,
      bgColor: 'bg-white',
      textColor: 'text-[#0e3a78]',
    },
    {
      title: 'Bệnh nhân đang chờ khám',
      value: summary.waitingCount,
      bgColor: 'bg-white',
      textColor: 'text-amber-600',
    },
    {
      title: 'Đang trong phòng khám',
      value: summary.examiningCount,
      bgColor: 'bg-white',
      textColor: 'text-[#185adb]',
    },
    {
      title: 'Đã hoàn thành khám',
      value: summary.completedCount,
      bgColor: 'bg-white',
      textColor: 'text-emerald-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`rounded-2xl border border-[#e2ebf5] ${card.bgColor} p-5 shadow-sm transition-all hover:shadow-md`}
        >
          <p className="text-xs font-semibold text-slate-500">{card.title}</p>
          <div className={`text-2xl font-black ${card.textColor} mt-1.5`}>
            {isLoading ? (
              <span className="inline-block h-7 w-12 animate-pulse rounded bg-slate-200" />
            ) : (
              card.value
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

