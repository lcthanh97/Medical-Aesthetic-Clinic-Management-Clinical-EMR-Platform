'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { usePatientBookingName } from './PatientBookingContext'
import { patientAuthLink } from '@/features/client-portal/patientReturnPath'
import { useMemo, useState } from 'react'
import { ArrowRight, CalendarDays, CheckCircle2, ShieldCheck, X } from 'lucide-react'
import { createCustomerAppointment } from '@/features/appointments/actions'
import { useCustomerAppointmentSlots } from '@/features/appointments/hooks/useCustomerAppointmentSlots'
import { clinicDate, clinicSlotDate } from '@/features/appointments/utils/timeSlots'
import type { ClientPublicData } from '@/features/client-portal/server/getClientPublicData'

type Props = Pick<ClientPublicData, 'services' | 'doctors' | 'rooms'> & {
 initialServiceId?: string
 initialDoctorId?: string
 onServiceChange?: (id: string) => void
 onDoctorChange?: (id: string) => void
 selectionAlreadyMade?: boolean
}

export function HomeBookingForm({services,doctors,rooms,initialServiceId,initialDoctorId,onServiceChange,onDoctorChange,selectionAlreadyMade=false}:Props){
 const patientName=usePatientBookingName()
 const [authExpired,setAuthExpired]=useState(false)
 const canBook=Boolean(patientName)&&!authExpired
 const pathname=usePathname()
 const returnTo=`${pathname}#dat-lich`
 const [tab,setTab]=useState('Khám da liễu');const [serviceId,setServiceId]=useState(initialServiceId||services[0]?.id||'');const [doctorId,setDoctorId]=useState(initialDoctorId||'');const [date,setDate]=useState('');const [time,setTime]=useState('');const [open,setOpen]=useState(false);const [loading,setLoading]=useState(false);const [success,setSuccess]=useState(false);const [error,setError]=useState('');const [roomId,setRoomId]=useState('')
 const minDate=useMemo(()=>clinicDate(),[])
 const availability=useCustomerAppointmentSlots(date,doctorId,roomId)
 const selectedSlotAvailable=availability.slots.some((slot)=>slot.time===time&&slot.status==='available')
 const selectedService=services.find((service)=>service.id===serviceId)
 const selectedDoctor=doctors.find((doctor)=>doctor.id===doctorId)
 async function submit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault()
  if (!canBook || loading) return
  setError('')
  const scheduledAt = clinicSlotDate(date, time)
  if (!scheduledAt || !selectedSlotAvailable) {
    setError('Vui lòng chọn khung giờ còn trống.')
    return
  }
  setLoading(true)
  try {
    const result = await createCustomerAppointment({roomId:roomId||undefined,employeeId:doctorId||undefined,serviceId,scheduledAt:scheduledAt.toISOString()})
    if (result.success) setSuccess(true)
    else if ('authRequired' in result && result.authRequired) { setAuthExpired(true); setOpen(false); setError(result.error || 'Vui lòng đăng nhập lại.') }
    else { setError(result.error || 'Không thể tạo lịch hẹn.'); availability.reload() }
  } catch {
    setError('Kết nối gián đoạn. Vui lòng thử lại.')
  } finally {
    setLoading(false)
  }
 }
 const continueBooking=()=>{setError('');if(!canBook){setError('Vui lòng đăng nhập trước khi đặt lịch.');return}if(!serviceId){setError('Vui lòng chọn dịch vụ.');return}if(!selectedSlotAvailable){setError('Vui lòng chọn khung giờ còn trống trước khi tiếp tục.');return}setOpen(true)}

 return <section id="dat-lich" className="scroll-mt-24 px-5 pb-7 md:px-10"><div className="rounded-[24px] border border-[#d5e5f3] bg-white p-5 shadow-[0_18px_45px_rgba(34,92,142,.10)] md:p-7"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--booking-tint,#e8f4ff)] text-[var(--booking-accent,#0963bb)]"><CalendarDays size={21}/></span><div><h2 className="text-2xl font-black text-[var(--booking-ink,#0c3865)]">{selectionAlreadyMade?'3. Chọn thời gian khám':'Đặt lịch khám'}</h2><p className="text-xs text-[#7890a5]">{selectionAlreadyMade?'Dịch vụ và bác sĩ đã được chọn ở bước trên.':'Chủ động chăm sóc làn da cùng DERMACARE'}</p></div></div>{selectionAlreadyMade?<div className="mt-5 grid gap-3 rounded-xl bg-[#eef7ff] p-4 text-sm md:grid-cols-2"><div><span className="block text-xs text-[#718196]">Dịch vụ đã chọn</span><strong className="text-[var(--booking-ink,#0c3865)]">{selectedService?.name||'Chưa chọn dịch vụ'}</strong>{selectedService&&<span className="ml-2 text-xs text-[var(--booking-accent,#176cce)]">{selectedService.price.toLocaleString('vi-VN')}₫</span>}</div><div><span className="block text-xs text-[#718196]">Bác sĩ đã chọn</span><strong className="text-[var(--booking-ink,#0c3865)]">{selectedDoctor?.name||'Bất kỳ bác sĩ phù hợp'}</strong></div></div>:<><div className="mt-5 grid grid-cols-3 overflow-hidden rounded-xl bg-[var(--booking-tint,#eaf4fe)] text-center text-xs font-bold text-[#60778d]">{['Khám da liễu','Thẩm mỹ y khoa','Tư vấn online'].map((name)=><button type="button" onClick={()=>setTab(name)} className={`p-3 ${tab===name?'border-b-2 border-[var(--booking-accent,#0963bb)] bg-white text-[var(--booking-accent,#0963bb)]':''}`} key={name}>{name}</button>)}</div><div className="mt-4 grid gap-x-4 gap-y-3 md:grid-cols-2"><label className="text-[11px] font-semibold text-[#61788e]">Chọn dịch vụ<select value={serviceId} onChange={(event)=>{setServiceId(event.target.value);onServiceChange?.(event.target.value)}} className="mt-1 block w-full rounded-lg border border-[#cbddeb] bg-white px-3 py-2.5 text-xs font-normal text-[#405c75]"><option value="">-- Chọn dịch vụ --</option>{services.map((service)=><option value={service.id} key={service.id}>{service.name} · {service.price.toLocaleString('vi-VN')}₫</option>)}</select></label><label className="text-[11px] font-semibold text-[#61788e]">Chọn bác sĩ (tùy chọn)<select value={doctorId} onChange={(event)=>{setDoctorId(event.target.value);onDoctorChange?.(event.target.value)}} className="mt-1 block w-full rounded-lg border border-[#cbddeb] bg-white px-3 py-2.5 text-xs font-normal text-[#405c75]"><option value="">Tất cả bác sĩ</option>{doctors.map((doctor)=><option value={doctor.id} key={doctor.id}>{doctor.name} · {doctor.department}</option>)}</select></label></div></>}<div className="mt-4 grid gap-x-4 gap-y-3 md:grid-cols-2"><label className="text-[11px] font-semibold text-[#61788e]">Chọn ngày khám<input min={minDate} value={date} onChange={(event)=>{setDate(event.target.value);setTime('')}} type="date" className="mt-1 block w-full rounded-lg border border-[#cbddeb] bg-white px-3 py-2.5 text-xs font-normal text-[#405c75]"/></label><label className="text-[11px] font-semibold text-[#61788e]">Chọn khung giờ<select value={time} disabled={!date||availability.loading||Boolean(availability.error)} onChange={(event)=>setTime(event.target.value)} className="mt-1 block w-full rounded-lg border border-[#cbddeb] bg-white px-3 py-2.5 text-xs font-normal text-[#405c75]"><option value="">{availability.loading?'Đang kiểm tra khung giờ…':'-- Chọn giờ (giờ Việt Nam) --'}</option>{availability.slots.map(({time,status})=><option value={time} key={time} disabled={status!=='available'}>{time}{status==='booked'?' · Đã đặt':status==='past'?' · Đã qua':''}</option>)}</select></label></div>{availability.error&&<p role="status" className="mt-2 text-xs text-red-700">{availability.error} <button type="button" className="underline" onClick={availability.reload}>Thử lại</button></p>}{error&&<p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}{canBook?<button type="button" onClick={continueBooking} className="mt-4 flex w-full items-center justify-center gap-3 rounded-lg bg-[var(--booking-accent,#0963bb)] py-3 text-sm font-extrabold text-white">Tiếp tục xác nhận <ArrowRight size={16}/></button>:<div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-[#edf7f2] p-3 text-sm"><p className="basis-full">Đăng nhập hoặc đăng ký hồ sơ trước khi xác nhận lịch hẹn.</p><Link className="font-bold underline" href={patientAuthLink('dang-nhap',returnTo)}>Đăng nhập để đặt lịch</Link><Link className="underline" href={patientAuthLink('dang-ky',returnTo)}>Đăng ký hồ sơ</Link></div>}<div className="mt-3 flex justify-between text-[10px] text-[#61788e]"><span>◇ Xác nhận tức thì</span><span>◉ Bảo mật thông tin</span><span>◷ Dễ dàng thay đổi lịch</span></div></div>
 {canBook&&open&&<div className="fixed inset-0 z-[80] grid place-items-center bg-[#0b2948]/55 p-4" role="dialog" aria-modal="true" aria-label="Xác nhận đặt lịch"><form onSubmit={submit} className="w-full max-w-xl rounded-[26px] bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-black tracking-[.13em] text-[var(--booking-accent,#176cce)]">XÁC NHẬN THÔNG TIN</p><h3 className="mt-1 font-serif text-3xl font-black text-[var(--booking-ink,#0c3865)]">Hoàn tất đặt lịch</h3><p className="mt-2 text-sm text-[#718196]">{selectedService?.name} · {date} lúc {time}</p></div><button type="button" onClick={()=>setOpen(false)} aria-label="Đóng" className="rounded-full border p-2"><X size={18}/></button></div>{success?<div className="py-10 text-center"><CheckCircle2 className="mx-auto text-emerald-500" size={60}/><h4 className="mt-4 text-2xl font-black text-[var(--booking-ink,#0c3865)]">Đặt lịch thành công</h4><p className="mt-2 text-sm text-[#718196]">Bạn có thể xem lịch trong hồ sơ của mình.</p><button type="button" onClick={()=>{setOpen(false);setSuccess(false)}} className="mt-6 rounded-xl bg-[var(--booking-accent,#176cce)] px-6 py-3 font-bold text-white">Hoàn tất</button></div>:<><div className="mt-6 grid gap-4 sm:grid-cols-2"><p className="text-sm">Đặt lịch cho <strong>{patientName}</strong></p><label className="text-sm font-semibold">Phòng khám<select value={roomId} onChange={(event)=>setRoomId(event.target.value)} className="mt-1 w-full rounded-xl border px-3 py-3 font-normal"><option value="">Chưa chọn phòng</option>{rooms.map((room)=><option value={room.id} key={room.id}>{room.name}{room.department?` · ${room.department}`:''}</option>)}</select></label></div>{error&&<p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}{!selectedSlotAvailable&&<p role="status" className="mt-3 text-sm text-[#60778d]">{availability.loading?'Đang kiểm tra khung giờ…':availability.error||'Khung giờ không còn trống cho lựa chọn hiện tại. Vui lòng chọn giờ hoặc phòng khác.'}</p>}<button disabled={loading||!selectedSlotAvailable} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--booking-accent,#176cce)] py-3.5 font-bold text-white disabled:opacity-60"><ShieldCheck size={18}/>{loading?'Đang ghi lịch hẹn...':'Xác nhận đặt lịch'}</button></>}</form></div>}
 </section>
}
