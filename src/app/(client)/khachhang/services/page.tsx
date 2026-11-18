import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Stethoscope,
  ShieldCheck,
} from 'lucide-react';
import { getClientPublicData } from '@/features/client-portal/server/getClientPublicData';

export const dynamic = 'force-dynamic';

const images = [
  'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1512290900672-1f80b7e62243?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1000&q=85',
];

const technologyGallery = [
  {
    src: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=900&q=85',
    title: 'Hệ thống Soi da Quang học Phân cực 10×',
    desc: 'Phân tích cấu trúc sắc tố melanin & mao mạch dưới biểu bì.',
  },
  {
    src: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=900&q=85',
    title: 'Laser Xung dài & Phục hồi Hàng rào Biểu bì',
    desc: 'Điều trị chuẩn y khoa cho mụn viêm, sẹo rỗ và tổn thương sắc tố.',
  },
  {
    src: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=900&q=85',
    title: 'Chăm sóc & Tái tạo Sinh học Lâm sàng',
    desc: 'Liệu trình cá nhân hóa theo phân loại da Fitzpatrick.',
  },
];

const faq = [
  [
    'Dịch vụ có an toàn không?',
    'Mỗi chỉ định được bác sĩ chuyên khoa đánh giá dựa trên tình trạng da, hồ sơ bệnh án trước khi thực hiện.',
  ],
  [
    'Cần chuẩn bị gì trước khi điều trị?',
    'Không trang điểm đậm trước khi soi da, mang theo danh sách thuốc/sản phẩm bôi đang sử dụng và đến trước giờ hẹn 10 phút.',
  ],
  [
    'Mất bao lâu để thấy hiệu quả?',
    'Thời gian phụ thuộc vào cơ địa và mức độ tổn thương da; bác sĩ sẽ lập phác đồ theo từng giai đoạn rõ ràng trong EMR.',
  ],
  [
    'Có cần kiêng gì sau khi điều trị?',
    'Bác sĩ sẽ cập nhật hướng dẫn chăm sóc tại nhà và cảnh báo cần lưu ý trực tiếp vào hồ sơ bệnh nhân sau mỗi buổi.',
  ],
];

