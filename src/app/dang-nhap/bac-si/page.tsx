'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole, Stethoscope } from 'lucide-react';

export default function DoctorLoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError('');
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/doctor-auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identifier: form.get('identifier'), password: form.get('password') }) });
    const payload = await response.json();
    if (!response.ok) { setError(payload.error); setLoading(false); return; }
    router.replace('/bacsi');
    router.refresh();
  }

  return <main className="grid min-h-screen place-items-center bg-[#edf5ff] px-4"><section className="w-full max-w-md rounded-3xl border border-[#d6e4f2] bg-white p-8 shadow-xl shadow-blue-900/10"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#246dce] text-white"><Stethoscope size={28}/></div><h1 className="mt-5 text-center text-2xl font-black text-[#20334b]">Đăng nhập Bác sĩ</h1><p className="mt-2 text-center text-sm text-[#6c7e93]">Xác thực tài khoản được cấp để truy cập bệnh án và dữ liệu lâm sàng.</p><form onSubmit={submit} className="mt-7 space-y-4"><label className="block text-sm font-semibold text-[#334b63]">Tên đăng nhập hoặc email<input name="identifier" required autoComplete="username" className="mt-1.5 w-full rounded-xl border border-[#cddbea] px-4 py-3 outline-none focus:border-[#246dce]"/></label><label className="block text-sm font-semibold text-[#334b63]">Mật khẩu<input name="password" required type="password" autoComplete="current-password" className="mt-1.5 w-full rounded-xl border border-[#cddbea] px-4 py-3 outline-none focus:border-[#246dce]"/></label>{error&&<p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}<button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#246dce] py-3.5 font-bold text-white disabled:opacity-60"><LockKeyhole size={18}/>{loading?'Đang xác thực...':'Đăng nhập vào phòng khám'}</button></form><p className="mt-5 text-center text-xs text-[#8293a5]">Chỉ tài khoản đang hoạt động và có vai trò Bác sĩ mới được phép truy cập.</p></section></main>;
}
