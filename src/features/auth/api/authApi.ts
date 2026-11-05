import type { AuthResponse } from '@/features/auth/types/auth.types';

async function request(method: 'GET' | 'POST' | 'DELETE', body?: unknown): Promise<AuthResponse> {
  const response = await fetch('/api/auth', {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = (await response.json()) as AuthResponse;
  if (!response.ok && response.status !== 401 && response.status !== 429) {
    throw new Error(result.error ?? 'Không thể kết nối dịch vụ xác thực.');
  }
  return result;
}

export const authApi = {
  session: () => request('GET'),
  login: (username: string, password: string) => request('POST', { username, password }),
  logout: () => request('DELETE'),
};
