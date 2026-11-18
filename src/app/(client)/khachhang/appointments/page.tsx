import Link from 'next/link';
import {
  CalendarCheck2,
  Clock,
  Stethoscope,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { getClientPublicData } from '@/features/client-portal/server/getClientPublicData';
import { AppointmentBookingExperience } from '@/components/client/AppointmentBookingExperience';

export const dynamic = 'force-dynamic';

const clinicGallery = [
  {
    src: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=900&q=85',
    title: 'Thăm khám da liễu',
    tag: 'Khám chuyên khoa',
  },
  {
    src: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=800&q=85',
    title: 'Phòng khám Chuyên khoa Chuẩn Quốc tế',
    tag: 'Vô trùng Lâm sàng',
  },
  {
    src: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=800&q=85',
    title: 'Liệu trình Cá nhân hóa EMR',
    tag: 'Theo dõi 1:1',
  },
];

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ doctor?: string }>;
}) {
  const data = await getClientPublicData();
  const { doctor } = await searchParams;

  const steps = [
    { icon: Stethoscope, label: 'Chọn dịch vụ & bác sĩ' },
    { icon: Clock, label: 'Chọn thời gian khám' },
    { icon: UserCheck, label: 'Đăng nhập hoặc đăng ký' },
    { icon: CalendarCheck2, label: 'Xác nhận đặt lịch' },
  ];

  return (
    <main className="pb-16">
      <section data-client-subhero>
        <div className="mx-auto grid max-w-[1240px] items-center gap-8 px-6 py-10 lg:grid-cols-[1.08fr_.92fr] lg:px-10">
          <div data-client-intro>
            <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-[#0D9488] border border-teal-200">
              <ShieldCheck size={14} /> Đặt lịch khám Chuyên khoa Da liễu
            </span>
            <h1 className="mt-4 font-heading text-4xl font-extrabold leading-[1.1] text-slate-900 sm:text-5xl">
              Đặt lịch khám dễ dàng
              <br />
              <span className="text-[#0D9488]">Đồng bộ trực tiếp Hồ sơ Bệnh án</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm sm:text-base leading-relaxed text-slate-600">
              Quy trình 4 bước nhanh chóng: Chọn dịch vụ chuyên khoa &amp; bác sĩ điều trị → Chọn khung giờ phù hợp → Xác nhận thông tin → Nhận mã phiếu khám tức thì.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/khachhang/ai-chan-doan"
                className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-4 py-2 text-xs font-bold text-[#0D9488] border border-teal-200 hover:bg-[#0D9488] hover:text-white transition-colors"
              >
                <Stethoscope size={15} /> Hỏi trợ lý da liễu
              </Link>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-600">
                <ShieldCheck size={15} className="text-[#0284C7]" /> Bảo mật dữ liệu y tế
              </span>
            </div>
          </div>

          {/* Fixed Clean Multi-Image Showcase (No overlapping text on face!) */}
          <div data-client-hero-image className="grid grid-cols-2 gap-3.5">
            <div
              data-client-card
              className="relative col-span-2 overflow-hidden rounded-3xl border border-white shadow-md"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={clinicGallery[0].src}
                alt={clinicGallery[0].title}
                className="h-52 w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-900/45 to-transparent p-4 text-white">
                <span className="inline-block rounded-md bg-[#0D9488] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                  {clinicGallery[0].tag}
                </span>
                <p className="mt-1 font-heading text-sm sm:text-base font-bold">
                  Chủ động đặt lịch theo đúng bác sĩ và thời gian của bạn
                </p>
              </div>
            </div>

            {clinicGallery.slice(1).map((item) => (
              <div
                key={item.title}
                data-client-card
                className="relative overflow-hidden rounded-2xl border border-white shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.src}
                  alt={item.title}
                  className="h-36 w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent p-3 text-white">
                  <span className="text-[10px] font-bold text-teal-300">{item.tag}</span>
                  <p className="font-heading text-xs font-bold leading-snug">{item.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-4 py-8 sm:px-7">
        <div className="grid grid-cols-2 gap-3 rounded-3xl border border-slate-200/90 bg-white/95 p-3 shadow-sm md:grid-cols-4">
          {steps.map(({ icon: Icon, label }, index) => (
            <div
              key={label}
              data-client-reveal
              className={`flex items-center gap-3 rounded-2xl p-3.5 text-xs sm:text-sm font-bold transition-colors ${
                index === 0
                  ? 'bg-gradient-to-r from-teal-50 to-sky-50 text-[#0D9488] border border-teal-200/70'
                  : 'text-slate-600 bg-slate-50/70'
              }`}
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl font-extrabold ${
                  index === 0
                    ? 'bg-gradient-to-br from-[#0D9488] to-[#0284C7] text-white shadow-xs'
                    : 'bg-white text-slate-500 border border-slate-200'
                }`}
              >
                <Icon size={17} />
              </span>
              <span>
                <small className="block text-[10px] font-semibold uppercase text-slate-400">
                  Bước 0{index + 1}
                </small>
                {label}
              </span>
            </div>
          ))}
        </div>

        <AppointmentBookingExperience
          services={data.services}
          doctors={data.doctors}
          rooms={data.rooms}
          initialDoctorId={doctor}
        />

        <div className="mt-6 flex items-center justify-between">
          <Link
            href="/khachhang"
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-700 hover:border-[#0D9488] hover:text-[#0D9488]"
          >
            ← Quay lại trang chủ
          </Link>
        </div>
      </section>
    </main>
  );
}
