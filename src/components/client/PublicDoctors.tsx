'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import type { ClientPublicData } from '@/features/client-portal/server/getClientPublicData'

export function PublicDoctors({ data }: { data: ClientPublicData }) {
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState('Tất cả chuyên khoa')
  const doctors = useMemo(() => data.doctors.filter((doctor) => {
    const text = `${doctor.name} ${doctor.department} ${doctor.code}`.toLocaleLowerCase('vi')
    return (!query || text.includes(query.toLocaleLowerCase('vi'))) && (department === 'Tất cả chuyên khoa' || doctor.department === department)
  }), [data.doctors, department, query])

  return <>
    <div className="flex rounded-2xl border border-[#173f68] bg-white p-2 shadow-sm">
      <Search className="m-3 text-[#718196]"/>
      <input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 outline-none" placeholder="Tìm bác sĩ theo tên, khoa hoặc mã nhân viên..." aria-label="Tìm bác sĩ"/>
      <button type="button" className="rounded-xl bg-[#176cce] px-6 font-bold text-white">Tìm kiếm →</button>
    </div>
    <div className="mt-6 flex flex-wrap gap-2">{['Tất cả chuyên khoa', ...data.departments].map((name) => <button type="button" onClick={() => setDepartment(name)} key={name} className={`rounded-full border border-[#173f68] px-5 py-2 text-sm font-semibold ${department === name ? 'bg-[#176cce] text-white' : 'bg-white'}`}>{name}</button>)}</div>
    {!data.connected && <div className="mt-8 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-900">Không thể kết nối Neon. Trang không sử dụng dữ liệu mẫu; vui lòng kiểm tra lại kết nối database.</div>}
    {data.connected && !doctors.length && <div className="mt-8 rounded-2xl border border-dashed p-10 text-center text-[#718196]">Không tìm thấy bác sĩ phù hợp trong database.</div>}
    <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">{doctors.map((doctor) => <article key={doctor.id} className="overflow-hidden rounded-[28px] border border-[#173f68] bg-white shadow-sm">
      <div className="grid aspect-[4/3] place-items-center bg-gradient-to-br from-[#d9eafa] to-[#8db9df]"><div className="grid h-24 w-24 place-items-center rounded-full border-4 border-white/70 bg-white/25 text-3xl font-black text-white">{doctor.name.split(' ').slice(-2).map((part) => part[0]).join('')}</div></div>
      <div className="p-5"><small className="font-bold text-[#176cce]">{doctor.department}</small><h2 className="mt-2 min-h-14 text-xl font-black text-[#102f4d]">{doctor.name}</h2><div className="mt-3 space-y-1 text-sm text-[#718196]"><p>◎ Mã nhân viên: {doctor.code}</p><p>◷ {doctor.visits} lượt khám đã thực hiện</p><p>▣ {doctor.appointments} lịch hẹn được phân công</p></div><div className="mt-5 grid grid-cols-2 gap-2"><Link href={`/khachhang/doctors/${doctor.id}`} className="rounded-xl border border-[#173f68] py-2.5 text-center text-sm font-bold">Xem hồ sơ</Link><Link href={`/khachhang/appointments?doctor=${doctor.id}`} className="rounded-xl bg-[#176cce] py-2.5 text-center text-sm font-bold text-white">Đặt lịch</Link></div></div>
    </article>)}</div>
  </>
}
