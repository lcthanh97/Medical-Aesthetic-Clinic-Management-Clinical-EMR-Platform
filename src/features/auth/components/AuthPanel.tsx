'use client';

import { FormEvent, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';

export function AuthPanel() {
  const { user, isLoading, error, login, logout } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      const authenticated = await login(username, password);
      if (authenticated) setPassword('');
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Không thể đăng nhập lúc này.');
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    setFormError(null);
    try {
      await logout();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Không thể đăng xuất lúc này.');
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return <p role="status" className="text-sm text-gray-600">Đang xác minh phiên đăng nhập…</p>;

  if (user) {
    return (
      <section className="max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-sm" aria-label="Phiên đăng nhập">
        <h2 className="text-lg font-semibold text-gray-900">Đã đăng nhập</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div><dt className="inline font-medium">Tài khoản: </dt><dd className="inline">{user.username}</dd></div>
          {user.employeeName && <div><dt className="inline font-medium">Nhân viên: </dt><dd className="inline">{user.employeeName}</dd></div>}
          <div><dt className="inline font-medium">Vai trò: </dt><dd className="inline">{user.roleNames.length ? user.roleNames.join(', ') : 'Chưa được gán vai trò'}</dd></div>
        </dl>
        {(formError || error) && <p role="alert" className="mt-4 text-sm text-red-700">{formError ?? error}</p>}
        <button type="button" onClick={handleLogout} disabled={busy} className="mt-5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {busy ? 'Đang xử lý…' : 'Đăng xuất'}
        </button>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Đăng nhập</h2>
      <label className="block space-y-1 text-sm font-medium text-gray-700">
        <span>Tên đăng nhập</span>
        <input autoComplete="username" required maxLength={160} value={username} onChange={(event) => setUsername(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 font-normal" />
      </label>
      <label className="block space-y-1 text-sm font-medium text-gray-700">
        <span>Mật khẩu</span>
        <input type="password" autoComplete="current-password" required maxLength={1024} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 font-normal" />
      </label>
      {(formError || error) && <p role="alert" className="text-sm text-red-700">{formError ?? error}</p>}
      <button type="submit" disabled={busy} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
        {busy ? 'Đang xác thực…' : 'Đăng nhập'}
      </button>
    </form>
  );
}
