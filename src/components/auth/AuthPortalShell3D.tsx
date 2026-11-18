'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import {
  Activity,
  ArrowLeft,
  CalendarCheck2,
  FileHeart,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Terminal,
} from 'lucide-react';
import { DermaBrandMark } from '@/components/derma-ai/DermaBrandMark';
import { PortalUnique3DBackdrop } from './PortalUnique3DBackdrop';

export type PortalKey = 'khachhang' | 'bacsi' | 'letan' | 'admin';

interface AuthPortalShell3DProps {
  portal: PortalKey;
  title?: string;
  description?: string;
  children: React.ReactNode;
}

export function AuthPortalShell3D({
  portal,
  title,
  description,
  children,
}: AuthPortalShell3DProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-auth-stagger]',
        { y: 22, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.65,
          stagger: 0.08,
          ease: 'power3.out',
          clearProps: 'transform',
        }
      );

      // Floating animation for 2D/3D ambient shapes
      gsap.to('[data-float-slow]', {
        y: -14,
        duration: 3.2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        stagger: 0.6,
      });
    }, rootRef);

    // Interactive 3D Perspective Tilt on the Login Card
    const card = rootRef.current.querySelector<HTMLElement>('[data-auth-tilt]');
    let cleanupTilt: (() => void) | undefined;
    if (card) {
      gsap.set(card, { transformPerspective: 1100 });
      const onMove = (e: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        const nx = (e.clientX - rect.left) / rect.width - 0.5;
        const ny = (e.clientY - rect.top) / rect.height - 0.5;
        gsap.to(card, {
          rotateY: nx * 5,
          rotateX: -ny * 5,
          duration: 0.35,
          ease: 'power2.out',
        });
      };
      const onLeave = () => {
        gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.5, ease: 'power3.out' });
      };
      card.addEventListener('mousemove', onMove);
      card.addEventListener('mouseleave', onLeave);
      cleanupTilt = () => {
        card.removeEventListener('mousemove', onMove);
        card.removeEventListener('mouseleave', onLeave);
      };
    }

    return () => {
      ctx.revert();
      cleanupTilt?.();
    };
  }, [portal]);

  /* ============================================================================
   * 1. CỔNG KHÁCH HÀNG — Phong cách Luxury Skincare Spa & Editorial (Kem ấm + Ảnh lớn)
   * ============================================================================ */
  if (portal === 'khachhang') {
    return (
      <main
        ref={rootRef}
        className="relative flex min-h-screen bg-[#FAF7F2] text-slate-900 overflow-hidden"
      >
        <PortalUnique3DBackdrop portal="khachhang" />
        {/* Soft 2D Organic Blobs */}
        <div
          data-float-slow
          className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-teal-200/40 blur-3xl"
        />
        <div
          data-float-slow
          className="pointer-events-none absolute -bottom-24 right-1/3 h-80 w-80 rounded-full bg-amber-200/45 blur-3xl"
        />

        {/* Left Full-Height Editorial Photo Showcase */}
        <div className="relative hidden lg:block lg:w-[48%] p-6">
          <div
            data-auth-stagger
            className="relative h-full w-full overflow-hidden rounded-[36px] shadow-2xl"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=1200&q=85"
              alt="Chăm sóc da DERMACARE"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/20 to-transparent" />

            <div className="absolute left-7 top-7 flex items-center gap-2.5 rounded-full bg-white/90 px-4 py-2 text-xs font-extrabold text-slate-900 shadow-md">
              <DermaBrandMark size={18} className="text-[#0D9488]" />
              <span>DERMACARE • CHĂM SÓC LÀN DA</span>
            </div>

            <div className="absolute inset-x-8 bottom-8 text-white">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/30 border border-teal-300/50 px-3 py-1 text-[11px] font-bold backdrop-blur-md">
                <Sparkles size={13} /> Hồ sơ Sức khỏe Làn da
              </span>
              <h2 className="mt-3 font-heading text-3xl font-extrabold leading-tight">
                Hành trình làn da khỏe đẹp,
                <br />
                đồng hành cùng bác sĩ riêng.
              </h2>
              <p className="mt-2 text-sm text-slate-200 max-w-md">
                Tra cứu bệnh án, phác đồ điều trị, hình ảnh tiến triển và đơn thuốc điện tử mọi lúc mọi nơi.
              </p>
            </div>
          </div>
        </div>

        {/* Right Clean Warm Cream Form */}
        <div className="relative z-10 flex flex-1 flex-col justify-between px-6 py-8 sm:px-12 lg:px-16">
          <div data-auth-stagger className="flex items-center justify-between">
            <Link href="/khachhang" className="flex items-center gap-2.5 lg:hidden">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#0D9488] text-white">
                <DermaBrandMark size={19} />
              </span>
              <strong className="font-heading text-base font-extrabold">DERMACARE</strong>
            </Link>
            <Link
              href="/khachhang"
              className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:border-[#0D9488] hover:text-[#0D9488]"
            >
              <ArrowLeft size={14} /> Về trang chủ
            </Link>
          </div>

          <div data-auth-stagger className="mx-auto w-full max-w-md my-auto py-8">
            <div className="mb-6 flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-100 text-[#0D9488]">
                <FileHeart size={24} />
              </span>
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0D9488]">
                  Dành cho Bệnh nhân
                </span>
                <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900">
                  {title || 'Cổng Khách hàng'}
                </h1>
              </div>
            </div>
            <p className="mb-6 text-sm text-slate-600">
              {description || 'Đăng nhập bằng mã bệnh nhân và số điện thoại đã đăng ký tại phòng khám.'}
            </p>

            <div data-auth-tilt className="rounded-3xl border border-stone-200/90 bg-white/90 backdrop-blur-md p-6 sm:p-8 shadow-xl shadow-stone-200/60">
              {children}
            </div>
          </div>

          <p className="text-center text-xs text-slate-400">
            © DERMACARE Clinic • Bảo mật thông tin bệnh nhân chuẩn Y khoa
          </p>
        </div>
      </main>
    );
  }

  /* ============================================================================
   * 2. CỔNG BÁC SĨ — Phong cách Clinical Medical Blueprint (Xanh lâm sàng + Nhịp tim ECG)
   * ============================================================================ */
  if (portal === 'bacsi') {
    return (
      <main
        ref={rootRef}
        className="relative flex min-h-screen items-center justify-center px-4 py-10 sm:px-8 overflow-hidden"
        style={{
          background:
            'radial-gradient(circle at 15% 20%, rgba(2, 132, 199, 0.16) 0%, transparent 45%), radial-gradient(circle at 85% 85%, rgba(14, 165, 233, 0.15) 0%, transparent 45%), linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 55%, #F0F9FF 100%)',
        }}
      >
        <PortalUnique3DBackdrop portal="bacsi" />
        {/* 2D Medical Cross & Blueprint Grid Background */}
        <div
          className="pointer-events-none absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(2, 132, 199, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(2, 132, 199, 0.08) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />
        {/* Animated ECG Heartbeat Wave SVG across background */}
        <svg
          className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 w-full h-40 opacity-20"
          viewBox="0 0 1200 160"
          fill="none"
          preserveAspectRatio="none"
        >
          <path
            d="M0 80 H260 L290 35 L320 130 L350 15 L380 110 L405 80 H720 L750 40 L780 125 L810 20 L840 105 L865 80 H1200"
            stroke="#0284C7"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <div className="relative z-10 w-full max-w-5xl">
          <div data-auth-stagger className="mb-6 flex items-center justify-between">
            <Link href="/khachhang" className="flex items-center gap-3 text-slate-900">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0284C7] text-white shadow-md">
                <Stethoscope size={20} />
              </span>
              <span>
                <strong className="block font-heading text-base font-extrabold">
                  DERMA<span className="text-[#0284C7]">CLINIC</span> EMR
                </strong>
                <small className="block text-[10px] font-bold tracking-wider text-sky-700">
                  KHÔNG GIAN LÀM VIỆC BÁC SĨ CHUYÊN KHOA
                </small>
              </span>
            </Link>
            <Link
              href="/khachhang"
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs hover:text-[#0284C7]"
            >
              <ArrowLeft size={14} /> Trang chủ
            </Link>
          </div>

          <div data-auth-tilt className="grid overflow-hidden rounded-[32px] border border-sky-200/80 bg-white/92 backdrop-blur-md shadow-2xl shadow-sky-900/10 lg:grid-cols-12">
            {/* Left Clinical Photo + Live Shift Card */}
            <div className="relative hidden lg:flex lg:col-span-5 flex-col justify-between bg-[#0C4A6E] p-8 text-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=900&q=85"
                alt="Bác sĩ chuyên khoa Da liễu"
                className="absolute inset-0 h-full w-full object-cover opacity-35"
              />
              <div className="relative z-10">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-400/20 border border-sky-300/40 px-3 py-1 text-[11px] font-bold text-sky-200">
                  <Activity size={13} /> Ca trực Lâm sàng
                </span>
                <h2 className="mt-4 font-heading text-2xl font-extrabold leading-snug">
                  Hệ thống Bệnh án Điện tử &amp; Phác đồ Da liễu
                </h2>
              </div>

              <div className="relative z-10 space-y-2.5 text-xs text-sky-100">
                <div className="rounded-2xl bg-white/10 p-3.5 backdrop-blur-md border border-white/15">
                  <strong className="block text-white">● Hàng đợi khám trực tuyến</strong>
                  <span>Tiếp nhận bệnh nhân &amp; xem ảnh soi da trực tiếp.</span>
                </div>
                <div className="rounded-2xl bg-white/10 p-3.5 backdrop-blur-md border border-white/15">
                  <strong className="block text-white">● Kê đơn &amp; Cảnh báo tương tác</strong>
                  <span>Kiểm tra dị ứng thuốc tự động theo hồ sơ EMR.</span>
                </div>
              </div>
            </div>

            {/* Right Doctor Form */}
            <div data-auth-stagger className="lg:col-span-7 p-7 sm:p-10">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-[11px] font-extrabold uppercase text-[#0284C7] border border-sky-200">
                <ShieldCheck size={13} /> Doctor Portal
              </span>
              <h1 className="mt-3 font-heading text-2xl sm:text-3xl font-extrabold text-slate-900">
                Đăng nhập {title || 'Cổng Bác sĩ'}
              </h1>
              <p className="mt-1 mb-6 text-sm text-slate-500">
                {description || 'Đăng nhập để truy cập dữ liệu lâm sàng được phân công.'}
              </p>
              {children}
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* ============================================================================
   * 3. CỔNG LỄ TÂN — Phong cách Vibrant Mint & Friendly Geometric (Tươi sáng, năng động)
   * ============================================================================ */
  if (portal === 'letan') {
    return (
      <main
        ref={rootRef}
        className="relative flex min-h-screen items-center justify-center px-4 py-10 sm:px-8 overflow-hidden"
        style={{
          background:
            'radial-gradient(circle at 88% 18%, rgba(16, 185, 129, 0.22) 0%, transparent 45%), radial-gradient(circle at 12% 84%, rgba(251, 191, 36, 0.18) 0%, transparent 45%), linear-gradient(150deg, #ECFDF5 0%, #F0FDF4 50%, #FEFCE8 100%)',
        }}
      >
        <PortalUnique3DBackdrop portal="letan" />
        {/* Playful Floating 2D Geometric Circles & Shapes */}
        <div
          data-float-slow
          className="pointer-events-none absolute left-10 top-16 h-24 w-24 rounded-3xl rotate-12 border-4 border-emerald-300/50 bg-emerald-100/40"
        />
        <div
          data-float-slow
          className="pointer-events-none absolute right-14 bottom-16 h-32 w-32 rounded-full border-4 border-amber-300/45 bg-amber-100/40"
        />
        <div
          data-float-slow
          className="pointer-events-none absolute left-1/2 top-10 h-14 w-14 rounded-full bg-teal-300/35"
        />

        <div className="relative z-10 w-full max-w-5xl">
          <div data-auth-stagger className="mb-6 flex items-center justify-between">
            <Link href="/khachhang" className="flex items-center gap-3 text-slate-900">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-600 text-white shadow-md">
                <CalendarCheck2 size={20} />
              </span>
              <span>
                <strong className="block font-heading text-base font-extrabold">
                  DERMA<span className="text-emerald-600">DESK</span>
                </strong>
                <small className="block text-[10px] font-bold tracking-wider text-emerald-700">
                  QUẦY TIẾP ĐÓN &amp; ĐIỀU PHỐI LỊCH HẸN
                </small>
              </span>
            </Link>
            <Link
              href="/khachhang"
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs hover:text-emerald-600"
            >
              <ArrowLeft size={14} /> Trang chủ
            </Link>
          </div>

          <div className="grid gap-6 lg:grid-cols-12 items-stretch">
            {/* Left Form Card */}
            <div
              data-auth-stagger
              data-auth-tilt
              className="lg:col-span-7 rounded-[32px] border border-emerald-200/80 bg-white/90 backdrop-blur-md p-7 sm:p-10 shadow-xl shadow-emerald-900/10"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-extrabold uppercase text-emerald-700 border border-emerald-200">
                <CalendarCheck2 size={13} /> Reception Desk
              </span>
              <h1 className="mt-3 font-heading text-2xl sm:text-3xl font-extrabold text-slate-900">
                Đăng nhập {title || 'Cổng Lễ tân'}
              </h1>
              <p className="mt-1 mb-6 text-sm text-slate-500">
                {description || 'Đăng nhập để tiếp đón bệnh nhân, xếp lịch và thanh toán viện phí.'}
              </p>
              {children}
            </div>

            {/* Right Friendly Reception Visual Card */}
            <div
              data-auth-stagger
              className="hidden lg:flex lg:col-span-5 flex-col justify-between overflow-hidden rounded-[32px] border border-emerald-200/80 bg-emerald-800 text-white shadow-xl"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=900&q=85"
                alt="Quầy tiếp đón phòng khám"
                className="h-56 w-full object-cover"
              />
              <div className="p-7 flex-1 flex flex-col justify-between bg-gradient-to-b from-emerald-800 to-teal-900">
                <div>
                  <h2 className="font-heading text-xl font-extrabold">
                    Tiếp đón Chu đáo &amp; Điều phối Nhanh chóng
                  </h2>
                  <p className="mt-2 text-xs leading-relaxed text-emerald-100">
                    Kiểm tra lịch hẹn đặt trước, cấp số thứ tự phòng khám, ký cam kết điện tử và thanh toán VNPay tức thì.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-xs font-semibold text-emerald-100">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Hệ thống quầy tiếp đón đang sẵn sàng</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* ============================================================================
   * 4. CỔNG QUẢN TRỊ (ADMIN) — Phong cách Cyber Dark Executive Command Center
   * ============================================================================ */
  return (
    <main
      ref={rootRef}
      className="relative flex min-h-screen flex-col justify-center bg-[#030712] px-4 py-10 text-slate-100 overflow-hidden"
    >
      <PortalUnique3DBackdrop portal="admin" />
      {/* Cyber Dark Neon Radial Glow + Matrix Grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 18%, rgba(56, 189, 248, 0.18) 0%, transparent 50%), radial-gradient(circle at 80% 85%, rgba(99, 102, 241, 0.16) 0%, transparent 45%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(56, 189, 248, 0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(56, 189, 248, 0.18) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-md">
        <div data-auth-stagger className="mb-6 flex items-center justify-between">
          <Link href="/khachhang" className="flex items-center gap-2.5 text-white">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-500/20 border border-sky-400/40 text-sky-400">
              <Terminal size={18} />
            </span>
            <span className="font-heading text-sm font-extrabold tracking-wide">
              DERMA<span className="text-sky-400">ADMIN</span>
            </span>
          </Link>
          <Link
            href="/khachhang"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/80 px-3.5 py-1.5 text-xs font-bold text-slate-300 hover:border-sky-400 hover:text-sky-400"
          >
            <ArrowLeft size={13} /> Trang chủ
          </Link>
        </div>

        {/* Dark Executive Terminal Card */}
        <section
          data-auth-stagger
          data-auth-tilt
          className="rounded-3xl border border-slate-800 bg-slate-900/85 p-7 sm:p-9 shadow-2xl backdrop-blur-xl"
          style={{
            boxShadow: '0 0 60px -15px rgba(56, 189, 248, 0.25)',
          }}
        >
          <div className="mb-5 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-sky-400">
              <ShieldCheck size={13} /> System Root Access
            </span>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
          </div>

          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-white">
            {title || 'Cổng Quản trị'}
          </h1>
          <p className="mt-1.5 mb-6 text-xs sm:text-sm text-slate-400">
            {description || 'Quản trị hệ thống, kho dược, tri thức ICD-10 và nhật ký bảo mật.'}
          </p>

          {/* Force readable light-on-dark input & label styling inside dark admin container */}
          <div className="[&_label]:text-slate-300 [&_input]:bg-slate-950/80 [&_input]:border-slate-700 [&_input]:text-white [&_input]:placeholder-slate-500 [&_a]:text-sky-400">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
