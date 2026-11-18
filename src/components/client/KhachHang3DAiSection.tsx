'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Mic2, Send } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { patientAuthLink } from '@/features/client-portal/patientReturnPath'
import { usePatientBookingName } from './PatientBookingContext'

type Answer = { reply: string; is_urgent: boolean; is_dermatology: boolean; provider?: 'local' | 'gemini' }
type Turn = { question: string; answer: Answer }

export function KhachHang3DAiSection() {
  const patientName = usePatientBookingName()
  const pathname = usePathname()
  const destination = pathname === '/khachhang' ? '/khachhang#ai-chan-doan' : pathname
  const [question, setQuestion] = useState('')
  const [consent, setConsent] = useState(false)
  const [turns, setTurns] = useState<Turn[]>([])
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [authExpired, setAuthExpired] = useState(false)
  const submitting = useRef(false)

  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = question.trim()
    if (!text || !patientName || authExpired || !consent || submitting.current) return
    submitting.current = true
    setPending(true)
    setError('')
    try {
      const history = turns.filter(turn => turn.answer.is_dermatology && !turn.answer.is_urgent).slice(-4)
        .map(turn => ({ question: turn.question, reply: turn.answer.reply.slice(0, 900) }))
      const response = await fetch('/api/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, history, consent }),
      })
      const result = await response.json()
      if (!response.ok) {
        if (response.status === 401) { setAuthExpired(true); setTurns([]); setQuestion('') }
        setError(result.error || 'Chưa nhận được câu trả lời. Vui lòng thử lại.')
        return
      }
      setTurns(current => [...current.slice(-15), { question: text, answer: result }])
      setQuestion('')
    } catch {
      setError('Kết nối gián đoạn. Vui lòng thử lại.')
    } finally {
      setPending(false)
      submitting.current = false
    }
  }

  return (
    <section id="ai-chan-doan" className="mx-auto max-w-4xl scroll-mt-24 px-4 py-10" aria-labelledby="derma-chat-title">
      <div className="overflow-hidden rounded-3xl border border-[#b8d5c6] bg-white shadow-xl">
        <header className="bg-[#153537] p-6 text-[#f5fff1]">
          <div className="flex items-center gap-3"><Mic2 size={21} aria-hidden="true" /><h2 id="derma-chat-title" className="text-xl font-bold">Trợ lý da liễu DERMACARE</h2></div>
          <p className="mt-2 text-sm text-[#d8ebd9]">Hỏi về triệu chứng da, tóc và móng. Câu trả lời chỉ mang tính tham khảo.</p>
        </header>
        {!patientName || authExpired ? (
          <div className="space-y-3 p-6">
            <p>{authExpired ? 'Phiên đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.' : 'Đăng nhập tài khoản khách hàng để bắt đầu trò chuyện.'}</p>
            <div className="flex flex-wrap gap-4 font-semibold text-teal-800">
              <Link className="underline" href={patientAuthLink('dang-nhap', destination)}>Đăng nhập</Link>
              <Link className="underline" href={patientAuthLink('dang-ky', destination)}>Đăng ký</Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4 p-6">
            <div className="space-y-4" role="log" aria-label="Cuộc trò chuyện">
              {turns.length === 0 && <p className="text-sm text-slate-600">Ví dụ: Tôi hay nổi mụn ở cằm. Khi nào nên đi khám?</p>}
              {turns.map(({ question: text, answer }, index) => (
                <div key={index} className="space-y-2">
                  <p className="ml-auto w-fit max-w-[90%] whitespace-pre-wrap break-words rounded-xl bg-[#d9efcf] px-4 py-2">{text}</p>
                  <div className={`whitespace-pre-wrap break-words rounded-xl px-4 py-3 ${answer.is_urgent ? 'bg-amber-50 text-amber-950' : 'bg-[#eef6f0]'}`}>
                    <p>{answer.reply}</p>
                    {answer.provider === 'local' && <p className="mt-2 text-xs text-slate-600">Nguồn trả lời: kho tri thức phòng khám</p>}
                    {answer.is_dermatology && !answer.is_urgent && <Link className="mt-2 inline-block font-semibold text-teal-800 underline" href="/khachhang/appointments#dat-lich">Đặt lịch khám</Link>}
                  </div>
                </div>
              ))}
              {pending && <p role="status">Đang chuẩn bị câu trả lời…</p>}
            </div>
            {error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-800">{error}</p>}
            <form onSubmit={ask} className="space-y-2">
              <label className="flex items-start gap-2 text-sm text-slate-700">
                <input type="checkbox" className="mt-0.5" checked={consent} onChange={event => setConsent(event.target.checked)} required />
                <span>Tôi không nhập thông tin nhận dạng và đồng ý để câu hỏi được xử lý bởi dịch vụ tư vấn, có thể qua Google Gemini.</span>
              </label>
              <label htmlFor="derma-customer-text" className="font-semibold">Câu hỏi của bạn</label>
              <textarea id="derma-customer-text" value={question} onChange={event => setQuestion(event.target.value)}
                maxLength={600} required rows={2} className="block w-full rounded-xl border border-slate-300 p-3" />
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={pending || !question.trim() || !consent}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#24614e] px-4 py-2 font-semibold text-white disabled:opacity-50">
                  <Send size={16} aria-hidden="true" /> Gửi câu hỏi
                </button>
                {turns.length > 0 && <button type="button" disabled={pending} onClick={() => { setTurns([]); setQuestion(''); setError('') }} className="px-3 underline">Bắt đầu chat mới</button>}
              </div>
            </form>
          </div>
        )}
      </div>
    </section>
  )
}
