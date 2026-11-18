import { createHmac } from 'node:crypto'
import { z } from 'zod'
import { betaConfig } from './access'

const message = z.string().trim().min(1).max(600)
const question = z.object({
  question: message,
  history: z.array(z.object({ question: message, reply: z.string().trim().min(1).max(900) }).strict()).max(4).optional(),
  consent: z.boolean().optional(),
}).strict()
const consultation = z.object({
  reply: z.string().trim().min(1).max(2800),
  is_urgent: z.boolean(),
  is_dermatology: z.boolean(),
  provider: z.enum(['local', 'gemini']).optional(),
})

const windowMs = 10 * 60_000
const maxRequests = 10
const windows = new Map<string, { expires: number; count: number }>()
const counterScript = `
local account = tonumber(redis.call('GET', KEYS[1]) or '0')
local total = tonumber(redis.call('GET', KEYS[2]) or '0')
if account >= 10 or total >= 300 then return 0 end
if redis.call('INCR', KEYS[1]) == 1 then redis.call('EXPIRE', KEYS[1], 600) end
if redis.call('INCR', KEYS[2]) == 1 then redis.call('EXPIRE', KEYS[2], 86400) end
return 1
`

function respond(body: object, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

async function allowRequest(accountId: string, secret: string) {
  const redisUrl = process.env.DERMA_REDIS_URL
  const redisToken = process.env.DERMA_REDIS_TOKEN
  if (redisUrl && redisToken) {
    const key = createHmac('sha256', secret).update(accountId).digest('hex')
    const result = await fetch(redisUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['EVAL', counterScript, 2, `derma:beta:${key}`, 'derma:beta:daily']),
      signal: AbortSignal.timeout(2500),
      cache: 'no-store',
    })
    if (!result.ok) throw new Error('Beta quota service unavailable')
    const body = z.object({ result: z.union([z.literal(0), z.literal(1)]) }).parse(await result.json())
    return body.result === 1
  }

  const now = Date.now()
  for (const [id, entry] of windows) {
    if (entry.expires <= now) windows.delete(id)
  }
  const current = windows.get(accountId)
  if (current) {
    if (current.count >= maxRequests) return false
    current.count++
  } else {
    if (windows.size >= 1000) return false
    windows.set(accountId, { expires: now + windowMs, count: 1 })
  }
  return true
}

export async function handleConsult(request: Request, getAccount: () => Promise<string | null>, requiresConsent = false) {
  const config = betaConfig()
  if (!config) return respond({ error: 'Tính năng beta chưa sẵn sàng.' }, 503)

  const url = new URL(request.url)
  const origin = request.headers.get('origin')
  const host = request.headers.get('host') ?? url.host
  const protocol = process.env.NODE_ENV === 'production' ? 'https:' : url.protocol
  if (request.headers.get('sec-fetch-site') === 'cross-site' || (origin && origin !== `${protocol}//${host}`)) {
    return respond({ error: 'Nguồn yêu cầu không hợp lệ.' }, 403)
  }

  const accountId = await getAccount()
  if (!accountId) return respond({ error: 'Vui lòng đăng nhập để sử dụng tư vấn da liễu.' }, 401)

  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    return respond({ error: 'Chỉ hỗ trợ câu hỏi văn bản JSON.' }, 415)
  }
  if (Number(request.headers.get('content-length')) > 24576) {
    return respond({ error: 'Yêu cầu vượt giới hạn dung lượng.' }, 413)
  }

  let input: unknown
  try {
    const text = await request.text()
    if (Buffer.byteLength(text) > 24576) return respond({ error: 'Yêu cầu vượt giới hạn dung lượng.' }, 413)
    input = JSON.parse(text)
  } catch {
    return respond({ error: 'Yêu cầu không hợp lệ.' }, 400)
  }
  const parsed = question.safeParse(input)
  if (!parsed.success) return respond({ error: 'Nhập câu hỏi từ 1 đến 600 ký tự.' }, 400)
  if (requiresConsent && !parsed.data.consent) {
    return respond({ error: 'Vui lòng xác nhận đồng ý trước khi gửi câu hỏi.' }, 400)
  }

  try {
    if (!await allowRequest(accountId, config.key)) {
      return respond({ error: 'Đã đạt giới hạn lượt hỏi. Vui lòng thử lại sau.' }, 429)
    }
    const upstream = await fetch(config.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Consult-Key': config.key },
      body: JSON.stringify({ user_query: parsed.data.question, history: parsed.data.history }),
      signal: AbortSignal.timeout(23000),
      redirect: 'error',
      cache: 'no-store',
    })
    if (!upstream.ok) return respond({ error: 'Trợ lý đang bận. Vui lòng thử lại sau.' }, 503)
    const answer = consultation.parse(await upstream.json())
    return respond(answer)
  } catch {
    return respond({ error: 'Trợ lý đang bận. Vui lòng thử lại sau.' }, 503)
  }
}
