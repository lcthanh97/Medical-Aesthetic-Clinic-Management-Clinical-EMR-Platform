'use client';

import { useCallback, useEffect, useState } from 'react';
import { authApi } from '@/features/auth/api/authApi';
import type { AuthViewModel } from '@/features/auth/types/auth.types';

export function useAuth() {
  const [user, setUser] = useState<AuthViewModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await authApi.session();
      setUser(result.user ?? null);
      setError(result.error ?? null);
    } catch (cause) {
      setUser(null);
      setError(cause instanceof Error ? cause.message : 'Không thể xác minh phiên đăng nhập.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void authApi.session().then((result) => {
      if (!active) return;
      setUser(result.user ?? null);
      setError(result.error ?? null);
    }).catch((cause: unknown) => {
      if (!active) return;
      setUser(null);
      setError(cause instanceof Error ? cause.message : 'Không thể xác minh phiên đăng nhập.');
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setError(null);
    let result;
    try {
      result = await authApi.login(username, password);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'TimeoutError') {
        throw new Error('Đăng nhập quá thời gian chờ. Dịch vụ dữ liệu có thể đang khởi động; vui lòng thử lại.');
      }
      throw cause;
    }
    if (result.success && result.user) setUser(result.user);
    else setError(result.error ?? 'Tên đăng nhập hoặc mật khẩu không đúng.');
    return result.success;
  }, []);

  const logout = useCallback(async () => {
    const result = await authApi.logout();
    if (!result.success) throw new Error(result.error ?? 'Không thể đăng xuất.');
    setUser(null);
  }, []);

  return { user, isLoading, error, login, logout, refresh };
}
