'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AlertTriangle, CalendarPlus, Camera, ImagePlus, RotateCcw, Send, Sparkles, Volume2, VolumeX, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { patientAuthLink } from '@/features/client-portal/patientReturnPath'
import { findCondition, type Morphology } from '@/features/derma-ai/skinConditions'
import { usePatientBookingName } from './PatientBookingContext'
import { ChibiDoctor, type DoctorMood } from './ChibiDoctor'
import { LesionIllustration } from './LesionIllustration'

type Answer = { reply: string; is_urgent: boolean; is_dermatology: boolean; provider?: 'local' | 'gemini'; references?: string[] }
type ScanCondition = { icd10: string; name: string; morphology: Morphology; look: string; likelihood: 'cao' | 'trung bình' | 'thấp'; reason: string }
type ScanResult = { is_skin_image: boolean; image_quality: 'good' | 'poor'; observations: string; conditions: ScanCondition[]; urgent: boolean; urgent_reason?: string; care_tips: string[]; reply: string }
type Turn =
  | { kind: 'text'; question: string; answer: Answer }
  | { kind: 'image'; question: string; preview: string; result: ScanResult }

const GREETING = 'Chào bạn! Bác sĩ DERMA đây. Bạn có thể hỏi về da, tóc, móng hoặc chụp ảnh vùng da để bác sĩ xem giúp nhé.'
const SUGGESTIONS = ['Mụn ở cằm hay tái phát, khi nào nên đi khám?', 'Da khô, ngứa nhiều về đêm phải làm sao?', 'Nốt ruồi thay đổi màu có nguy hiểm không?', 'Nám má sau sinh nên chăm sóc thế nào?']
const LIKELIHOOD: Record<ScanCondition['likelihood'], { width: string; color: string }> = {
  cao: { width: '85%', color: 'bg-rose-500' }, 'trung bình': { width: '55%', color: 'bg-amber-400' }, thấp: { width: '25%', color: 'bg-emerald-400' },
}

/** Thu nhỏ ảnh trước khi gửi (≤ 1280px, JPEG) để tải nhanh và nằm trong giới hạn 4 MB. */
async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('compress'))), 'image/jpeg', 0.86))
}

function speakable(text: string) { return text.replace(/\s+/g, ' ').trim().slice(0, 600) }

