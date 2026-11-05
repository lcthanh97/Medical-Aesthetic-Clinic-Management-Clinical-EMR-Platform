import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/infrastructure/database/repositories/PrismaAuthRepository', () => ({
  PrismaAuthRepository: vi.fn(),
}));
vi.mock('@/server/services/AuthService', () => ({
  AuthService: vi.fn(),
  AuthConfigurationError: class AuthConfigurationError extends Error {},
}));
vi.mock('@/server/controllers/AuthController', () => ({
  AuthController: vi.fn(function ControllerMock() {
    return { login: vi.fn(), getSession: vi.fn(async () => null), logout: vi.fn() };
  }),
}));

import { DELETE, GET, POST } from '@/app/api/auth/route';

describe('Auth Route Handler security boundary', () => {
  it('returns unauthenticated without touching the database when there is no session cookie', async () => {
    const response = await GET(new NextRequest('http://localhost/api/auth'));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, user: null });
  });

  it('rejects login when Origin is absent or does not match Host', async () => {
    const missingOrigin = await POST(new NextRequest('http://localhost/api/auth', { method: 'POST' }));
    const mismatchedOrigin = await POST(new NextRequest('http://localhost/api/auth', {
      method: 'POST', headers: { origin: 'https://attacker.example', host: 'localhost' },
    }));

    expect(missingOrigin.status).toBe(403);
    expect(mismatchedOrigin.status).toBe(403);
  });

  it('rejects cross-origin logout before revoking a session', async () => {
    const response = await DELETE(new NextRequest('http://localhost/api/auth', {
      method: 'DELETE', headers: { origin: 'https://attacker.example', host: 'localhost' },
    }));

    expect(response.status).toBe(403);
  });

  it('rejects an origin with the same host but a different scheme', async () => {
    const response = await POST(new NextRequest('http://localhost/api/auth', {
      method: 'POST',
      headers: { origin: 'https://localhost', host: 'localhost', 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'synthetic', password: 'Synthetic-password-123!' }),
    }));

    expect(response.status).toBe(403);
  });
});
