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
      bg: 'bg-white',
      accent: 'border-[#e2ebf5]',
      badge: 'Toàn cơ sở',
      badgeColor: 'bg-[#e8f1fc] text-[#0e3a78]',
    },
    {
      title: 'Lượt tiếp nhận hôm nay',
      value: isLoading ? '...' : (stats?.todayPatients ?? 0),
      desc: 'Lượt khám ghi nhận trong ngày',
      bg: 'bg-white',
      accent: 'border-[#e2ebf5]',
      badge: 'Hôm nay',
      badgeColor: 'bg-[#e6f9f0] text-[#059669]',
    },
    {
      title: 'Bệnh nhân có cảnh báo dị ứng',
      value: isLoading ? '...' : (stats?.patientsWithAllergy ?? 0),
      desc: 'Cần lưu ý đặc biệt khi khám & kê đơn',
      bg: 'bg-white',
      accent: 'border-[#e2ebf5]',
      badge: 'Lưu ý lâm sàng',
      badgeColor: 'bg-[#fef3c7] text-[#d97706]',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className="rounded-[9px] border border-[#dce5ef] bg-white p-4 shadow-2xs transition-all hover:border-[#246dce]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-[#6c7e93]">{card.title}</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${card.badgeColor}`}>
              {card.badge}
            </span>
          </div>
          <div className="text-[26px] font-bold text-[#20334b] tracking-tight">
            {card.value}
          </div>
          <div className="text-[10px] text-[#8091a5] mt-1">{card.desc}</div>
        </div>
      ))}
    </div>
  );
}

