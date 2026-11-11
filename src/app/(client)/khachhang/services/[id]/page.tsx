import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CalendarDays, CircleDollarSign, Stethoscope } from 'lucide-react'
import { getClientPublicData } from '@/features/client-portal/server/getClientPublicData'

export const dynamic = 'force-dynamic'

export default async function Page({params}:{params:Promise<{id:string}>}){
  const {id}=await params
  const data=await getClientPublicData()
  if(data.connected&&!data.services.some((service)=>service.id===id))notFound()
  const service=data.services.find((item)=>item.id===id)
  if(!service)return <main className="mx-auto max-w-[960px] px-6 py-20"><div className="rounded-2xl border border-amber-300 bg-amber-50 p-6">Không thể tải dịch vụ từ database.</div></main>
  return <main><section className="bg-[#eaf4ff]"><div className="mx-auto max-w-[1100px] px-6 py-16"><Link href="/khachhang/services" className="inline-flex items-center gap-2 text-sm font-bold text-[#176cce]"><ArrowLeft size={16}/> Tất cả dịch vụ</Link><p className="mt-8 text-sm font-black tracking-[.14em] text-[#176cce]">{service.category} · {service.code}</p><h1 className="mt-3 max-w-3xl font-serif text-5xl font-black text-[#102f4d]">{service.name}</h1></div></section><section className="mx-auto grid max-w-[1100px] gap-8 px-6 py-14 lg:grid-cols-[1fr_360px]"><article className="rounded-[28px] border border-[#cbddeb] bg-white p-8"><h2 className="font-serif text-3xl font-black text-[#102f4d]">Thông tin dịch vụ</h2><div className="mt-7 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl bg-[#f3f8fd] p-5"><Stethoscope className="text-[#176cce]"/><small className="mt-4 block text-[#718196]">Nhóm chuyên môn</small><strong>{service.category}</strong></div><div className="rounded-2xl bg-[#f3f8fd] p-5"><CircleDollarSign className="text-[#176cce]"/><small className="mt-4 block text-[#718196]">Giá cơ sở trong database</small><strong>{service.price.toLocaleString('vi-VN')}₫</strong></div></div><p className="mt-7 leading-8 text-[#60778d]">Thông tin chỉ định và liệu trình sẽ được bác sĩ xác định sau khi thăm khám. Hệ thống không tự tạo mô tả y khoa khi database chưa lưu nội dung này.</p></article><aside className="h-fit rounded-[28px] bg-[#123b62] p-7 text-white"><CalendarDays size={30}/><h2 className="mt-5 font-serif text-2xl font-black">Đặt lịch tư vấn</h2><p className="mt-3 text-sm leading-6 text-blue-100">Chọn bác sĩ và thời gian phù hợp trên dữ liệu lịch thật.</p><Link href="/khachhang/appointments" className="mt-6 block rounded-xl bg-white py-3 text-center font-bold text-[#176cce]">Đặt lịch ngay →</Link></aside></section></main>
}
