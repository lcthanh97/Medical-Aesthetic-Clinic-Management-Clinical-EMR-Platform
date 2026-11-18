'use client'

import Link from 'next/link'
import { MessageCircle, Send, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import styles from './DermatologyBetaChat.module.css'

type Answer = { reply: string; is_urgent: boolean; is_dermatology: boolean }
type Turn = { question: string; answer: Answer }
const examples = ['Tôi bị mụn trứng cá ở mặt, nên chăm sóc thế nào?', 'Khi nào nên đi khám vì nốt ruồi thay đổi?']

export function DermatologyBetaChat() {
  const dialog = useRef<HTMLDialogElement>(null)
  const transcript = useRef<HTMLDivElement>(null)
  const request = useRef<AbortController | null>(null)
  const [question, setQuestion] = useState('')
  const [consent, setConsent] = useState(false)
  const [turns, setTurns] = useState<Turn[]>([])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => () => request.current?.abort(), [])

  useEffect(() => {
    if (transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight
  }, [turns, pending, error])

  function reset() {
    request.current?.abort()
    request.current = null
    setQuestion('')
    setConsent(false)
    setTurns([])
    setPending(false)
    setError('')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const message = question.trim()
    if (!message || !consent || request.current) return

    const controller = new AbortController()
    request.current = controller
    setPending(true)
    setError('')

    try {
      const response = await fetch('/api/derma-beta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: message }),
        signal: controller.signal,
      })
      const payload = await response.json()
      if (controller.signal.aborted) return
      if (!response.ok) {
        setError(typeof payload.error === 'string' ? payload.error : 'Chưa nhận được câu trả lời.')
        return
      }
      setTurns((current) => [...current.slice(-5), { question: message, answer: payload as Answer }])
      setQuestion('')
    } catch {
      if (!controller.signal.aborted) setError('Kết nối bị gián đoạn. Vui lòng thử lại.')
    } finally {
      if (request.current === controller) {
        request.current = null
        setPending(false)
      }
    }
  }

  return (
    <>
      <button type="button" className={styles.launcher} onClick={() => dialog.current?.showModal()} aria-haspopup="dialog">
        <MessageCircle size={20} aria-hidden="true" /> Hỏi về da liễu
      </button>
      <dialog ref={dialog} className={styles.dialog} aria-labelledby="derma-beta-title" onClose={reset}>
        <header className={styles.header}>
          <div>
            <h2 id="derma-beta-title">Hỏi về da liễu</h2>
            <p>Bản thử nghiệm dành cho đội phòng khám</p>
          </div>
          <button type="button" className={styles.close} aria-label="Đóng trợ lý" onClick={() => dialog.current?.close()}>
            <X size={21} aria-hidden="true" />
          </button>
        </header>
        <div ref={transcript} className={styles.transcript} role="log" aria-label="Nội dung hỏi đáp">
          {turns.length === 0 && (
            <>
              <p>Dùng câu hỏi mẫu để duyệt nội dung. Mỗi câu được xử lý riêng. Thông tin chỉ để tham khảo.</p>
              <div className={styles.examples}>
                {examples.map((example) => (
                  <button type="button" key={example} onClick={() => setQuestion(example)} disabled={pending}>{example}</button>
                ))}
              </div>
            </>
          )}
          {turns.map((turn, index) => (
            <div key={`${index}-${turn.question}`} className={styles.turn}>
              <p className={styles.question}>{turn.question}</p>
              <div className={turn.answer.is_urgent ? styles.urgent : styles.reply}>
                <p>{turn.answer.reply}</p>
                {turn.answer.is_dermatology && !turn.answer.is_urgent && (
                  <Link href="/khachhang/appointments" onClick={() => dialog.current?.close()}>Đặt lịch khám ↗</Link>
                )}
              </div>
            </div>
          ))}
          {pending && <p role="status">Đang chuẩn bị câu trả lời…</p>}
          {error && <p className={styles.urgent} role="alert">{error}</p>}
        </div>
        <form className={styles.form} onSubmit={submit}>
          <label className={styles.consent}>
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required />
            Tôi chỉ dùng tình huống mẫu và không nhập thông tin nhận dạng người bệnh.
          </label>
          <label htmlFor="derma-beta-question">Câu hỏi của bạn</label>
          <div className={styles.composer}>
            <textarea id="derma-beta-question" value={question} onChange={(event) => setQuestion(event.target.value)}
              maxLength={600} required rows={2} disabled={pending} placeholder="Ví dụ: Nốt ruồi thay đổi màu có cần đi khám?" />
            <button type="submit" aria-label="Gửi câu hỏi" disabled={pending || !consent || !question.trim()}>
              <Send size={19} aria-hidden="true" />
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}
