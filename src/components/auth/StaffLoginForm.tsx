'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function StaffLoginForm({ portal, title }: { portal: 'letan' | 'admin'; title: string }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');

    const form = new FormData(event.currentTarget);

    try {
      let response: Response;
      try {
        response = await fetch('/api/staff-auth/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            portal,
            identifier: form.get('identifier'),
            password: form.get('password'),
          }),
        });
      } catch {
        setError('Không thể kết nối đến máy chủ. Vui lòng thử lại.');
        return;
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        setError('Máy chủ trả về phản hồi không hợp lệ. Vui lòng thử lại.');
        return;
      }

      if (!response.ok) {
        const message =
          typeof payload === 'object' &&
          payload !== null &&
          'error' in payload &&
          typeof payload.error === 'string'
            ? payload.error
            : 'Không thể đăng nhập. Vui lòng thử lại.';
        setError(message);
        return;
      }

      router.replace(`/${portal}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-4">
      <section className="w-full max-w-md rounded-3xl border bg-white p-8 shadow-xl">
        <h1 className="text-center text-3xl font-black text-slate-800">{title}</h1>
        <p className="mt-2 text-center text-sm text-slate-500">
          Đăng nhập bằng tài khoản nội bộ đã được phân quyền.
        </p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <input
            required
            name="identifier"
            placeholder="Tên đăng nhập hoặc email"
            className="w-full rounded-xl border px-4 py-3"
          />
          <input
            required
            name="password"
            type="password"
            placeholder="Mật khẩu"
            className="w-full rounded-xl border px-4 py-3"
          />
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            disabled={loading}
            className="w-full rounded-xl bg-slate-800 py-3.5 font-bold text-white"
          >
            {loading ? 'Đang xác thực...' : 'Đăng nhập'}
          </button>
        </form>
        <div className="mt-5 text-center text-sm">
          <Link href={`/${portal}/dang-ky`} className="font-semibold text-blue-700">
            Đăng ký tài khoản
          </Link>
        </div>
      </section>
    </main>
  );
}
