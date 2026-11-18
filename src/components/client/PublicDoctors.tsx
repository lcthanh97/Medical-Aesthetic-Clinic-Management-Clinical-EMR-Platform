'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Microscope, Search, Stethoscope } from 'lucide-react';
import type { ClientPublicData } from '@/features/client-portal/server/getClientPublicData';

const cardImages = [
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=700&q=85',
  'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=700&q=85',
  'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=700&q=85',
  'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=700&q=85',
  'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=700&q=85',
  'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=700&q=85',
];

export function PublicDoctors({ data }: { data: ClientPublicData }) {
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('Tất cả chuyên khoa');

  const doctors = useMemo(
    () =>
      data.doctors.filter((doctor) => {
        const text = `${doctor.name} ${doctor.department} ${doctor.code}`.toLocaleLowerCase('vi');
        return (
          (!query || text.includes(query.toLocaleLowerCase('vi'))) &&
          (department === 'Tất cả chuyên khoa' || doctor.department === department)
        );
      }),
    [data.doctors, department, query]
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
      <div>
        <div className="flex rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-sm">
          <Search className="m-3 text-slate-400" size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-w-0 flex-1 text-sm outline-none"
            placeholder="Tìm bác sĩ theo tên, chuyên khoa, mã bác sĩ..."
            aria-label="Tìm bác sĩ"
          />
          <button
            type="button"
            className="rounded-xl px-6 py-2 text-xs sm:text-sm font-bold text-white whitespace-nowrap"
            style={{ background: 'linear-gradient(135deg, #0D9488 0%, #0284C7 100%)' }}
          >
            Tìm kiếm →
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {['Tất cả chuyên khoa', ...data.departments].map((name) => (
            <button
              type="button"
              onClick={() => setDepartment(name)}
              key={name}
              className={`rounded-full border px-4 py-2 text-xs font-bold transition-colors ${
                department === name
                  ? 'border-[#0D9488] bg-[#0D9488] text-white shadow-xs'
                  : 'border-slate-200 bg-white/90 text-slate-700 hover:border-teal-300'
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        <div className="mt-7 flex items-end gap-2">
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900">
            Danh sách Bác sĩ Chuyên khoa
          </h2>
          <span className="mb-1 text-sm font-semibold text-[#0D9488]">
            ({doctors.length} bác sĩ)
          </span>
        </div>

        {!data.connected && (
          <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
            Đang kết nối cơ sở dữ liệu phòng khám.
          </div>
        )}

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {doctors.map((doctor, index) => (
            <article
              key={doctor.id}
              data-client-card
              className="group grid min-h-[230px] overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 shadow-sm sm:grid-cols-[160px_1fr]"
            >
              <div className="relative h-full min-h-[200px] w-full overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cardImages[index % cardImages.length]}
                  alt={doctor.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute left-3 top-3 rounded-lg bg-slate-900/75 px-2 py-0.5 font-mono text-[10px] font-bold text-teal-300">
                  {doctor.code}
                </span>
              </div>

              <div className="flex flex-col p-5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0284C7]">
                  {doctor.department}
                </span>
                <h3 className="mt-1 font-heading text-lg font-extrabold text-slate-900">
                  {doctor.name}
                </h3>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <p className="flex items-center gap-1.5">
                    <span className="text-[#0D9488] font-bold">●</span>
                    <span>{doctor.visits} lượt khám lâm sàng đã thực hiện</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span className="text-[#0284C7] font-bold">●</span>
                    <span>{doctor.appointments} lịch hẹn phụ trách</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span className="text-amber-500 font-bold">●</span>
                    <span>
                      Lịch gần nhất:{' '}
                      {doctor.nextWorkDate
                        ? new Intl.DateTimeFormat('vi-VN').format(new Date(doctor.nextWorkDate))
                        : 'Sẵn sàng tiếp nhận'}
                    </span>
                  </p>
                </div>

                <div className="mt-auto flex gap-2 pt-4">
                  <Link
                    href={`/khachhang/doctors/${doctor.id}`}
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2 text-center text-xs font-bold text-slate-700 hover:border-[#0D9488] hover:text-[#0D9488]"
                  >
                    Xem hồ sơ
                  </Link>
                  <Link
                    href={`/khachhang/appointments?doctor=${doctor.id}`}
                    className="flex-1 rounded-xl py-2 text-center text-xs font-bold text-white shadow-xs"
                    style={{ background: 'linear-gradient(135deg, #0D9488 0%, #0284C7 100%)' }}
                  >
                    Đặt lịch khám
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <aside className="hidden h-fit rounded-3xl border border-slate-200/90 bg-white/95 p-5 shadow-sm lg:block space-y-5">
        <div className="flex items-center gap-2 font-heading font-extrabold text-slate-900">
          <Stethoscope size={18} className="text-[#0D9488]" /> Bộ lọc Chuyên khoa
        </div>

        <label className="block text-xs font-bold text-slate-700">
          Chuyên khoa điều trị
          <select
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-800"
          >
            <option>Tất cả chuyên khoa</option>
            {data.departments.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>

        <div className="rounded-2xl bg-gradient-to-br from-teal-50 to-sky-50 p-4 border border-teal-200/70">
          <Microscope className="h-5 w-5 text-[#0D9488] mb-2" />
          <strong className="block font-heading text-xs font-extrabold text-slate-900">
            Chưa rõ tình trạng da?
          </strong>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
            Sử dụng AI Soi Da 3D để phân tích tổn thương và gợi ý chuyên khoa phù hợp trước khi đặt lịch.
          </p>
          <Link
            href="/khachhang/ai-chan-doan"
            className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-[#0D9488] px-3 py-2 text-xs font-bold text-white"
          >
            Khám AI Soi Da ngay →
          </Link>
        </div>

        <Link
          href="/khachhang/appointments"
          className="flex items-center justify-center gap-2 rounded-xl bg-sky-50 border border-sky-200 px-3 py-3 text-xs font-bold text-[#0284C7] hover:bg-[#0284C7] hover:text-white transition-colors"
        >
          <CalendarDays size={15} /> Đặt lịch khám nhanh
        </Link>
      </aside>
    </div>
  );
}
