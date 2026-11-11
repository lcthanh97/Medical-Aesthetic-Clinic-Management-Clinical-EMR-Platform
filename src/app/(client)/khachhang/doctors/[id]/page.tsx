import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CalendarDays, ClipboardCheck, Stethoscope } from 'lucide-react'
import { getClientPublicData } from '@/features/client-portal/server/getClientPublicData'

export const dynamic = 'force-dynamic'

const date=(value:string|null)=>value?new Intl.DateTimeFormat('vi-VN',{dateStyle:'long'}).format(new Date(value)):'Chưa có lịch làm việc sắp tới'

export default async function Page({params}:{params:Promise<{id:string}>}){
 const {id}=await params;const data=await getClientPublicData();if(data.connected&&!data.doctors.some((doctor)=>doctor.id===id))notFound();const doctor=data.doctors.find((item)=>item.id===id)
 if(!doctor)return <main className="mx-auto max-w-[960px] px-6 py-20"><div className="rounded-2xl border border-amber-300 bg-amber-50 p-6">Không thể tải hồ sơ bác sĩ từ database.</div></main>
 return <main><section className="bg-[#eaf4ff]"><div className="mx-auto grid max-w-[1100px] gap-8 px-6 py-16 md:grid-cols-[300px_1fr]"><div className="grid aspect-square place-items-center rounded-[32px] bg-gradient-to-br from-[#d9eafa] to-[#8db9df]"><span className="grid h-32 w-32 place-items-center rounded-full border-4 border-white/70 text-5xl font-black text-white">{doctor.name.split(' ').slice(-2).map((part)=>part[0]).join('')}</span></div><div><Link href="/khachhang/doctors" className="inline-flex items-center gap-2 text-sm font-bold text-[#176cce]"><ArrowLeft size={16}/> Đội ngũ bác sĩ</Link><p className="mt-8 font-bold text-[#176cce]">{doctor.department}</p><h1 className="mt-2 font-serif text-5xl font-black text-[#102f4d]">{doctor.name}</h1><p className="mt-4 text-[#60778d]">Mã nhân viên: {doctor.code}</p><Link href={`/khachhang/appointments?doctor=${doctor.id}`} className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#176cce] px-6 py-3 font-bold text-white"><CalendarDays size={17}/> Đặt lịch với bác sĩ</Link></div></div></section><section className="mx-auto grid max-w-[1100px] gap-5 px-6 py-14 md:grid-cols-3">{[[Stethoscope,'Khoa chuyên môn',doctor.department],[ClipboardCheck,'Lượt khám đã thực hiện',`${doctor.visits} lượt khám`],[CalendarDays,'Lịch làm việc gần nhất',date(doctor.nextWorkDate)]].map(([Icon,label,value]:any)=><article className="rounded-2xl border border-[#cbddeb] bg-white p-6" key={label}><Icon className="text-[#176cce]"/><small className="mt-5 block text-[#718196]">{label}</small><strong className="mt-1 block text-lg text-[#102f4d]">{value}</strong></article>)}</section></main>
}
