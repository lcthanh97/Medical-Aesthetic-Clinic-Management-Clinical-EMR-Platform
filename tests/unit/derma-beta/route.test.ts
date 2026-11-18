import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const access = vi.hoisted(() => ({
  betaConfig: vi.fn(),
  getBetaReviewer: vi.fn(),
}))
vi.mock('@/features/derma-beta/server/access', () => access)
const getPatientSession = vi.hoisted(() => vi.fn())
vi.mock('@/server/auth/patient-session', () => ({ getPatientSession }))

import { POST } from '@/app/api/derma-beta/route'
import { POST as consultAsPatient } from '@/app/api/consult/route'

const origin = 'https://clinic.example'
function request(question: string, requestOrigin = origin) {
  return new Request(`${origin}/api/derma-beta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: requestOrigin },
    body: JSON.stringify({ question }),
  })
}

describe('dermatology beta gateway', () => {
  beforeEach(() => {
    access.betaConfig.mockReturnValue({ url: new URL('https://beta.example/api/consult'), key: 'test-service-key' })
    access.getBetaReviewer.mockResolvedValue(null)
    getPatientSession.mockResolvedValue(null)
    vi.stubEnv('DERMA_REDIS_URL', '')
    vi.stubEnv('DERMA_REDIS_TOKEN', '')
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('rejects unsigned users and requests from other origins', async () => {
    const upstream = vi.fn()
    vi.stubGlobal('fetch', upstream)
    expect((await POST(request('Tôi bị mụn'))).status).toBe(401)
    expect((await POST(request('Tôi bị mụn', 'https://other.example'))).status).toBe(403)
    expect(upstream).not.toHaveBeenCalled()
  })

  it('uses the incoming host when Next.js canonicalizes the request URL', async () => {
    const rewritten = new Request('https://localhost/api/derma-beta', {
      method: 'POST',
      headers: { Host: 'clinic.example', Origin: origin },
    })
    expect((await POST(rewritten)).status).toBe(401)
  })

  it('forwards the question with a service key and returns only UI fields', async () => {
    access.getBetaReviewer.mockResolvedValue('reviewer-a')
    const upstream = vi.fn().mockResolvedValue(Response.json({
      reply: 'Đây là câu trả lời thử nghiệm.',
      is_dermatology: true,
      is_urgent: false,
      extra: 'private service data',
    }))
    vi.stubGlobal('fetch', upstream)
    const response = await POST(request(' Tôi bị mụn '))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      reply: 'Đây là câu trả lời thử nghiệm.', is_dermatology: true, is_urgent: false,
    })
    expect(upstream).toHaveBeenCalledWith(new URL('https://beta.example/api/consult'), expect.objectContaining({
      body: JSON.stringify({ user_query: 'Tôi bị mụn' }),
      headers: expect.objectContaining({ 'X-Consult-Key': 'test-service-key' }),
    }))
  })

  it('limits each reviewer to ten requests in a runtime window', async () => {
    access.getBetaReviewer.mockResolvedValue('reviewer-quota')
    const upstream = vi.fn(async () => Response.json({ reply: 'Thử nghiệm', is_dermatology: true, is_urgent: false }))
    vi.stubGlobal('fetch', upstream)
    for (let attempt = 0; attempt < 10; attempt++) {
      expect((await POST(request('Tôi bị mụn'))).status).toBe(200)
    }
    expect((await POST(request('Tôi bị mụn'))).status).toBe(429)
    expect(upstream).toHaveBeenCalledTimes(10)
  })

  it('requires patient auth and forwards bounded conversation context to FastAPI', async () => {
    const history = [{ question: 'Tôi bị mụn', reply: 'Bạn có thể mô tả thêm vị trí?' }]
    const build = (turns = history, consent = true) => new Request(`${origin}/api/consult`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin },
      body: JSON.stringify({ question: 'Ở vùng cằm', history: turns, consent }),
    })
    const upstream = vi.fn(async () => Response.json({
      reply: 'Phản hồi', is_urgent: false, is_dermatology: true, provider: 'gemini',
    }))
    vi.stubGlobal('fetch', upstream)
    expect((await consultAsPatient(build())).status).toBe(401)
    getPatientSession.mockResolvedValue({ patientId: 'patient-fixture' })
    expect((await consultAsPatient(build(history, false))).status).toBe(400)
    expect((await consultAsPatient(build(Array(5).fill(history[0])))).status).toBe(400)
    const response = await consultAsPatient(build())
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ provider: 'gemini' })
    expect(upstream).toHaveBeenCalledExactlyOnceWith(new URL('https://beta.example/api/consult'), expect.objectContaining({
      body: JSON.stringify({ user_query: 'Ở vùng cằm', history }),
    }))
  })
})
