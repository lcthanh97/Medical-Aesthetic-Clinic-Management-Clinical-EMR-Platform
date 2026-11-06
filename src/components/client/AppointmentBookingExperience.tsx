'use client'

import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { HomeBookingForm } from './HomeBookingForm'
import type { ClientPublicData } from '@/features/client-portal/server/getClientPublicData'

type Props = Pick<ClientPublicData, 'services' | 'doctors' | 'rooms'> & { initialDoctorId?: string }

export function AppointmentBookingExperience({ services, doctors, rooms, initialDoctorId }: Props) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? '')
  const [doctorId, setDoctorId] = useState(initialDoctorId ?? '')

  return <div className="mt-5 rounded-[28px] border border-[#cbddeb] bg-white px-2 pt-7">
    <div className="grid gap-7 px-5 lg:grid-cols-2">
      <section aria-labelledby="service-title">
        <h2 id="service-title" className="text-3xl font-black text-[#0c3865]">1. Chọn dịch vụ khám</h2>
        <p className="mt-2 text-sm text-[#718196]">Dữ liệu dịch vụ đang hoạt động từ hệ thống.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">{services.slice(0, 6).map(service => <button type="button" onClick={() => setServiceId(service.id)} aria-pressed={service.id === serviceId} className={`rounded-2xl border p-4 text-left transition ${service.id === serviceId ? 'border-[#176cce] bg-[#eef7ff] ring-2 ring-blue-100' : 'border-[#d5e3ef] hover:border-[#8fb8dc]'}`} key={service.id}><span className="flex items-start gap-2"><span className="flex-1"><strong className="text-sm text-[#0c3865]">{service.name}</strong><span className="mt-2 block text-xs text-[#718196]">{service.category} · {service.price.toLocaleString('vi-VN')}₫</span></span>{service.id === serviceId && <CheckCircle2 className="shrink-0 text-[#176cce]" size={18}/>}</span></button>)}</div>
        {services.length === 0 && <p className="mt-5 rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-5 text-sm text-amber-800">Chưa có dịch vụ hoạt động trong database. Vui lòng liên hệ lễ tân.</p>}
      </section>
      <section aria-labelledby="doctor-title">
        <h2 id="doctor-title" className="text-3xl font-black text-[#0c3865]">2. Chọn bác sĩ khám</h2>
        <p className="mt-2 text-sm text-[#718196]">Bác sĩ da liễu đang hoạt động trong hệ thống.</p>
        <div className="mt-5 space-y-3">{doctors.slice(0, 4).map(item => <button type="button" onClick={() => setDoctorId(item.id)} aria-pressed={item.id === doctorId} className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${item.id === doctorId ? 'border-[#176cce] bg-[#eef7ff] ring-2 ring-blue-100' : 'border-[#d5e3ef] hover:border-[#8fb8dc]'}`} key={item.id}><span className="grid h-12 w-12 place-items-center rounded-full bg-[#cce3f7] font-bold text-[#176cce]">{item.name.split(' ').slice(-2).map(part => part[0]).join('')}</span><span className="flex-1"><strong className="text-sm text-[#0c3865]">{item.name}</strong><span className="block text-xs text-[#718196]">{item.department} · {item.visits} lượt khám</span></span>{item.id === doctorId && <CheckCircle2 className="text-[#176cce]" size={18}/>}</button>)}</div>
        {doctors.length === 0 && <p className="mt-5 rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-5 text-sm text-amber-800">Chưa có bác sĩ phù hợp trong database. Vui lòng liên hệ lễ tân.</p>}
      </section>
    </div>
    <div className="mt-7 border-t border-[#e2ebf3] pt-7"><HomeBookingForm key={`${serviceId}:${doctorId}`} services={services} doctors={doctors} rooms={rooms} initialServiceId={serviceId} initialDoctorId={doctorId} onServiceChange={setServiceId} onDoctorChange={setDoctorId}/></div>
  </div>
}
