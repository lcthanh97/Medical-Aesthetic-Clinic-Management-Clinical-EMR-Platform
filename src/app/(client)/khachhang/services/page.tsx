import Link from 'next/link'
import { Activity, ArrowRight, Stethoscope } from 'lucide-react'
import { getClientPublicData } from '@/features/client-portal/server/getClientPublicData'

const cash = (value: number) => `${value.toLocaleString('vi-VN')}₫`

export default async function Page(){
  const data=await getClientPublicData()
  const groups=Object.entries(data.services.reduce<Record<string,typeof data.services>>((result,service)=>{
    const category=service.category||'Khác'
    ;(result[category]??=[]).push(service)
    return result
  },{}))
  return <main>
    <section className="bg-[#eaf4ff] py-16 text-center"><p className="text-sm text-[#176cce]">Trang chủ › Dịch vụ</p><h1 className="mt-4 font-serif text-5xl font-black text-[#102f4d]">Dịch vụ chuyên sâu<br/><span className="text-[#176cce]">Cho làn da khỏe đẹp bền vững</span></h1><p className="mx-auto mt-4 max-w-2xl text-[#718196]">Danh mục và mức giá đang áp dụng được lấy trực tiếp từ cơ sở dữ liệu phòng khám.</p></section>
    <section className="mx-auto max-w-[1160px] px-6 py-16">
      {!data.connected&&<div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-900">Không thể kết nối Neon. Hệ thống không hiển thị dữ liệu dịch vụ giả.</div>}
      {data.connected&&!data.services.length&&<div className="rounded-2xl border border-dashed p-10 text-center text-[#718196]">Database chưa có dịch vụ đang hoạt động.</div>}
      {groups.map(([category,services],groupIndex)=><section className="mb-14" key={category}><div className="flex items-end justify-between border-b border-[#d8e5f1] pb-4"><div><p className="text-xs font-black tracking-[.15em] text-[#176cce]">NHÓM DỊCH VỤ {String(groupIndex+1).padStart(2,'0')}</p><h2 className="mt-1 font-serif text-3xl font-black text-[#102f4d]">{category}</h2></div><span className="text-sm text-[#718196]">{services?.length??0} dịch vụ</span></div><div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{services?.map((service,index)=><article className="group rounded-[24px] border border-[#b9cee0] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl" key={service.id}><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#eaf4ff] text-[#176cce]">{index%2?<Activity/>:<Stethoscope/>}</span><small className="mt-5 block font-bold text-[#176cce]">{service.code}</small><h3 className="mt-1 min-h-14 text-xl font-black text-[#102f4d]">{service.name}</h3><p className="mt-4 text-sm text-[#718196]">Nhóm: {service.category}</p><div className="mt-6 flex items-center justify-between border-t pt-5"><strong className="text-[#176cce]">{cash(service.price)}</strong><Link href={`/khachhang/services/${service.id}`} className="inline-flex items-center gap-2 text-sm font-bold">Chi tiết <ArrowRight size={15}/></Link></div></article>)}</div></section>)}
      {data.services.length>0&&<div className="rounded-[28px] bg-[#123b62] p-8 text-white md:flex md:items-center md:justify-between"><div><h2 className="font-serif text-3xl font-black">Bạn cần bác sĩ tư vấn dịch vụ phù hợp?</h2><p className="mt-2 text-blue-100">Đặt lịch và lựa chọn bác sĩ thật đang có trong hệ thống.</p></div><Link href="/khachhang/appointments" className="mt-5 inline-flex rounded-full bg-white px-6 py-3 font-bold text-[#176cce] md:mt-0">Đặt lịch ngay →</Link></div>}
    </section>
  </main>
}
