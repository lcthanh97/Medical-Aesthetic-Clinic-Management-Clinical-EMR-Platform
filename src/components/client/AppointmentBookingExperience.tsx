'use client';

import { useState } from 'react';
import { CheckCircle2, Stethoscope, Sparkles } from 'lucide-react';
import { HomeBookingForm } from './HomeBookingForm';
import type { ClientPublicData } from '@/features/client-portal/server/getClientPublicData';

type Props = Pick<ClientPublicData, 'services' | 'doctors' | 'rooms'> & {
  initialDoctorId?: string;
};

const serviceThumbnails = [
  'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=400&q=80',
];

const doctorPortraits = [
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=300&q=80',
];

export function AppointmentBookingExperience({
  services,
  doctors,
  rooms,
  initialDoctorId,
}: Props) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? '');
  const [doctorId, setDoctorId] = useState(initialDoctorId ?? '');

  return (
    <div className="mt-6 rounded-3xl border border-slate-200/90 bg-white/95 px-2 pt-7 shadow-md">
      <div className="grid gap-7 px-4 sm:px-6 lg:grid-cols-2">
        <section aria-labelledby="service-title">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#0D9488]" />
            <h2 id="service-title" className="font-heading text-2xl font-extrabold text-slate-900">
              1. Chọn dịch vụ khám
            </h2>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Dữ liệu dịch vụ chuyên khoa đang hoạt động từ hệ thống EMR.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {services.slice(0, 6).map((service, idx) => {
              const active = service.id === serviceId;
              return (
                <button
                  type="button"
                  key={service.id}
                  data-client-card
                  onClick={() => setServiceId(service.id)}
                  aria-pressed={active}
                  className={`group overflow-hidden rounded-2xl border text-left transition-all ${
                    active
                      ? 'border-[#0D9488] bg-teal-50/70 ring-2 ring-teal-500/20'
                      : 'border-slate-200/90 bg-white hover:border-teal-300'
                  }`}
                >
                  <div className="relative h-24 w-full overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={serviceThumbnails[idx % serviceThumbnails.length]}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <span className="absolute left-2.5 top-2.5 rounded-full bg-slate-900/75 px-2.5 py-0.5 text-[10px] font-bold text-teal-300">
                      {service.category}
                    </span>
                    {active && (
                      <span className="absolute right-2.5 top-2.5 rounded-full bg-[#0D9488] p-1 text-white shadow-xs">
                        <CheckCircle2 size={14} />
                      </span>
                    )}
                  </div>
                  <div className="p-3.5">
                    <strong className="block font-heading text-sm font-bold text-slate-900 line-clamp-1">
                      {service.name}
                    </strong>
                    <span className="mt-1 block text-xs font-extrabold text-[#0284C7]">
                      {service.price.toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          {services.length === 0 && (
            <p className="mt-5 rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-5 text-sm text-amber-800">
              Chưa có dịch vụ hoạt động trong database. Vui lòng liên hệ lễ tân.
            </p>
          )}
        </section>

        <section aria-labelledby="doctor-title">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-[#0284C7]" />
            <h2 id="doctor-title" className="font-heading text-2xl font-extrabold text-slate-900">
              2. Chọn bác sĩ khám
            </h2>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Đội ngũ bác sĩ chuyên khoa Da liễu giàu kinh nghiệm lâm sàng.
          </p>
          <div className="mt-4 space-y-3">
            {doctors.slice(0, 4).map((item, idx) => {
              const active = item.id === doctorId;
              return (
                <button
                  type="button"
                  key={item.id}
                  data-client-card
                  onClick={() => setDoctorId(item.id)}
                  aria-pressed={active}
                  className={`flex w-full items-center gap-4 rounded-2xl border p-3.5 text-left transition-all ${
                    active
                      ? 'border-[#0D9488] bg-teal-50/70 ring-2 ring-teal-500/20'
                      : 'border-slate-200/90 bg-white hover:border-teal-300'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={doctorPortraits[idx % doctorPortraits.length]}
                    alt={item.name}
                    className="h-14 w-14 shrink-0 rounded-2xl object-cover border border-teal-200"
                  />
                  <span className="flex-1 min-w-0">
                    <strong className="block font-heading text-sm font-bold text-slate-900 truncate">
                      {item.name}
                    </strong>
                    <span className="mt-0.5 block text-xs font-medium text-[#0284C7]">
                      {item.department} · {item.visits} lượt khám lâm sàng
                    </span>
                  </span>
                  {active && <CheckCircle2 className="shrink-0 text-[#0D9488]" size={20} />}
                </button>
              );
            })}
          </div>
          {doctors.length === 0 && (
            <p className="mt-5 rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-5 text-sm text-amber-800">
              Chưa có bác sĩ phù hợp trong database. Vui lòng liên hệ lễ tân.
            </p>
          )}
        </section>
      </div>

      <div className="mt-7 border-t border-slate-200/80 pt-7">
        <HomeBookingForm
          key={`${serviceId}:${doctorId}`}
          services={services}
          doctors={doctors}
          rooms={rooms}
          initialServiceId={serviceId}
          initialDoctorId={doctorId}
          onServiceChange={setServiceId}
          onDoctorChange={setDoctorId}
          selectionAlreadyMade
        />
      </div>
    </div>
  );
}
