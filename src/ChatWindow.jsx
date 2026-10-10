import { useEffect, useRef, useState } from 'react'

// Chat panel that pops up when you click a professor. Talks to the FastAPI backend,
// which runs one PydanticAI agent per professor.

const SESSION_ID = (() => {
  try {
    return crypto.randomUUID()
  } catch {
    return `s${Math.random().toString(36).slice(2)}`
  }
})()

export default function ChatWindow({ professorId, professorName, subtitle, greeting, onClose }) {
  const [messages, setMessages] = useState(() => (greeting ? [{ role: 'prof', text: greeting }] : []))
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const listRef = useRef()
  const inputRef = useRef()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    // keep the newest message in view
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  async function send(e) {
    e?.preventDefault()
    const text = draft.trim()
    if (!text || busy) return
    setDraft('')
    setError(null)
    setMessages((m) => [...m, { role: 'you', text }])
    setBusy(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ professor_id: professorId, message: text, session_id: SESSION_ID }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `Backend returned ${res.status}`)
      }
      const data = await res.json()
      setMessages((m) => [...m, { role: 'prof', text: data.reply }])
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setBusy(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="chatwrap" onClick={(e) => e.stopPropagation()}>
      <div className="chat">
        <header className="chathead">
          <div>
            <div className="chatname">{professorName}</div>
            {subtitle && <div className="chatsub">{subtitle}</div>}
          </div>
          <button className="chatclose" onClick={onClose} aria-label="Close chat">
            ×
          </button>
        </header>

        <div className="chatlog" ref={listRef} role="log" aria-live="polite">
          {messages.map((msg, i) => (
            <div key={i} className={`bubble ${msg.role}`}>
              {msg.text}
            </div>
          ))}
          {busy && (
            <div className="bubble prof thinking" aria-label="Thinking">
              <span /><span /><span />
            </div>
          )}
          {error && <div className="chaterr">{error}</div>}
        </div>

        <form className="chatform" onSubmit={send}>
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Ask ${professorName.split(' ').slice(-1)[0]} something...`}
            maxLength={1500}
            disabled={busy}
            aria-label="Your message"
          />
          <button type="submit" disabled={busy || !draft.trim()}>
            Send
          </button>
        </form>
        <div className="chathint">Esc to walk away</div>
      </div>
    </div>
  )
}