export default async function Page() {
  const data = await getClientPublicData();
  return (
    <main className="pb-16">
      <section data-client-subhero>
        <div className="mx-auto grid max-w-[1240px] items-center gap-8 px-6 py-10 lg:grid-cols-[1fr_.85fr_.95fr] lg:px-10">
          <div data-client-intro>
            <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-[#0D9488] border border-teal-200">
              <ShieldCheck size={14} /> Trang chủ › Dịch vụ Chuyên khoa
            </span>
            <h1 className="mt-4 font-heading text-4xl font-extrabold leading-[1.05] text-slate-900 sm:text-5xl">
              Dịch vụ Chuyên sâu
              <br />
              <span className="text-[#0D9488]">Cho làn da khỏe đẹp bền vững</span>
            </h1>
            <p className="mt-4 text-sm sm:text-base leading-relaxed text-slate-600">
              Danh mục kỹ thuật lâm sàng, thẩm mỹ nội khoa và mức giá niêm yết được đồng bộ trực tiếp từ cơ sở dữ liệu phòng khám.
            </p>
          </div>

          <div
            data-client-hero-image
            className="overflow-hidden rounded-[36px] border-2 border-white shadow-lg"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=900&q=85"
              alt="Dịch vụ Chuyên khoa Da liễu DERMACARE"
              className="h-[310px] w-full object-cover"
            />
          </div>

          <div
            data-client-card
            className="rounded-3xl border border-slate-200/90 bg-white/95 p-7 shadow-md"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-[11px] font-bold text-[#0284C7]">
              <ShieldCheck size={14} /> Chuẩn Y khoa &amp; EMR
            </span>
            <h2 className="mt-3 font-heading text-2xl font-extrabold text-slate-900">
              Không chỉ điều trị,
              <br />
              chúng tôi đồng hành cùng bạn
            </h2>
            <p className="mt-3 text-xs sm:text-sm leading-relaxed text-slate-600">
              Từ hỏi đáp da liễu, thăm khám bác sĩ chuyên khoa đến theo dõi phác đồ dài hạn bằng hồ sơ điện tử.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link
                data-client-cta
                href="/khachhang/appointments"
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold text-white shadow-sm"
                style={{ background: 'linear-gradient(135deg, #0D9488 0%, #0284C7 100%)' }}
              >
                Đặt lịch tư vấn <ArrowRight size={15} />
              </Link>
              <Link
                href="/khachhang/ai-chan-doan"
                className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-4 py-2.5 text-xs font-bold text-[#0D9488]"
              >
                <Stethoscope size={15} /> Khám AI 3D
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Clinical Technology Visual Gallery */}
      <section className="mx-auto max-w-[1240px] px-4 pt-12 sm:px-7">
        <div className="grid gap-5 md:grid-cols-3">
          {technologyGallery.map((item) => (
            <div
              key={item.title}
              data-client-card
              className="group relative overflow-hidden rounded-3xl border border-white bg-slate-900 shadow-md"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.src}
                alt={item.title}
                className="h-56 w-full object-cover opacity-85 transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/95 via-slate-900/60 to-transparent p-5 text-white">
                <h3 className="font-heading text-base font-extrabold">{item.title}</h3>
                <p className="mt-1 text-xs text-slate-200">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-4 py-12 sm:px-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-slate-900">
              Danh mục Dịch vụ Chuyên khoa
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Khám phá các dịch vụ và kỹ thuật điều trị đang hoạt động trong hệ thống.
            </p>
          </div>
          <span className="rounded-full bg-teal-50 px-4 py-1.5 text-xs font-bold text-[#0D9488] border border-teal-200">
            {data.services.length} dịch vụ lâm sàng
          </span>
        </div>

        <div className="mt-7 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data.services.map((service, index) => (
            <article
              key={service.id}
              data-client-card
              className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 shadow-sm"
            >
              <div>
                <div className="relative h-48 w-full overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={images[index % images.length]}
                    alt={service.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute left-3.5 top-3.5 rounded-full bg-slate-900/80 px-3 py-1 text-[11px] font-bold text-teal-300">
                    {service.category}
                  </span>
                  <span className="absolute right-3.5 top-3.5 rounded-lg bg-white/90 px-2.5 py-0.5 font-mono text-[11px] font-bold text-slate-800">
                    {service.code}
                  </span>
                </div>

                <div className="p-6 pb-3">
                  <h3 className="font-heading text-xl font-extrabold text-slate-900">
                    {service.name}
                  </h3>
                  <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <p className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-[#0D9488]" />
                      <span>Thăm khám &amp; chỉ định bởi Bác sĩ Chuyên khoa</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-[#0284C7]" />
                      <span>Lưu trữ hình ảnh tiến triển trong hồ sơ EMR</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
                <strong className="font-heading text-lg font-extrabold text-[#0D9488]">
                  {service.price.toLocaleString('vi-VN')} ₫
                </strong>
                <Link
                  href={`/khachhang/services/${service.id}`}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-white shadow-xs"
                  style={{ background: 'linear-gradient(135deg, #0D9488 0%, #0284C7 100%)' }}
                >
                  Chi tiết dịch vụ →
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-14 rounded-3xl border border-teal-200/70 bg-gradient-to-r from-teal-50/90 via-white to-sky-50/90 p-7 shadow-sm">
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900">
            Quy trình Trải nghiệm Dịch vụ Chuẩn Y khoa
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-5">
            {[
              '1. Hỏi về da liễu',
              '2. Bác sĩ thăm khám lâm sàng',
              '3. Thiết lập phác đồ cá nhân hóa',
              '4. Thực hiện kỹ thuật vô trùng',
              '5. Theo dõi tiến triển trên EMR',
            ].map((name, index) => (
              <div
                key={name}
                data-client-reveal
                className="rounded-2xl border border-white bg-white/90 p-4 shadow-xs"
              >
                <span className="font-heading text-2xl font-extrabold text-[#0D9488]">
                  0{index + 1}
                </span>
                <strong className="mt-1.5 block text-xs sm:text-sm font-bold text-slate-800">
                  {name}
                </strong>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-14 max-w-3xl">
          <h2 className="text-center font-heading text-3xl font-extrabold text-slate-900">
            Câu hỏi thường gặp
          </h2>
          <div className="mt-6 space-y-3">
            {faq.map(([question, answer]) => (
              <details
                key={question}
                data-client-reveal
                className="group rounded-2xl border border-slate-200/90 bg-white/95 p-5 shadow-xs"
              >
                <summary className="cursor-pointer font-heading text-sm sm:text-base font-bold text-slate-900">
                  {question}
                </summary>
                <p className="mt-3 text-xs sm:text-sm leading-relaxed text-slate-600">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
