'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { IdCard, Phone, ShieldCheck } from 'lucide-react';
import {
  patientAuthLink,
  patientReturnPath,
} from '@/features/client-portal/patientReturnPath';
import { AuthPortalShell3D } from '@/components/auth/AuthPortalShell3D';

function PatientLoginPage() {
  const destination = patientReturnPath(useSearchParams().get('next'));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    const fields = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/patient-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientCode: fields.get('patientCode'),
          phone: fields.get('phone'),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Không thể xử lý yêu cầu.');
        return;
      }
      window.location.assign(destination);
    } catch {
      setError('Kết nối gián đoạn. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPortalShell3D
      portal="khachhang"
      title="Cổng Khách hàng"
      description="Đăng nhập bằng mã bệnh nhân và số điện thoại đã đăng ký tại phòng khám."
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Mã bệnh nhân
          </label>
          <div className="relative">
            <IdCard
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              required
              name="patientCode"
              placeholder="Ví dụ: BN0001"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-3.5 pl-10 pr-4 text-sm uppercase text-slate-900 transition-colors focus:border-[#0D9488] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Số điện thoại đăng ký
          </label>
          <div className="relative">
            <Phone
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              required
              name="phone"
              type="tel"
              placeholder="Nhập số điện thoại đã đăng ký"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-3.5 pl-10 pr-4 text-sm text-slate-900 transition-colors focus:border-[#0D9488] focus:bg-white focus:outline-none"
            />
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
            background: 'linear-gradient(135deg, #0D9488 0%, #0284C7 100%)',
          }}
        >
          <ShieldCheck size={18} />
          <span>{loading ? 'Đang xác thực...' : 'Đăng nhập Khách hàng'}</span>
        </button>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs sm:text-sm">
        <Link
          href={patientAuthLink('dang-ky', destination)}
          className="font-bold text-[#0D9488] hover:underline"
        >
          Đăng ký hồ sơ bệnh nhân mới
        </Link>
        <Link href="/khachhang" className="text-slate-500 hover:text-slate-800">
          ← Về trang chủ
        </Link>
      </div>
    </AuthPortalShell3D>
  );
}

export default function Page() {
  return (
    <Suspense>
      <PatientLoginPage />
    </Suspense>
  );
}
