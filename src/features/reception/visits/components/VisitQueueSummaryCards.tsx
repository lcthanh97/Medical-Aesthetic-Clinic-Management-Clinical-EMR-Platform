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
      icon: '📋',
      bgColor: 'bg-white',
      textColor: 'text-[#0e3a78]',
      badgeBg: 'bg-[#e8f1fc]',
    },
    {
      title: 'Bệnh nhân đang chờ khám',
      value: summary.waitingCount,
      icon: '⏳',
      bgColor: 'bg-white',
      textColor: 'text-amber-600',
      badgeBg: 'bg-amber-50 text-amber-700 border border-amber-200',
      highlight: true,
    },
    {
      title: 'Đang trong phòng khám',
      value: summary.examiningCount,
      icon: '🩺',
      bgColor: 'bg-white',
      textColor: 'text-[#185adb]',
      badgeBg: 'bg-blue-50 text-blue-700 border border-blue-200',
    },
    {
      title: 'Đã hoàn thành khám',
      value: summary.completedCount,
      icon: '✓',
      bgColor: 'bg-white',
      textColor: 'text-emerald-600',
      badgeBg: 'bg-[#e6f9f0] text-emerald-800 border border-emerald-200',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`rounded-2xl border border-[#e2ebf5] ${card.bgColor} p-5 shadow-sm transition-all hover:shadow-md flex items-center justify-between`}
        >
          <div>
            <p className="text-xs font-semibold text-slate-500">{card.title}</p>
            <div className={`text-2xl font-black ${card.textColor} mt-1.5`}>
              {isLoading ? (
                <span className="inline-block h-7 w-12 animate-pulse rounded bg-slate-200" />
              ) : (
                card.value
              )}
            </div>
          </div>
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${card.badgeBg}`}
          >
            {card.icon}
          </div>
        </div>
      ))}
    </div>
  );
}

