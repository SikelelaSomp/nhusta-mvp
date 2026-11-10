'use client'
import { useState } from 'react'
import MathText from '@/components/MathText'

type Msg = { role: 'user' | 'assistant'; content: string }

export default function NonoPanel({ questionId, lastAnswer }: { questionId: string; lastAnswer: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  async function ask(message: string) {
    setBusy(true)
    try {
      const res = await fetch('/api/nono', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, message, history: msgs.slice(-6), lastAnswer }),
      })
      const { reply } = await res.json()
      setMsgs(m => [
        ...m,
        { role: 'user', content: message },
        { role: 'assistant', content: reply || "I'm having trouble right now. Please try again." },
      ])
      setText('')
    } catch {
      setMsgs(m => [
        ...m,
        { role: 'user', content: message },
        { role: 'assistant', content: "I'm having trouble right now. Please try again." },
      ])
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-5 rounded-xl bg-cream p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-cream">N</span>
        <span className="font-bold text-brand">Nono</span>
      </div>

      {msgs.length === 0 && (
        <button
          onClick={() => ask('Can I have a hint?')}
          disabled={busy}
          className="mt-3 w-full rounded-full border-2 border-brand py-2 font-semibold text-brand disabled:opacity-50"
        >
          {busy ? 'Nono is thinking...' : 'Ask Nono for a hint'}
        </button>
      )}

      <div className="mt-3 space-y-3">
        {msgs.map((m, n) =>
          m.role === 'assistant' ? (
            <div key={n} className="rounded-xl bg-white p-3 text-[15px] shadow-sm">
              <MathText>{m.content}</MathText>
            </div>
          ) : (
            n > 0 && (
              <div key={n} className="ml-8 rounded-xl bg-gold/40 p-3 text-[15px]">{m.content}</div>
            )
          )
        )}
        {busy && msgs.length > 0 && <p className="text-sm text-gray-500">Nono is thinking...</p>}
      </div>

      {msgs.length > 0 && msgs.length < 12 && (
        <form
          onSubmit={e => { e.preventDefault(); if (text.trim() && !busy) ask(text.trim()) }}
          className="mt-3 flex gap-2"
        >
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={200}
            placeholder="Ask Nono about this question"
            className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2"
          />
          <button
            type="submit"
            disabled={busy || !text.trim()}
            className="rounded-lg bg-brand px-4 font-semibold text-cream disabled:opacity-50"
          >
            Send
          </button>
        </form>
      )}
    </section>
  )
}