import Link from 'next/link';
import {
  Activity,
  ArrowDown,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Layers,
  HeartPulse,
  Stethoscope,
  ScanLine,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import { HomeBookingForm } from '@/components/client/HomeBookingForm';
import { KhachHang3DAiSection } from '@/components/client/KhachHang3DAiSection';
import { getClientPublicData } from '@/features/client-portal/server/getClientPublicData';
import styles from './Home.module.css';

export const dynamic = 'force-dynamic';

const heroImage =
  'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1400&q=85';

const serviceImages = [
  'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=900&q=85',
];

const doctorPortraits = [
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=700&q=85',
  'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=700&q=85',
  'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=700&q=85',
  'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=700&q=85',
];

const clinicalGallery = [
  {
    src: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=900&q=85',
    tag: 'DA LIỄU',
    title: 'Phân tích Vi cấu trúc Sắc tố & Biểu bì',
  },
  {
    src: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=900&q=85',
    tag: 'DERMOSCOPY 10×',
    title: 'Hệ thống Soi da Quang học Phân cực',
  },
  {
    src: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=900&q=85',
    tag: 'LASER CLINICAL',
    title: 'Điều trị & Tái tạo Hàng rào Bảo vệ Da',
  },
  {
    src: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=900&q=85',
    tag: 'EMR DIGITAL',
    title: 'Hội chẩn Bác sĩ & Hồ sơ Bệnh án Số',
  },
];

const careSteps = [
  {
    icon: Stethoscope,
    title: '1. Hỏi về da liễu',
    description:
      'Mô tả triệu chứng và hỏi thêm về cách chăm sóc hoặc thời điểm nên đi khám.',
  },
  {
    icon: CalendarDays,
    title: '2. Đặt lịch khám chuyên khoa',
    description: 'Chọn dịch vụ, bác sĩ da liễu và khung giờ phù hợp ngay trên hệ thống.',
  },
  {
    icon: Stethoscope,
    title: '3. Bác sĩ thăm khám & Phác đồ',
    description:
      'Bác sĩ thăm khám và xây dựng phác đồ phù hợp với tình trạng da.',
  },
  {
    icon: ShieldCheck,
    title: '4. Theo dõi hồ sơ điều trị số',
    description:
      'Xem lại hình ảnh tiến triển, đơn thuốc và kết quả cận lâm sàng trực tuyến.',
  },
];

export default async function ClientHome() {
  const data = await getClientPublicData();
  const featuredServices = new Map<string, (typeof data.services)[number]>();
  for (const service of data.services) {
    const name = service.name.trim().toLocaleLowerCase('vi-VN');
    if (!featuredServices.has(name)) featuredServices.set(name, service);
    if (featuredServices.size === 5) break;
  }
  const services = [...featuredServices.values()];
  const doctors = data.doctors.slice(0, 4);
  const stats = [
    { icon: UsersRound, count: data.stats.patients, label: 'Hồ sơ bệnh nhân' },
    { icon: Stethoscope, count: data.stats.doctors, label: 'Bác sĩ da liễu' },
    { icon: CalendarDays, count: data.stats.appointments, label: 'Lịch hẹn' },
    { icon: Activity, count: data.stats.visits, label: 'Lượt khám lâm sàng' },
  ];

  return (
    <main className={styles.home} data-client-home>
      {!data.connected && (
        <p className={styles.notice} role="status">
          Một số thông tin phòng khám hiện chưa tải được. Vui lòng thử lại sau.
        </p>
      )}

      {/* 3D BIO-TECH CLINICAL HERO */}
      <section className={styles.hero} aria-labelledby="home-heading">
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy} data-client-intro>
            <p className={styles.eyebrow}>
              <ShieldCheck size={15} aria-hidden="true" /> Phòng khám chuyên khoa Da liễu &amp; Thẩm mỹ
            </p>
            <h1 id="home-heading">
              Làn da khỏe.
              <br />
              <em>Hỏi đáp da liễu dễ dàng.</em>
            </h1>
            <p className={styles.heroDescription}>
              Trò chuyện với trợ lý da liễu để được giải đáp ban đầu và đặt lịch với bác sĩ chuyên khoa khi cần.
            </p>
            <div className={styles.actions}>
              <a href="#ai-chan-doan" className={styles.primary} data-client-cta>
                <Stethoscope size={18} aria-hidden="true" />
                Hỏi về da liễu <ArrowDown size={16} aria-hidden="true" />
              </a>
              <a href="#dat-lich" className={styles.secondary} data-client-cta>
                Đặt lịch bác sĩ <ArrowUpRight size={17} aria-hidden="true" />
              </a>
              <Link href="/khachhang/ai-chan-doan" className={styles.tertiaryBtn}>
                Mở trang trợ lý ↗
              </Link>
            </div>

            <div className={styles.heroBadges}>
              <div className={styles.heroBadgeItem}>
                <Layers size={15} className="text-[#0D9488]" />
                <span>
                  <strong>Hỏi đáp</strong> · Da, tóc và móng
                </span>
              </div>
              <div className={styles.heroBadgeItem}>
                <ScanLine size={15} className="text-[#0284C7]" />
                <span>
                  <strong>Đặt lịch</strong> · Theo giờ Việt Nam
                </span>
              </div>
              <div className={styles.heroBadgeItem}>
                <HeartPulse size={15} className="text-[#F97316]" />
                <span>
                  <strong>Cảnh báo sớm</strong> · Red Flags
                </span>
              </div>
            </div>
          </div>

          <div className={styles.heroArt} data-client-hero-image aria-hidden="true">
            <div className={styles.holoFrame}>
              <div className={styles.holoHeader}>
                <span className={styles.holoDot} />
                <span>MINH HỌA THĂM KHÁM</span>
                <span className={styles.holoCode}>DERMACARE</span>
              </div>
              <div className={styles.photo}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={heroImage}
                  alt=""
                  fetchPriority="high"
                  width={1400}
                  height={1600}
                />
                <div className={styles.heroLaserBeam} />
              </div>
              <div className={styles.photoCaption}>
                <ShieldCheck size={22} className="text-[#0D9488] shrink-0" />
                <span>
                  Trợ lý da liễu &amp; Bác sĩ chuyên khoa
                  <br />
                  <strong>Đồng bộ Hồ sơ Bệnh án Điện tử EMR</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EMBEDDED FULL 3D AI DERMATOLOGY DIAGNOSIS & CRUD SECTION */}
      <KhachHang3DAiSection />

      {/* CLINICAL IMAGING GALLERY */}
      <section className={styles.section} aria-label="Công nghệ và không gian lâm sàng">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Hệ sinh thái Chẩn đoán &amp; Điều trị</p>
            <h2>Không gian Lâm sàng &amp; Công nghệ AI</h2>
          </div>
          <Link href="/khachhang/ai-chan-doan" className={styles.textLink}>
            Mở trợ lý da liễu <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {clinicalGallery.map((item) => (
            <div
              key={item.title}
              data-client-card
              className="group relative overflow-hidden rounded-3xl border border-white bg-slate-900 shadow-sm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.src}
                alt={item.title}
                loading="lazy"
                className="h-56 w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-900/45 to-transparent p-4 text-white">
                <span className="inline-block rounded-md bg-[#0D9488] px-2 py-0.5 text-[10px] font-bold tracking-wider">
                  {item.tag}
                </span>
                <h3 className="mt-1.5 font-heading text-sm font-bold leading-snug">
                  {item.title}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3D GLASS BOOKING SECTION */}
      <div className={styles.booking} data-client-card>
        <div className={styles.bookingNote}>
          <CalendarDays size={32} aria-hidden="true" />
          <p>Đặt lịch khám trực tiếp cùng Bác sĩ Chuyên khoa</p>
          <span className="text-xs font-medium opacity-90">
            Kết nối trực tiếp từ kết quả sàng lọc AI Da liễu
          </span>
          <ArrowDownRight className={styles.bookingArrow} size={28} aria-hidden="true" />
        </div>
        <HomeBookingForm
          services={data.services}
          doctors={data.doctors}
          rooms={data.rooms}
        />
      </div>

      {/* 3D CLINIC STATS */}
      {data.connected && (
        <dl className={styles.stats} aria-label="Hoạt động của phòng khám">
          {stats.map(({ icon: Icon, count, label }) => (
            <div key={label} data-client-card className={styles.statCard}>
              <span className={styles.statIcon}>
                <Icon size={22} aria-hidden="true" />
              </span>
              <div>
                <dd>{count.toLocaleString('vi-VN')}</dd>
                <dt>{label}</dt>
              </div>
            </div>
          ))}
        </dl>
      )}

      {/* 3D FEATURED SERVICES */}
      <section id="dich-vu" className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Khám &amp; điều trị công nghệ cao</p>
            <h2>Dịch vụ Chuyên khoa Nổi bật</h2>
          </div>
          <Link href="/khachhang/services" className={styles.textLink}>
            Xem tất cả dịch vụ <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </div>
        {services.length ? (
          <div className={styles.serviceGrid}>
            {services.map((service, index) => (
              <Link
                key={service.id}
                href={`/khachhang/services/${service.id}`}
                data-client-card
                className={
                  index === 0
                    ? `${styles.serviceCard} ${styles.featured}`
                    : styles.serviceCard
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={serviceImages[index % serviceImages.length]}
                  alt=""
                  loading="lazy"
                  width={900}
                  height={600}
                />
                <div className={styles.serviceContent}>
                  <p>{service.category}</p>
                  <h3>{service.name}</h3>
                  <strong>{service.price.toLocaleString('vi-VN')} ₫</strong>
                </div>
                <span className={styles.cardArrow} aria-hidden="true">
                  <ArrowUpRight size={20} />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>Hiện chưa có dịch vụ để hiển thị.</p>
        )}
      </section>

      {/* 3D DOCTORS TEAM WITH REAL CLINICAL PORTRAITS */}
      <section className={styles.doctors}>
        <div className={styles.section}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>Chuyên môn lâm sàng</p>
              <h2>Đội ngũ Bác sĩ Da liễu</h2>
            </div>
            <Link href="/khachhang/doctors" className={styles.textLink}>
              Xem tất cả bác sĩ <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
          </div>
          {doctors.length ? (
            <div className={styles.doctorGrid}>
              {doctors.map((doctor, idx) => (
                <Link
                  href={`/khachhang/doctors/${doctor.id}`}
                  key={doctor.id}
                  className={styles.doctorCard}
                  data-client-card
                >
                  <div className="relative h-52 w-full overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={doctorPortraits[idx % doctorPortraits.length]}
                      alt={doctor.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 font-heading text-xs font-extrabold text-[#0D9488] shadow-xs">
                      {doctor.name
                        .trim()
                        .split(/\s+/)
                        .slice(-2)
                        .map((part) => part[0])
                        .join('')}
                    </span>
                  </div>
                  <div className={styles.doctorDetails}>
                    <p>{doctor.department}</p>
                    <h3>{doctor.name}</h3>
                    <span>
                      Xem hồ sơ bác sĩ <ArrowRight size={15} aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className={styles.empty}>Hiện chưa có thông tin bác sĩ để hiển thị.</p>
          )}
        </div>
      </section>

      {/* 3D CARE JOURNEY */}
      <section className={styles.journey}>
        <div className={styles.section}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>Chu trình khép kín AI &amp; Lâm sàng</p>
              <h2>Hành trình Chăm sóc Làn da</h2>
            </div>
            <a href="#ai-chan-doan" className={styles.primary} data-client-cta>
              Hỏi về da liễu <ArrowUpRight size={18} aria-hidden="true" />
            </a>
          </div>
          <ol className={styles.steps}>
            {careSteps.map(({ icon: Icon, title, description }) => (
              <li key={title} data-client-card>
                <span className={styles.stepIconWrap}>
                  <Icon size={22} aria-hidden="true" />
                </span>
                <h3>{title}</h3>
                <p>{description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}
