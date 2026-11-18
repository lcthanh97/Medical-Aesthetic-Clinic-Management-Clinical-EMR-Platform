import Link from 'next/link';
import {
  Award,
  Stethoscope,
  ShieldCheck,
} from 'lucide-react';
import { PublicDoctors } from '@/components/client/PublicDoctors';
import { getClientPublicData } from '@/features/client-portal/server/getClientPublicData';

export const dynamic = 'force-dynamic';

const doctorHeroGallery = [
  {
    src: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=800&q=85',
    caption: 'Bác sĩ Chuyên khoa II Da liễu',
    badge: 'Lâm sàng & Soi da',
  },
  {
    src: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=800&q=85',
    caption: 'Chuyên gia Laser & Phục hồi Biểu bì',
    badge: 'Công nghệ Cao',
  },
  {
    src: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=800&q=85',
    caption: 'Bác sĩ Nội trú Da liễu Thẩm mỹ',
    badge: 'Phác đồ Cá nhân hóa',
  },
  {
    src: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=85',
    caption: 'Hội chẩn Đa chuyên khoa & AI Vision',
    badge: 'Chuẩn Quốc tế',
  },
];

export default async function Page() {
  const data = await getClientPublicData();
  return (
    <main className="pb-16">
      <section data-client-subhero>
        <div className="mx-auto grid max-w-[1240px] items-center gap-10 px-6 py-10 lg:grid-cols-[1fr_1.08fr] lg:px-10">
          <div data-client-intro>
            <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-[#0D9488] border border-teal-200">
              <ShieldCheck size={14} /> Trang chủ › Đội ngũ bác sĩ chuyên khoa
            </span>
            <h1 className="mt-4 font-heading text-4xl font-extrabold leading-[1.08] text-slate-900 sm:text-5xl">
              Đội ngũ Bác sĩ Da liễu
              <br />
              <span className="text-[#0D9488]">Chuyên môn vững vàng · Tận tâm điều trị</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm sm:text-base leading-relaxed text-slate-600">
              Danh sách bác sĩ chuyên khoa và lịch hoạt động lâm sàng được đồng bộ trực tiếp từ hệ thống bệnh án điện tử EMR.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/khachhang/appointments"
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm"
                style={{ background: 'linear-gradient(135deg, #0D9488 0%, #0284C7 100%)' }}
              >
                <Stethoscope size={16} /> Đặt lịch khám cùng bác sĩ
              </Link>
              <Link
                href="/khachhang/ai-chan-doan"
                className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50/90 px-4 py-2.5 text-xs sm:text-sm font-bold text-[#0D9488] hover:bg-[#0D9488] hover:text-white transition-colors"
              >
                <Stethoscope size={16} /> Sàng lọc AI trước khám
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-3">
                <Award className="h-4 w-4 text-[#0D9488]" />
                <strong className="mt-1 block text-xs font-bold text-slate-900">100% Bác sĩ CK</strong>
                <span className="text-[11px] text-slate-500">Chứng chỉ hành nghề</span>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-3">
                <ShieldCheck className="h-4 w-4 text-[#0284C7]" />
                <strong className="mt-1 block text-xs font-bold text-slate-900">Phác đồ Chuẩn Y khoa</strong>
                <span className="text-[11px] text-slate-500">Theo dõi sát 1:1</span>
              </div>
              <div className="col-span-2 sm:col-span-1 rounded-2xl border border-slate-200/80 bg-white/90 p-3">
                <Stethoscope className="h-4 w-4 text-[#F97316]" />
                <strong className="mt-1 block text-xs font-bold text-slate-900">Trợ lý da liễu</strong>
                <span className="text-[11px] text-slate-500">Trao đổi bằng văn bản</span>
              </div>
            </div>
          </div>

          <div data-client-hero-image className="grid grid-cols-2 gap-3.5">
            {doctorHeroGallery.map((item) => (
              <div
                key={item.caption}
                data-client-card
                className="group relative overflow-hidden rounded-3xl border border-white shadow-md"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.src}
                  alt={item.caption}
                  className="h-44 sm:h-48 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-900/40 to-transparent p-3.5 text-white">
                  <span className="inline-block rounded-md bg-[#0D9488] px-2 py-0.5 text-[10px] font-bold">
                    {item.badge}
                  </span>
                  <p className="mt-1 font-heading text-xs sm:text-sm font-bold leading-snug">
                    {item.caption}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-4 py-10 sm:px-6">
        <PublicDoctors data={data} />
      </section>
    </main>
  );
}
