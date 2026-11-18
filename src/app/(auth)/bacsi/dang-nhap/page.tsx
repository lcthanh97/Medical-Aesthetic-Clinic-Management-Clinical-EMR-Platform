'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LockKeyhole, User } from 'lucide-react';
import { AuthPortalShell3D } from '@/components/auth/AuthPortalShell3D';

export default function DoctorLoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/doctor-auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          identifier: form.get('identifier'),
          password: form.get('password'),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.success !== true) {
        setError(payload?.error || 'Máy chủ chưa thể xác thực lúc này. Vui lòng thử lại sau.');
        return;
      }
      router.replace('/bacsi');
      router.refresh();
    } catch {
      setError('Máy chủ chưa thể xác thực lúc này. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPortalShell3D
      portal="bacsi"
      title="Cổng Bác sĩ"
      description="Đăng nhập để truy cập hàng đợi khám, bệnh án điện tử EMR và phác đồ điều trị."
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
              name="identifier"
              required
              autoComplete="username"
              placeholder="Nhập tài khoản bác sĩ"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-3.5 pl-10 pr-4 text-sm text-slate-900 transition-colors focus:border-[#0284C7] focus:bg-white focus:outline-none"
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
              name="password"
              required
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-3.5 pl-10 pr-11 text-sm text-slate-900 transition-colors focus:border-[#0284C7] focus:bg-white focus:outline-none"
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
            background: 'linear-gradient(135deg, #0284C7 0%, #0D9488 100%)',
          }}
        >
          <LockKeyhole size={17} />
          <span>{loading ? 'Đang xác thực...' : 'Đăng nhập Bác sĩ'}</span>
        </button>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs sm:text-sm">
        <Link
          href="/bacsi/dang-ky"
          className="font-bold text-[#0284C7] hover:underline"
        >
          Đăng ký tài khoản bác sĩ
        </Link>
        <Link href="/khachhang" className="text-slate-500 hover:text-slate-800">
          ← Về trang khách hàng
        </Link>
      </div>
    </AuthPortalShell3D>
  );
}
