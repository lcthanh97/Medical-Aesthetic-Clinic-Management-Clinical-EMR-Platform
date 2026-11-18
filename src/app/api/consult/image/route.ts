import { z } from 'zod'
import { getPatientSession } from '@/server/auth/patient-session'
import { allowRequest } from '@/features/derma-beta/server/consultGateway'
import { findCondition, SKIN_CONDITION_CODES } from '@/features/derma-ai/skinConditions'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_BYTES = 4 * 1024 * 1024
const MIME = ['image/jpeg', 'image/png', 'image/webp']

const PROMPT = `Bạn là trợ lý da liễu của phòng khám DERMACARE, nói chuyện thân thiện bằng tiếng Việt.
Nhiệm vụ: quan sát ẢNH DA người dùng gửi (kèm mô tả nếu có) và đưa ra GỢI Ý THAM KHẢO, không phải chẩn đoán.
Quy tắc:
- Nếu ảnh không phải da/tóc/móng người hoặc quá mờ để nhận xét, đặt is_skin_image=false hoặc image_quality="poor" và giải thích ngắn trong reply.
- Chỉ chọn tối đa 3 khả năng, mỗi khả năng PHẢI dùng đúng mã ICD trong danh mục dưới đây. Không bịa mã khác.
- likelihood chỉ nhận "cao", "trung bình" hoặc "thấp". Thận trọng: ảnh không thay thế khám trực tiếp.
- urgent=true nếu có dấu hiệu cần khám sớm: nốt ruồi thay đổi bất thường, loét lâu lành, chảy máu, mụn nước lan nhanh kèm sốt, sưng phù mặt môi, nhiễm trùng lan rộng.
- reply: 2–4 câu, giọng bác sĩ ân cần, xưng "bác sĩ" và gọi người dùng là "bạn", nói những gì quan sát được và khả năng nghĩ đến. Không kê đơn thuốc kê toa, không nêu liều thuốc.
- care_tips: 2–4 lời khuyên chăm sóc an toàn tại nhà.
Danh mục mã được phép:
${SKIN_CONDITION_CODES}`

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    is_skin_image: { type: 'BOOLEAN' },
    image_quality: { type: 'STRING', enum: ['good', 'poor'] },
    observations: { type: 'STRING' },
    conditions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { icd10: { type: 'STRING' }, likelihood: { type: 'STRING', enum: ['cao', 'trung bình', 'thấp'] }, reason: { type: 'STRING' } },
        required: ['icd10', 'likelihood', 'reason'],
      },
    },
    urgent: { type: 'BOOLEAN' },
    urgent_reason: { type: 'STRING' },
    care_tips: { type: 'ARRAY', items: { type: 'STRING' } },
    reply: { type: 'STRING' },
  },
  required: ['is_skin_image', 'image_quality', 'observations', 'conditions', 'urgent', 'care_tips', 'reply'],
}

const resultSchema = z.object({
  is_skin_image: z.boolean(),
  image_quality: z.enum(['good', 'poor']),
  observations: z.string().max(1500),
  conditions: z.array(z.object({ icd10: z.string(), likelihood: z.enum(['cao', 'trung bình', 'thấp']), reason: z.string().max(600) })).max(5),
  urgent: z.boolean(),
  urgent_reason: z.string().max(600).optional(),
  care_tips: z.array(z.string().max(400)).max(6),
  reply: z.string().min(1).max(1500),
})

function respond(body: object, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  const host = request.headers.get('host') ?? new URL(request.url).host
  if (request.headers.get('sec-fetch-site') === 'cross-site' || (origin && new URL(origin).host !== host)) {
    return respond({ error: 'Nguồn yêu cầu không hợp lệ.' }, 403)
  }
  const session = await getPatientSession()
  if (!session) return respond({ error: 'Vui lòng đăng nhập để sử dụng tính năng quét ảnh da.' }, 401)

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return respond({ error: 'Tính năng quét ảnh chưa được cấu hình.' }, 503)
  if (Number(request.headers.get('content-length')) > MAX_BYTES + 64 * 1024) return respond({ error: 'Ảnh tối đa 4 MB.' }, 413)

  let form: FormData
  try { form = await request.formData() } catch { return respond({ error: 'Không đọc được ảnh tải lên.' }, 400) }
  const file = form.get('file')
  const note = String(form.get('note') ?? '').trim().slice(0, 600)
  if (form.get('consent') !== 'true') return respond({ error: 'Vui lòng xác nhận đồng ý trước khi gửi ảnh.' }, 400)
  if (!(file instanceof File) || !MIME.includes(file.type)) return respond({ error: 'Chỉ nhận ảnh JPEG, PNG hoặc WebP.' }, 400)
  if (file.size < 1 || file.size > MAX_BYTES) return respond({ error: 'Ảnh tối đa 4 MB.' }, 400)

  try {
    if (!await allowRequest(`image:${session.patientId}`, process.env.JWT_ACCESS_SECRET ?? apiKey)) {
      return respond({ error: 'Bạn đã dùng hết lượt quét trong 10 phút. Vui lòng thử lại sau.' }, 429)
    }
  } catch {
    return respond({ error: 'Trợ lý đang bận. Vui lòng thử lại sau.' }, 503)
  }

  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'
  const image = Buffer.from(await file.arrayBuffer()).toString('base64')
  try {
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: PROMPT }] },
        contents: [{ role: 'user', parts: [
          { text: note ? `Mô tả của người dùng: ${note}` : 'Người dùng không mô tả thêm.' },
          { inline_data: { mime_type: file.type, data: image } },
        ] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.3, maxOutputTokens: 1200 },
      }),
      signal: AbortSignal.timeout(45000),
      cache: 'no-store',
    })
    if (!upstream.ok) return respond({ error: 'Trợ lý đang bận. Vui lòng thử lại sau.' }, 503)
    const payload = await upstream.json()
    const text = payload?.candidates?.[0]?.content?.parts?.find((p: { text?: string }) => p.text)?.text
    const parsed = resultSchema.parse(JSON.parse(text ?? ''))
    // Chỉ giữ các mã có trong danh mục phòng khám, kèm tên & hình thái để giao diện vẽ minh họa.
    const conditions = parsed.conditions
      .map((c) => ({ ...c, condition: findCondition(c.icd10) }))
      .filter((c) => c.condition)
      .slice(0, 3)
      .map((c) => ({ icd10: c.condition!.icd, name: c.condition!.name, morphology: c.condition!.morphology, look: c.condition!.look, likelihood: c.likelihood, reason: c.reason }))
    return respond({ ...parsed, conditions, urgent: parsed.urgent || conditions.some((c) => findCondition(c.icd10)?.urgent && c.likelihood !== 'thấp') })
  } catch {
    return respond({ error: 'Chưa phân tích được ảnh. Vui lòng thử lại với ảnh rõ hơn.' }, 503)
  }
}