export function KhachHang3DAiSection() {
  const patientName = usePatientBookingName()
  const pathname = usePathname()
  const destination = pathname === '/khachhang' ? '/khachhang#ai-chan-doan' : pathname
  const [question, setQuestion] = useState('')
  const [consent, setConsent] = useState(false)
  const [turns, setTurns] = useState<Turn[]>([])
  const [error, setError] = useState('')
  const [pending, setPending] = useState<false | 'text' | 'image'>(false)
  const [authExpired, setAuthExpired] = useState(false)
  const [image, setImage] = useState<{ blob: Blob; url: string } | null>(null)
  const [bubble, setBubbleText] = useState(GREETING)
  const [shown, setShown] = useState(0)
  const [voiceOn, setVoiceOn] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [greeting, setGreeting] = useState(true)
  const submitting = useRef(false)
  const logRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  useEffect(() => { const t = setTimeout(() => setGreeting(false), 3200); return () => clearTimeout(t) }, [])
  useEffect(() => { try { setVoiceOn(localStorage.getItem('derma-voice') === '1') } catch { /* bỏ qua */ } }, [])
  // Hiệu ứng chạy chữ trong bong bóng lời thoại
  useEffect(() => {
    const id = setInterval(() => setShown((n) => { if (n >= bubble.length) { clearInterval(id); return n } return n + 2 }), 28)
    return () => clearInterval(id)
  }, [bubble])
  const typed = bubble.slice(0, shown)
  function setBubble(text: string) { setBubbleText(text); setShown(0) }
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' }) }, [turns, pending])
  useEffect(() => () => { if (typeof window !== 'undefined') window.speechSynthesis?.cancel() }, [])

  function say(text: string) {
    setBubble(text)
    if (!voiceOn || typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(speakable(text))
    u.lang = 'vi-VN'; u.rate = 1.02; u.pitch = 1.1
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith('vi'))
    if (voice) u.voice = voice
    u.onstart = () => setSpeaking(true); u.onend = () => setSpeaking(false); u.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(u)
  }

  function toggleVoice() {
    const next = !voiceOn
    setVoiceOn(next)
    try { localStorage.setItem('derma-voice', next ? '1' : '0') } catch { /* bỏ qua */ }
    if (!next) { window.speechSynthesis?.cancel(); setSpeaking(false) }
  }

  async function pickImage(file?: File | null) {
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Vui lòng chọn tệp ảnh.'); return }
    try {
      const blob = await compressImage(file)
      if (image) URL.revokeObjectURL(image.url)
      setImage({ blob, url: URL.createObjectURL(blob) })
      setError('')
      setBubble('Bác sĩ đã nhận ảnh. Bạn có thể mô tả thêm (ngứa, đau, xuất hiện bao lâu…) rồi bấm Quét ảnh nhé.')
    } catch { setError('Không đọc được ảnh này. Hãy thử ảnh khác.') }
  }

  function handleExpired(status: number) {
    if (status === 401) { setAuthExpired(true); setTurns([]); setQuestion('') }
  }

  async function submit(event?: FormEvent<HTMLFormElement>, preset?: string) {
    event?.preventDefault()
    const text = (preset ?? question).trim()
    if ((!text && !image) || !patientName || authExpired || submitting.current) return
    if (!consent) { setError('Vui lòng tick ô đồng ý trước khi gửi.'); return }
    submitting.current = true
    setError('')
    window.speechSynthesis?.cancel()
    try {
      if (image) {
        setPending('image')
        const form = new FormData()
        form.append('file', image.blob, 'skin.jpg'); form.append('note', text); form.append('consent', 'true')
        const response = await fetch('/api/consult/image', { method: 'POST', body: form })
        const result = await response.json()
        if (!response.ok) { handleExpired(response.status); setError(result.error || 'Chưa phân tích được ảnh.'); return }
        const preview = image.url
        setTurns((current) => [...current.slice(-11), { kind: 'image', question: text || 'Nhờ bác sĩ xem ảnh vùng da này giúp em.', preview, result }])
        setImage(null)
        say(result.reply)
      } else {
        setPending('text')
        const history = turns.filter((t): t is Extract<Turn, { kind: 'text' }> => t.kind === 'text' && t.answer.is_dermatology && !t.answer.is_urgent).slice(-4)
          .map((t) => ({ question: t.question, reply: t.answer.reply.slice(0, 900) }))
        const response = await fetch('/api/consult', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: text, history, consent }) })
        const result = await response.json()
        if (!response.ok) { handleExpired(response.status); setError(result.error || 'Chưa nhận được câu trả lời. Vui lòng thử lại.'); return }
        setTurns((current) => [...current.slice(-11), { kind: 'text', question: text, answer: result }])
        say(result.reply)
      }
      setQuestion('')
    } catch {
      setError('Kết nối gián đoạn. Vui lòng thử lại.')
    } finally {
      setPending(false)
      submitting.current = false
    }
  }

  function reset() {
    window.speechSynthesis?.cancel(); setSpeaking(false)
    setTurns([]); setQuestion(''); setError(''); setImage(null); setBubble(GREETING)
  }

  const last = turns[turns.length - 1]
  const urgent = last ? (last.kind === 'text' ? last.answer.is_urgent : last.result.urgent) : false
  const typing = typed.length < bubble.length
  const mood: DoctorMood = pending ? 'thinking' : greeting ? 'greeting' : urgent ? 'concerned' : 'idle'
  const loggedIn = Boolean(patientName) && !authExpired

  return (
    <section id="ai-chan-doan" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-10" aria-labelledby="derma-chat-title">
      <div className="overflow-hidden rounded-[28px] border border-[#cfe6df] bg-white shadow-[0_24px_60px_-28px_rgba(15,61,62,0.45)] md:grid md:grid-cols-[minmax(260px,340px)_1fr]">
        {/* Sân khấu bác sĩ chibi */}
        <aside className="relative flex flex-col items-center overflow-hidden bg-gradient-to-b from-[#0f4c4d] via-[#17706a] to-[#2aa198] px-5 pb-5 pt-6 text-white">
          <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 right-0 h-48 w-48 rounded-full bg-[#a7f3d0]/20 blur-3xl" />
          <div className="relative z-10 flex w-full items-center justify-between gap-2">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#bff3e6]"><Sparkles size={14} /> Trợ lý AI</p>
              <h2 id="derma-chat-title" className="text-xl font-extrabold">Bác sĩ DERMA</h2>
            </div>
            <button type="button" onClick={toggleVoice} aria-pressed={voiceOn}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${voiceOn ? 'bg-white text-[#0f4c4d]' : 'bg-white/15 text-white hover:bg-white/25'}`}>
              {voiceOn ? <Volume2 size={15} /> : <VolumeX size={15} />} {voiceOn ? 'Đang đọc to' : 'Đọc to'}
            </button>
          </div>
          {/* Bong bóng lời thoại */}
          <div className="relative z-10 mt-4 w-full rounded-2xl bg-white p-3.5 text-sm leading-relaxed text-[#173a3b] shadow-lg" aria-live="polite">
            <p className="max-h-36 overflow-y-auto md:max-h-48">{pending ? (pending === 'image' ? 'Để bác sĩ xem kỹ ảnh của bạn một chút nhé…' : 'Bác sĩ đang suy nghĩ…') : typed || ' '}</p>
            <span className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 bg-white" />
          </div>
          <div className="relative z-10 mt-2 h-44 w-36 md:h-64 md:w-52">
            <ChibiDoctor mood={mood} talking={speaking || (typing && !pending)} />
          </div>
          <p className="relative z-10 mt-1 text-center text-[11px] text-[#d6f5ec]">Thông tin chỉ để tham khảo, không thay thế chẩn đoán của bác sĩ.</p>
        </aside>

        {/* Khu vực trò chuyện */}
        <div className="flex min-h-[520px] flex-col bg-[#f7fbfa]">
          {!loggedIn ? (
            <div className="m-auto max-w-sm space-y-4 p-8 text-center">
              <p className="text-lg font-bold text-[#173a3b]">{authExpired ? 'Phiên đã hết hạn' : 'Trò chuyện cùng bác sĩ DERMA'}</p>
              <p className="text-sm text-slate-600">{authExpired ? 'Vui lòng đăng nhập lại để tiếp tục.' : 'Đăng nhập tài khoản khách hàng để hỏi đáp và quét ảnh da.'}</p>
              <div className="flex justify-center gap-3">
                <Link className="rounded-xl bg-[#17706a] px-5 py-2.5 font-semibold text-white" href={patientAuthLink('dang-nhap', destination)}>Đăng nhập</Link>
                <Link className="rounded-xl border border-[#17706a] px-5 py-2.5 font-semibold text-[#17706a]" href={patientAuthLink('dang-ky', destination)}>Đăng ký</Link>
              </div>
            </div>
          ) : (
            <>
              <div ref={logRef} className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6 md:max-h-[560px]" role="log" aria-label="Cuộc trò chuyện">
                {turns.length === 0 && (
                  <div className="space-y-4">
                    <p className="text-sm font-semibold text-[#173a3b]">Gợi ý câu hỏi</p>
                    <div className="flex flex-wrap gap-2">
                      {SUGGESTIONS.map((s) => (
                        <button key={s} type="button" disabled={Boolean(pending)} onClick={() => { setQuestion(s); if (consent) void submit(undefined, s) }}
                          className="rounded-full border border-[#bfe1d8] bg-white px-3.5 py-2 text-left text-sm text-[#17706a] shadow-sm transition hover:border-[#17706a] hover:bg-[#e9f7f3]">{s}</button>
                      ))}
                      <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-full bg-[#17706a] px-3.5 py-2 text-sm font-semibold text-white shadow-sm"><Camera size={15} /> Chụp ảnh da để quét</button>
                    </div>
                  </div>
                )}
                {turns.map((turn, index) => (
                  <div key={index} className="space-y-2.5">
                    <div className="ml-auto w-fit max-w-[88%] space-y-2">
                      {/* eslint-disable-next-line @next/next/no-img-element -- ảnh xem trước dạng blob tạm */}
                      {turn.kind === 'image' && <img src={turn.preview} alt="Ảnh vùng da bạn đã gửi" className="ml-auto max-h-56 rounded-2xl border-4 border-white object-cover shadow-md" />}
                      <p className="whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-[#17706a] px-4 py-2.5 text-sm text-white shadow-sm">{turn.question}</p>
                    </div>
                    {turn.kind === 'text' ? <TextAnswer answer={turn.answer} /> : <ScanAnswer result={turn.result} />}
                  </div>
                ))}
                {pending && (
                  <div className="flex items-center gap-2 text-sm text-[#17706a]" role="status">
                    <span className="flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-[#2aa198]" style={{ animationDelay: `${i * 120}ms` }} />)}</span>
                    {pending === 'image' ? 'Đang quét ảnh da…' : 'Đang chuẩn bị câu trả lời…'}
                  </div>
                )}
              </div>

              <form onSubmit={submit} className="space-y-2.5 border-t border-[#dceee8] bg-white p-4">
                {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
                {image && (
                  <div className="flex items-center gap-3 rounded-2xl border border-[#bfe1d8] bg-[#f1faf7] p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element -- ảnh xem trước dạng blob tạm */}
                    <img src={image.url} alt="Ảnh chuẩn bị gửi" className="h-16 w-16 rounded-xl object-cover" />
                    <div className="flex-1 text-sm"><p className="font-semibold text-[#173a3b]">Ảnh đã sẵn sàng</p><p className="text-xs text-slate-600">Ảnh chỉ dùng để phân tích, không được lưu lại.</p></div>
                    <button type="button" onClick={() => { URL.revokeObjectURL(image.url); setImage(null) }} aria-label="Bỏ ảnh" className="rounded-full p-1.5 text-slate-500 hover:bg-white"><X size={18} /></button>
                  </div>
                )}
                <div className="flex items-end gap-2 rounded-2xl border border-[#cfe3dd] bg-white p-1.5 focus-within:border-[#17706a] focus-within:ring-2 focus-within:ring-[#17706a]/15">
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { void pickImage(e.target.files?.[0]); e.target.value = '' }} />
                  <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { void pickImage(e.target.files?.[0]); e.target.value = '' }} />
                  <button type="button" onClick={() => fileRef.current?.click()} title="Tải ảnh lên" aria-label="Tải ảnh vùng da" className="rounded-xl p-2.5 text-[#17706a] hover:bg-[#e9f7f3]"><ImagePlus size={20} /></button>
                  <button type="button" onClick={() => cameraRef.current?.click()} title="Chụp ảnh" aria-label="Chụp ảnh vùng da" className="rounded-xl p-2.5 text-[#17706a] hover:bg-[#e9f7f3] md:hidden"><Camera size={20} /></button>
                  <textarea id="derma-customer-text" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={600} rows={1}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submit() } }}
                    placeholder={image ? 'Mô tả thêm: ngứa, đau, xuất hiện bao lâu…' : 'Hỏi về da, tóc, móng…'}
                    aria-label="Câu hỏi của bạn" className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent px-1 py-2.5 text-sm outline-none" />
                  <button type="submit" disabled={Boolean(pending) || (!question.trim() && !image)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#17706a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f4c4d] disabled:opacity-40">
                    {image ? <><Camera size={16} /> Quét ảnh</> : <><Send size={16} /> Gửi</>}
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-start gap-2 text-xs text-slate-600">
                    <input type="checkbox" className="mt-0.5 accent-[#17706a]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                    <span>Tôi không gửi thông tin nhận dạng và đồng ý để câu hỏi/ảnh được xử lý bởi dịch vụ tư vấn (có thể qua Google Gemini).</span>
                  </label>
                  {turns.length > 0 && <button type="button" disabled={Boolean(pending)} onClick={reset} className="inline-flex items-center gap-1 text-xs font-semibold text-[#17706a]"><RotateCcw size={13} /> Cuộc trò chuyện mới</button>}
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function DoctorBubble({ children, urgent = false }: { children: ReactNode; urgent?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-1 hidden h-9 w-9 shrink-0 overflow-hidden rounded-full bg-[#d8f1ea] sm:block"><ChibiDoctor className="-mt-0.5 scale-[1.9] origin-top" /></div>
      <div className={`min-w-0 flex-1 rounded-2xl rounded-tl-md px-4 py-3 text-sm shadow-sm ${urgent ? 'border border-amber-300 bg-amber-50 text-amber-950' : 'border border-[#e1efea] bg-white text-[#1f3a3b]'}`}>{children}</div>
    </div>
  )
}

function ConditionCard({ icd, name, morphology, look, children }: { icd: string; name: string; morphology: Morphology; look: string; children?: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-[#e1efea] bg-[#fbfefd] p-3">
      <LesionIllustration morphology={morphology} label={name} size={76} />
      <div className="min-w-0 flex-1">
        <p className="font-bold text-[#173a3b]">{name} <span className="ml-1 rounded bg-[#e9f7f3] px-1.5 py-0.5 text-[10px] font-semibold text-[#17706a]">{icd}</span></p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">{look}</p>
        {children}
      </div>
    </div>
  )
}

function BookingLink() {
  return <Link className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#e9f7f3] px-3 py-2 text-xs font-bold text-[#17706a] hover:bg-[#d8f1ea]" href="/khachhang/appointments#dat-lich"><CalendarPlus size={14} /> Đặt lịch khám với bác sĩ</Link>
}

function TextAnswer({ answer }: { answer: Answer }) {
  const refs = (answer.references ?? []).map((code) => findCondition(code)).filter((c): c is NonNullable<typeof c> => Boolean(c) && c!.morphology !== 'normal').slice(0, 2)
  return (
    <DoctorBubble urgent={answer.is_urgent}>
      {answer.is_urgent && <p className="mb-1.5 flex items-center gap-1.5 font-bold"><AlertTriangle size={16} /> Cần được khám sớm</p>}
      <p className="whitespace-pre-wrap break-words leading-relaxed">{answer.reply}</p>
      {answer.is_dermatology && refs.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Hình minh họa tham khảo</p>
          {refs.map((c) => <ConditionCard key={c.icd} {...c} />)}
        </div>
      )}
      {answer.provider === 'local' && <p className="mt-2 text-[11px] text-slate-500">Nguồn: kho tri thức phòng khám</p>}
      {answer.is_dermatology && <BookingLink />}
    </DoctorBubble>
  )
}

function ScanAnswer({ result }: { result: ScanResult }) {
  const usable = result.is_skin_image && result.image_quality === 'good'
  return (
    <DoctorBubble urgent={result.urgent}>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#17706a]"><Sparkles size={14} /> Kết quả quét ảnh</p>
      {result.urgent && <p className="mb-2 flex items-start gap-1.5 rounded-xl bg-amber-100 px-3 py-2 font-semibold"><AlertTriangle size={16} className="mt-0.5 shrink-0" /> {result.urgent_reason || 'Có dấu hiệu nên đi khám sớm.'}</p>}
      <p className="whitespace-pre-wrap leading-relaxed">{result.reply}</p>
      {usable && result.observations && <p className="mt-2 rounded-xl bg-[#f3f8f7] px-3 py-2 text-xs text-slate-600"><b>Quan sát trên ảnh:</b> {result.observations}</p>}
      {usable && result.conditions.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Các khả năng nghĩ đến</p>
          {result.conditions.map((c) => (
            <ConditionCard key={c.icd10} icd={c.icd10} name={c.name} morphology={c.morphology} look={c.look}>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${LIKELIHOOD[c.likelihood].color}`} style={{ width: LIKELIHOOD[c.likelihood].width }} /></div>
                <span className="text-[11px] font-semibold text-slate-600">Khả năng {c.likelihood}</span>
              </div>
              <p className="mt-1.5 text-xs text-slate-600">{c.reason}</p>
            </ConditionCard>
          ))}
        </div>
      )}
      {usable && result.care_tips.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Chăm sóc tại nhà</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-slate-700">{result.care_tips.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      )}
      <p className="mt-2 text-[11px] text-slate-500">Kết quả từ AI chỉ để tham khảo, không phải chẩn đoán y khoa.</p>
      {usable && <BookingLink />}
    </DoctorBubble>
  )
}
