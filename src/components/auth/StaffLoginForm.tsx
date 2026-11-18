'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LockKeyhole, User } from 'lucide-react';
import { AuthPortalShell3D } from './AuthPortalShell3D';

export function StaffLoginForm({
  portal,
  title,
}: {
  portal: 'letan' | 'admin';
  title: string;
}) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    const f = new FormData(e.currentTarget);
    try {
      const r = await fetch('/api/staff-auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          portal,
          identifier: f.get('identifier'),
          password: f.get('password'),
        }),
      });
      const p = await r.json().catch(() => null);
      if (!r.ok || p?.success !== true) {
        setError(p?.error || 'Đăng nhập tạm thời không khả dụng. Vui lòng thử lại.');
        return;
      }
      router.replace(`/${portal}`);
      router.refresh();
    } catch {
      setError('Đăng nhập tạm thời không khả dụng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPortalShell3D
      portal={portal}
      title={title}
      description="Đăng nhập bằng tài khoản nhân sự nội bộ đã được phân quyền."
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Tên đăng nhập hoặc Email
          </label>
          <div className="relative">
            <User
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              required
              name="identifier"
              autoComplete="username"
              placeholder="Nhập tên đăng nhập hoặc email nội bộ"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-3.5 pl-10 pr-4 text-sm text-slate-900 transition-colors focus:border-[#0D9488] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Mật khẩu
          </label>
          <div className="relative">
            <LockKeyhole
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              required
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-3.5 pl-10 pr-11 text-sm text-slate-900 transition-colors focus:border-[#0D9488] focus:bg-white focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs sm:text-sm font-semibold text-red-700"
          >
            {error}
          </p>
        )}

        <button
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:opacity-95 disabled:opacity-60"
          style={{
            background:
              portal === 'admin'
                ? 'linear-gradient(135deg, #0F172A 0%, #0284C7 100%)'
                : 'linear-gradient(135deg, #059669 0%, #0D9488 100%)',
          }}
        >
          <LockKeyhole size={17} />
          <span>{loading ? 'Đang xác thực...' : `Đăng nhập ${title}`}</span>
        </button>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs sm:text-sm">
        <Link
          href={`/${portal}/dang-ky`}
          className="font-bold text-[#0D9488] hover:underline"
        >
          Đăng ký tài khoản mới
        </Link>
        <Link href="/khachhang" className="text-slate-500 hover:text-slate-800">
          ← Về trang khách hàng
        </Link>
      </div>
    </AuthPortalShell3D>
  );
}
