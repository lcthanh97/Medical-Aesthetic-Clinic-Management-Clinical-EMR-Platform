import Link from 'next/link';
import { Activity, ArrowRight, CalendarCheck, CircleCheck, Users } from 'lucide-react';
import prisma from '@/infrastructure/database/prisma';

export default async function BacSiDashboardPage(){
 const start=new Date();start.setHours(0,0,0,0);const end=new Date(start);end.setDate(end.getDate()+1);
 const [visits,sessions,workSchedule]=await Promise.all([
  prisma.visit.findMany({where:{visitDate:{gte:start,lt:end}},include:{patient:true,room:true,employee:true},orderBy:{visitDate:'asc'},take:50}),
  prisma.treatmentSession.findMany({where:{scheduledAt:{gte:start,lt:end}},include:{stage:{include:{plan:{include:{patient:true}}}},performedBy:true},orderBy:{scheduledAt:'asc'},take:20}),
  prisma.workSchedule.findFirst({where:{workDate:{gte:start,lt:end}},include:{employee:true},orderBy:{startTime:'asc'}}),
 ]);
 const completed=visits.filter(v=>['COMPLETED','DONE'].includes(v.status.toUpperCase())).length;
 const waiting=visits.filter(v=>['WAITING','REGISTERED'].includes(v.status.toUpperCase()));
 const doctor=workSchedule?.employee?.fullName||visits.find(v=>v.employee)?.employee?.fullName||'Bác sĩ';
 return <div className="mx-auto max-w-[1180px] space-y-5 text-[#20334b]">
  <header className="flex flex-col justify-between gap-3 md:flex-row md:items-end"><div><h1 className="text-[25px] font-bold">Xin chào, {doctor}</h1><p className="mt-1 text-[12px] text-[#6c7e93]">Dữ liệu công việc ngày {start.toLocaleDateString('vi-VN')} từ hệ thống phòng khám</p></div><Link href="/reception/visits" className="inline-flex h-10 items-center gap-2 rounded-[7px] bg-[#246dce] px-4 text-[12px] font-semibold text-white"><ArrowRight size={15}/> Mở hàng đợi khám</Link></header>
  <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[
   ['Lượt khám hôm nay',visits.length,`${visits.length} lượt ghi nhận`,CalendarCheck],['Đã hoàn tất',completed,`${visits.length?Math.round(completed/visits.length*100):0}% trong ngày`,CircleCheck],['Bệnh nhân đang chờ',waiting.length,'Đang chờ bác sĩ tiếp nhận',Users],['Buổi điều trị',sessions.length,`${sessions.filter(x=>x.status==='COMPLETED').length} buổi hoàn tất`,Activity],
  ].map(([label,value,note,Icon]:any)=><article key={label} className="rounded-[9px] border border-[#dce5ef] bg-white p-5"><div className="flex items-start justify-between"><p className="text-[11px] text-[#6c7e93]">{label}</p><Icon size={17} className="text-[#246dce]"/></div><strong className="mt-3 block text-[28px]">{value}</strong><p className="mt-3 text-[10px] text-[#8091a5]">{note}</p></article>)}</section>
  <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
   <section className="overflow-hidden rounded-[9px] border border-[#dce5ef] bg-white"><div className="flex items-start justify-between p-5 pb-3"><div><h2 className="text-[15px] font-bold">Hàng đợi tiếp theo</h2><p className="mt-1 text-[10px] text-[#6c7e93]">Sắp xếp theo thời điểm lượt khám</p></div><Link href="/reception/visits" className="text-[10px] font-semibold text-[#246dce]">Xem tất cả →</Link></div><div className="mx-5 overflow-x-auto rounded-[7px] border border-[#dce5ef]"><table className="w-full text-left text-[10px]"><thead className="bg-[#f5f8fc] text-[#6c7e93]"><tr><th className="p-3">STT</th><th>Bệnh nhân</th><th>Phòng</th><th>Thời điểm</th><th>Trạng thái</th></tr></thead><tbody>{waiting.map((v,i)=><tr key={v.id} className="border-t border-[#e6edf5]"><td className="p-3">{i+1}</td><td><strong className="block text-[11px]">{v.patient.fullName}</strong><span>{v.patient.patientCode}</span></td><td>{v.room?.name||'Chưa xếp'}</td><td>{v.visitDate.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</td><td><span className="rounded-full bg-[#edf5ff] px-2 py-1 text-[#235f9e]">{v.status}</span></td></tr>)}</tbody></table>{waiting.length===0&&<p className="p-8 text-center text-xs text-[#6c7e93]">Không có bệnh nhân đang chờ.</p>}</div><div className="p-5 text-[10px] text-[#6c7e93]">Dữ liệu đồng bộ trực tiếp từ bảng Visit.</div></section>
   <aside className="rounded-[9px] border border-[#dce5ef] bg-white p-5"><h2 className="text-[15px] font-bold">Buổi điều trị hôm nay</h2><p className="mt-1 text-[10px] text-[#6c7e93]">{sessions.length} buổi trong lịch</p>{sessions.map(s=><div key={s.id} className="flex gap-3 border-b border-[#e6edf5] py-3 last:border-0"><span className="h-fit rounded bg-[#edf5ff] px-2 py-1 text-[10px] font-semibold text-[#235f9e]">{s.scheduledAt?.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})||'—'}</span><div><strong className="text-[11px]">{s.stage.plan.patient.fullName}</strong><p className="mt-1 text-[9px] text-[#6c7e93]">{s.stage.plan.name} · Buổi {s.sessionNo}</p><span className="mt-1 inline-block text-[9px] text-emerald-700">{s.status}</span></div></div>)}{sessions.length===0&&<p className="mt-5 text-xs text-[#6c7e93]">Chưa có buổi điều trị hôm nay.</p>}</aside>
  </div>
 </div>
}
