import Link from 'next/link';
import prisma from '@/infrastructure/database/prisma';
import { getDoctorSession } from '@/server/auth/doctor-session';

export default async function DoctorQueuePage(){
 const session=await getDoctorSession();if(!session)return null;
 const visits=await prisma.visit.findMany({where:{employeeId:session.employeeId,status:{in:['WAITING','REGISTERED','IN_PROGRESS']}},include:{patient:true,room:true},orderBy:{visitDate:'asc'},take:50});
 return <main className="space-y-4"><header><h1 className="text-2xl font-bold text-[#20334b]">Hàng đợi khám</h1><p className="mt-1 text-xs text-[#6c7e93]">Danh sách lượt khám đang chờ theo thời điểm tiếp nhận</p></header><section className="overflow-hidden rounded-lg border border-[#dce5ef] bg-white"><table className="w-full text-left text-xs"><thead className="bg-[#f5f8fc] text-[#6c7e93]"><tr><th className="p-3">STT</th><th>Bệnh nhân</th><th>Thời điểm</th><th>Phòng</th><th>Trạng thái</th><th></th></tr></thead><tbody>{visits.map((v,i)=><tr key={v.id} className="border-t"><td className="p-3">{i+1}</td><td><strong>{v.patient.fullName}</strong><p className="text-[10px] text-[#6c7e93]">{v.patient.patientCode}</p></td><td>{v.visitDate.toLocaleString('vi-VN')}</td><td>{v.room?.name||'Chưa xếp phòng'}</td><td><span className="rounded-full bg-[#edf5ff] px-2 py-1 text-[#235f9e]">{v.status}</span></td><td><Link href={`/bacsi/clinical-services?visitId=${v.id}`} className="rounded bg-[#246dce] px-3 py-2 font-semibold text-white">Khám</Link></td></tr>)}</tbody></table>{visits.length===0&&<p className="p-10 text-center text-sm text-[#6c7e93]">Không có bệnh nhân đang chờ.</p>}</section></main>
}
