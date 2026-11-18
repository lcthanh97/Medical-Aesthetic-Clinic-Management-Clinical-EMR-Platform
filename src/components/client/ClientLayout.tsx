'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import gsap from 'gsap';
import {
  Bell,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileHeart,
  FlaskConical,
  Home,
  Images,
  Menu,
  Pill,
  ScanSearch,
  ShieldCheck,
  Stethoscope,
  UserRound,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { DermaCanvas3D } from '@/components/derma-ai/DermaCanvas3D';
import { DermaBrandMark } from '@/components/derma-ai/DermaBrandMark';
import motion from './ClientMotion.module.css';

const portalItems = [
  ['Tổng quan', '/khachhang/profile', Home],
  ['Chat da liễu AI', '/khachhang/ai-chan-doan', ScanSearch],
  ['Lịch hẹn của tôi', '/khachhang/profile/appointments', CalendarDays],
  ['Hồ sơ bệnh án', '/khachhang/profile/medical-records', FileHeart],
  ['Kết quả cận lâm sàng', '/khachhang/profile/results', FlaskConical],
  ['Hình ảnh điều trị', '/khachhang/profile/images', Images],
  ['Phác đồ điều trị', '/khachhang/profile/treatment-plan', ClipboardList],
  ['Đơn thuốc của tôi', '/khachhang/profile/prescriptions', Pill],
  ['Cam kết điện tử', '/khachhang/profile/consents', ShieldCheck],
  ['Thanh toán / Hóa đơn', '/khachhang/profile/billing', CreditCard],
  ['Thông báo & nhắc lịch', '/khachhang/profile/notifications', Bell],
  ['Thông tin cá nhân', '/khachhang/profile/personal-info', UserRound],
] as const;

const publicNavigation = [
  ['Trang chủ', '/khachhang'],
  ['Chat da liễu AI', '/khachhang/ai-chan-doan'],
  ['Đội ngũ bác sĩ', '/khachhang/doctors'],
  ['Dịch vụ', '/khachhang/services'],
  ['Đặt lịch', '/khachhang/appointments'],
  ['Hồ sơ của tôi', '/khachhang/profile'],
] as const;

function Brand() {
  return (
    <Link href="/khachhang" className="flex items-center gap-3 text-slate-900 whitespace-nowrap">
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white shadow-sm"
        style={{
          background: 'linear-gradient(135deg, #0D9488 0%, #0284C7 100%)',
        }}
      >
        <DermaBrandMark size={22} />
      </span>
      <span className="whitespace-nowrap">
        <strong className="block font-heading text-base font-extrabold tracking-tight">
          DERMA<span className="text-[#0D9488]">CARE</span>
        </strong>
        <small className="block text-[10px] font-semibold tracking-wider text-slate-500">
          PHÒNG KHÁM DA LIỄU
        </small>
      </span>
    </Link>
  );
}

export function ClientLayout({
  children,
  patient,
}: {
  children: React.ReactNode;
  patient: { name: string; code: string } | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const inPortal = pathname.startsWith('/khachhang/profile');

  if (inPortal) {
    return (
      <div className="relative min-h-screen text-slate-800">
        <DermaCanvas3D />
        <header className="sticky top-0 z-40 flex h-[72px] items-center border-b border-slate-200/80 bg-white/92 backdrop-blur-md px-5 lg:px-8">
          <button
            className="mr-3 lg:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Mở menu"
          >
            {open ? <X /> : <Menu />}
          </button>
          <Brand />
          <nav className="ml-auto hidden items-center gap-5 text-sm font-semibold md:flex whitespace-nowrap">
            <Link href="/khachhang" className="hover:text-[#0D9488]">
              Trang chủ
            </Link>
            <Link
              href="/khachhang/ai-chan-doan"
              className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3.5 py-1.5 text-xs font-bold text-[#0D9488] border border-teal-200 hover:bg-[#0D9488] hover:text-white transition-colors"
            >
              <ScanSearch size={14} /> Chat da liễu AI
            </Link>
            <Link href="/khachhang/doctors" className="hover:text-[#0D9488]">
              Đội ngũ bác sĩ
            </Link>
            <Link href="/khachhang/services" className="hover:text-[#0D9488]">
              Dịch vụ
            </Link>
            <Link href="/khachhang/appointments" className="hover:text-[#0D9488]">
              Đặt lịch
            </Link>
          </nav>
          <div className="ml-5 hidden border-l border-slate-200 pl-5 text-right sm:block whitespace-nowrap">
            <strong className="block text-sm">{patient?.name ?? 'Chưa có hồ sơ'}</strong>
            <small className="text-slate-500">Mã BN: {patient?.code ?? '—'}</small>
          </div>
          <form action="/api/patient-auth/logout" method="post">
            <button className="ml-4 whitespace-nowrap rounded-xl border border-teal-200 bg-white px-3 py-2 text-xs font-bold text-[#0D9488] hover:bg-teal-50">
              Đăng xuất
            </button>
          </form>
        </header>

        <div className="mx-auto flex max-w-[1440px]">
          <aside
            className={`${
              open ? 'flex' : 'hidden'
            } fixed inset-y-[72px] left-0 z-30 w-[270px] flex-col border-r border-slate-200/80 bg-white/95 p-5 shadow-xl lg:static lg:flex lg:min-h-[calc(100vh-72px)] lg:shadow-none`}
          >
            <div className="mb-5 rounded-2xl bg-gradient-to-br from-teal-50 to-sky-50 p-4 border border-teal-200/60">
              <div className="flex items-center gap-3">
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full font-bold text-white shadow-xs"
                  style={{
                    background: 'linear-gradient(135deg, #0D9488 0%, #0284C7 100%)',
                  }}
                >
                  {patient?.name
                    .split(' ')
                    .slice(-2)
                    .map((x) => x[0])
                    .join('') ?? 'BN'}
                </span>
                <div className="min-w-0">
                  <strong className="block truncate text-sm text-slate-900">
                    {patient?.name ?? 'Chưa có hồ sơ'}
                  </strong>
                  <small className="text-slate-500">Mã BN: {patient?.code ?? '—'}</small>
                </div>
              </div>
              <span className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#0D9488] border border-teal-200/60">
                ● Hồ sơ đồng bộ EMR
              </span>
            </div>

            <nav className="space-y-1 overflow-y-auto">
              {portalItems.map(([label, href, Icon]) => {
                const active = pathname === href;
                const isAi = href === '/khachhang/ai-chan-doan';
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-colors ${
                      active
                        ? 'bg-gradient-to-r from-[#0D9488] to-[#0284C7] text-white shadow-sm'
                        : isAi
                          ? 'bg-teal-50 text-[#0D9488] border border-teal-200/70 hover:bg-teal-100'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon size={17} />
                    <span className="flex-1 whitespace-nowrap">{label}</span>
                    {active && <ChevronRight size={15} />}
                  </Link>
                );
              })}
            </nav>
          </aside>
          <main className="min-w-0 flex-1 p-5 md:p-8">{children}</main>
        </div>
      </div>
    );
  }

  return (
    <PublicLayout key={pathname} pathname={pathname}>
      {children}
    </PublicLayout>
  );
}

function PublicLayout({
  children,
  pathname,
}: {
  children: React.ReactNode;
  pathname: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = pageContainerRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-client-intro] > *, [data-client-hero-image]',
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.65,
          stagger: 0.08,
          ease: 'power3.out',
          clearProps: 'transform',
        }
      );

      gsap.fromTo(
        '[data-client-card], [data-client-reveal]',
        { y: 22, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.06,
          ease: 'power2.out',
          delay: 0.12,
          clearProps: 'transform',
        }
      );
    }, el);
    return () => ctx.revert();
  }, [pathname]);

  const renderNavigation = () =>
    publicNavigation.map(([label, href]) => {
      const isAiLink = href === '/khachhang/ai-chan-doan';
      const isActive = pathname === href;
      return (
        <Link
          key={href}
          href={href}
          aria-current={isActive ? 'page' : undefined}
          data-ai-nav={isAiLink ? 'true' : undefined}
          onClick={() => setMenuOpen(false)}
        >
          {isAiLink && <ScanSearch size={14} aria-hidden="true" />}
          <span>{label}</span>
        </Link>
      );
    });

  return (
    <div ref={pageContainerRef} className={motion.publicSite}>
      <DermaCanvas3D />

      <header className={motion.publicHeader}>
        <div className={motion.headerInner}>
          <Link
            href="/khachhang"
            className={motion.publicBrand}
            onClick={() => setMenuOpen(false)}
          >
            <span>
              <DermaBrandMark size={22} />
            </span>
            <div>
              <strong>
                DERMA<em>CARE</em>
              </strong>
              <small>
                <i className={motion.liveDot} /> PHÒNG KHÁM CHUYÊN KHOA DA LIỄU
              </small>
            </div>
          </Link>

          <nav aria-label="Điều hướng chính" className={motion.navigation}>
            {renderNavigation()}
          </nav>

          <div className={motion.headerActions}>
            <Link
              href="/khachhang/appointments"
              className={motion.headerCta}
              data-client-cta
              onClick={() => setMenuOpen(false)}
            >
              Đặt lịch khám <span aria-hidden="true">↗</span>
            </Link>
          </div>

          <button
            type="button"
            className={motion.menuButton}
            aria-expanded={menuOpen}
            aria-controls="public-mobile-menu"
            aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? (
              <X size={21} aria-hidden="true" />
            ) : (
              <Menu size={21} aria-hidden="true" />
            )}
          </button>
        </div>

        <nav
          id="public-mobile-menu"
          aria-label="Điều hướng chính"
          className={motion.mobileNavigation}
          hidden={!menuOpen}
        >
          {renderNavigation()}
        </nav>
      </header>

      {children}

      {pathname !== '/khachhang/ai-chan-doan' && (
        <Link
          href={pathname === '/khachhang' ? '#ai-chan-doan' : '/khachhang/ai-chan-doan'}
          className={motion.floatingAiFab}
          aria-label="Mở Chat da liễu AI"
        >
          <span className={motion.fabIcon}>
            <Stethoscope size={19} />
          </span>
          <span>
            <strong>Chat da liễu AI</strong>
            <small>Kiểm tra vùng da • ICD-10</small>
          </span>
        </Link>
      )}

      <footer className={motion.publicFooter}>
        <div className={motion.footerInner}>
          <div>
            <strong className={motion.footerBrand}>DERMACARE</strong>
            <p>Phòng khám Chuyên khoa Da liễu &amp; Soi da Lâm sàng</p>
          </div>
          <nav aria-label="Điều hướng cuối trang">
            <h2>Khám phá</h2>
            <Link href="/khachhang/ai-chan-doan">Chat da liễu AI</Link>
            <Link href="/khachhang/services">Dịch vụ Chuyên khoa</Link>
            <Link href="/khachhang/doctors">Đội ngũ Bác sĩ</Link>
            <Link href="/khachhang/appointments">Đặt lịch khám</Link>
          </nav>
          <div>
            <h2>Liên hệ Lâm sàng</h2>
            <a href="tel:+842839992030">028 3999 2030</a>
            <a href="mailto:info@dermacare.vn">info@dermacare.vn</a>
            <p>123 Nguyễn Thị Minh Khai, Quận 1, TP.HCM</p>
          </div>
          <div>
            <h2>Giờ làm việc</h2>
            <p>Thứ 2 – Thứ 7 · 08:00 – 20:00</p>
            <p>Chủ nhật · 08:00 – 17:00</p>
            <p className="mt-1 text-[#0D9488] font-semibold">● Tư vấn trực tuyến: Hoạt động 24/7</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
