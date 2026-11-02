'use client';

import type { ReceptionStats } from '../types/reception.types';

interface PatientSummaryCardsProps {
  stats: ReceptionStats | null;
  isLoading: boolean;
}

export function PatientSummaryCards({ stats, isLoading }: PatientSummaryCardsProps) {
  const cards = [
    {
      title: 'Tổng số hồ sơ bệnh nhân',
      value: isLoading ? '...' : (stats?.totalPatients ?? 0),
      desc: 'Hồ sơ lưu trữ trên hệ thống',
      icon: '👥',
      bg: 'bg-white',
      accent: 'border-[#e2ebf5]',
      badge: 'Toàn cơ sở',
      badgeColor: 'bg-[#e8f1fc] text-[#0e3a78]',
    },
    {
      title: 'Lượt tiếp nhận hôm nay',
      value: isLoading ? '...' : (stats?.todayPatients ?? 0),
      desc: 'Lượt khám ghi nhận trong ngày',
      icon: '📅',
      bg: 'bg-white',
      accent: 'border-[#e2ebf5]',
      badge: 'Hôm nay',
      badgeColor: 'bg-[#e6f9f0] text-[#059669]',
    },
    {
      title: 'Bệnh nhân có cảnh báo dị ứng',
      value: isLoading ? '...' : (stats?.patientsWithAllergy ?? 0),
      desc: 'Cần lưu ý đặc biệt khi khám & kê đơn',
      icon: '⚠️',
      bg: 'bg-white',
      accent: 'border-[#e2ebf5]',
      badge: 'Lưu ý lâm sàng',
      badgeColor: 'bg-[#fef3c7] text-[#d97706]',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`rounded-2xl border ${card.accent} ${card.bg} p-5 shadow-sm transition-all duration-200 hover:shadow-md`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">{card.icon}</span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${card.badgeColor}`}>
              {card.badge}
            </span>
          </div>
          <div className="text-2xl font-extrabold text-[#0e3a78] tracking-tight mb-1">
            {card.value}
          </div>
          <div className="text-sm font-semibold text-slate-700 mb-1">{card.title}</div>
          <div className="text-xs text-slate-500">{card.desc}</div>
        </div>
      ))}
    </div>
  );
}

