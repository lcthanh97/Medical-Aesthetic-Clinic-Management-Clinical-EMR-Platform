'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, Search } from 'lucide-react';

export type ExaminationVisitOption = {
  id: string;
  status: string;
  visitDate: Date | string;
  patient: { fullName: string; patientCode: string; dateOfBirth?: Date | string | null };
};

const STATUS_LABELS: Record<string, string> = {
  WAITING: 'Chờ khám', CHECKED_IN: 'Đã tiếp nhận', IN_PROGRESS: 'Đang khám',
  EXAMINING: 'Đang khám', WAITING_RESULT: 'Chờ kết quả', RESULT_READY: 'Đã có kết quả',
  COMPLETED: 'Đã hoàn tất', CANCELLED: 'Đã hủy', NO_SHOW: 'Không đến',
};

function timeLabel(value: Date | string) {
  return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function birthYear(value?: Date | string | null) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : ` (${date.getFullYear()})`;
}

export function ExaminationVisitPicker({ visits, selectedVisitId, date }: {
  visits: ExaminationVisitOption[];
  selectedVisitId: string;
  date: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = visits.find((visit) => visit.id === selectedVisitId);
  const filteredVisits = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('vi-VN');
    if (!normalized) return visits;
    return visits.filter((visit) => `${visit.patient.fullName} ${visit.patient.patientCode}`.toLocaleLowerCase('vi-VN').includes(normalized));
  }, [query, visits]);

  function choose(visitId: string) {
    setOpen(false);
    setQuery('');
    router.push(`/bacsi/examination?visitId=${encodeURIComponent(visitId)}&date=${encodeURIComponent(date)}`);
  }

  return (
    <div className="relative w-full sm:max-w-[560px]">
      <label className="mb-1.5 block text-sm font-semibold text-slate-800" id="examination-patient-label">Bệnh nhân <span className="text-rose-500">*</span></label>
      <button type="button" aria-haspopup="listbox" aria-expanded={open} aria-labelledby="examination-patient-label" onClick={() => setOpen((value) => !value)} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-left text-sm text-slate-800 shadow-sm outline-none transition hover:border-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
        <span className="min-w-0 truncate">
          {selected ? <>{selected.patient.fullName}{birthYear(selected.patient.dateOfBirth)} <span className="text-slate-400">·</span> {selected.patient.patientCode} <span className="text-slate-400">·</span> {timeLabel(selected.visitDate)} <span className="text-slate-400">·</span> {STATUS_LABELS[selected.status] ?? selected.status}</> : 'Không có bệnh nhân trong ngày'}
        </span>
        <ChevronDown size={18} className={`shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 p-3">
            <div className="relative">
              <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input autoFocus type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm bệnh nhân..." aria-label="Tìm bệnh nhân" className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            </div>
          </div>
          <ul role="listbox" aria-label="Bệnh nhân được phân công" className="max-h-72 overflow-y-auto p-1.5">
            {filteredVisits.length ? filteredVisits.map((visit) => {
              const active = visit.id === selectedVisitId;
              return (
                <li key={visit.id} role="option" aria-selected={active}>
                  <button type="button" onClick={() => choose(visit.id)} className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${active ? 'bg-blue-50 font-semibold text-slate-900' : 'text-slate-800 hover:bg-slate-50'}`}>
                    <span className="w-5 shrink-0">{active && <Check size={17} className="text-blue-600" />}</span>
                    <span className="min-w-0 flex-1 truncate">{visit.patient.fullName}{birthYear(visit.patient.dateOfBirth)} <span className="text-slate-400">·</span> {visit.patient.patientCode}</span>
                    <span className="shrink-0 text-xs text-slate-500">{timeLabel(visit.visitDate)} <span className="text-slate-300">·</span> {STATUS_LABELS[visit.status] ?? visit.status}</span>
                  </button>
                </li>
              );
            }) : <li className="px-3 py-6 text-center text-sm text-slate-500">Không tìm thấy bệnh nhân phù hợp.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
