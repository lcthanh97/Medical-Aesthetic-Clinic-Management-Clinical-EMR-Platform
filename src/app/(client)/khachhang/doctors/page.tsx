import { PublicDoctors } from '@/components/client/PublicDoctors'
import { getClientPublicData } from '@/features/client-portal/server/getClientPublicData'

export default async function Page(){const data=await getClientPublicData();return <main><section className="bg-[#eaf4ff] py-16 text-center"><p className="text-sm text-[#176cce]">Trang chủ › Đội ngũ bác sĩ</p><h1 className="mt-4 font-serif text-5xl font-black text-[#102f4d]">Đội ngũ bác sĩ<br/><span className="text-[#176cce]">Chuyên môn vững vàng</span></h1><p className="mx-auto mt-4 max-w-2xl text-[#718196]">Danh sách bác sĩ và hoạt động chuyên môn được đồng bộ trực tiếp từ hệ thống bệnh án điện tử.</p></section><section className="mx-auto max-w-[1240px] px-6 py-14"><PublicDoctors data={data}/></section></main>}
