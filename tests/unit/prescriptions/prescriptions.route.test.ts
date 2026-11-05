import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, PUT } from '@/app/api/prescriptions/route';

afterEach(() => vi.unstubAllEnvs());

describe('prescriptions route security boundary', () => {
  it('fails closed when the local test-mode gate is not enabled', async () => {
    vi.stubEnv('PRESCRIPTION_TEST_MODE', 'false');
    vi.stubEnv('DATABASE_URL', 'postgresql://test:test@127.0.0.1:55432/emr_test');
    const response = await GET(new NextRequest('http://localhost/api/prescriptions'));
    expect(response.status).toBe(503);
  });

  it('refuses to enable the test feature for a non-local database URL', async () => {
    vi.stubEnv('PRESCRIPTION_TEST_MODE', 'true');
    vi.stubEnv('DATABASE_URL', 'postgresql://test:test@neon.example/neondb');
    const response = await GET(new NextRequest('http://localhost/api/prescriptions'));
    expect(response.status).toBe(503);
  });

  it('rejects unauthenticated list and write requests', async () => {
    vi.stubEnv('PRESCRIPTION_TEST_MODE', 'true');
    vi.stubEnv('DATABASE_URL', 'postgresql://test:test@127.0.0.1:55432/emr_test');
    const list = await GET(new NextRequest('http://localhost/api/prescriptions'));
    const create = await POST(new NextRequest('http://localhost/api/prescriptions', {
      method: 'POST', headers: { origin: 'http://localhost', host: 'localhost' }, body: '{}',
    }));
    const update = await PUT(new NextRequest('http://localhost/api/prescriptions?id=rx-1', {
      method: 'PUT', headers: { origin: 'http://localhost', host: 'localhost' }, body: '{}',
    }));
    expect(list.status).toBe(401);
    expect(create.status).toBe(401);
    expect(update.status).toBe(401);
  });

  it('rejects cross-origin changes and does not return request details', async () => {
    vi.stubEnv('PRESCRIPTION_TEST_MODE', 'true');
    vi.stubEnv('DATABASE_URL', 'postgresql://test:test@127.0.0.1:55432/emr_test');
    const response = await POST(new NextRequest('http://localhost/api/prescriptions', {
      method: 'POST', headers: { origin: 'https://attacker.invalid', host: 'localhost' }, body: '{}',
    }));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ success: false, error: 'Yêu cầu không hợp lệ.' });
  });
});
