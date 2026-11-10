'use client'
import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLearner } from '@/lib/useLearner'
import { LIVE_TOPICS } from '@/lib/config'
import MathText from '@/components/MathText'
import NonoPanel from '@/components/NonoPanel'
import Diagram, { type Figure } from '@/components/Diagram'

type Q = {
  id: string
  position: number
  prompt_md: string
  kind: string
  figure: Figure | null
  card: { position: number; title: string } | null
}
type State = 'idle' | 'checking' | 'correct' | 'wrong' | 'error'

const HINTS: Record<string, string> = {
  numeric: 'Type a number. Round as the question says.',
  algebra: 'Write fractions like 5/13. Use sqrt(3) or the √ button for a square root.',
}

export default function Practise({ params }: { params: Promise<{ topic: string }> }) {
  const { topic: slug } = use(params)
  const router = useRouter()
  const learner = useLearner()
  const [qs, setQs] = useState<Q[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [i, setI] = useState(0)
  const [answer, setAnswer] = useState('')
  const [state, setState] = useState<State>('idle')
  const [wrongHere, setWrongHere] = useState(false)
  const [results, setResults] = useState<Record<number, boolean>>({})
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!learner) return
    if (!LIVE_TOPICS.includes(slug)) return router.replace('/home')
    createClient()
      .from('questions')
      .select('id,position,prompt_md,kind,figure,card:cards(position,title),topics!inner(slug)')
      .eq('topics.slug', slug)
      .then(({ data, error }) => {
        if (error) return setLoadError('Could not load the questions.')
        const list = (data as unknown as Q[]) ?? []
        list.sort((a, b) => (a.card?.position ?? 0) - (b.card?.position ?? 0) || a.position - b.position)
        setQs(list)
      })
  }, [learner, slug, router])

  if (loadError) return <main className="p-6 text-red-600">{loadError}</main>
  if (!learner || !qs) return <main className="p-6">Loading...</main>
  if (qs.length === 0) return <main className="p-6">No questions yet.</main>

  const score = Object.values(results).filter(Boolean).length

  if (done) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="text-3xl font-bold text-brand">Well done, {learner.name}</h1>
        <p className="mt-3 text-xl">
          You got <strong>{score}</strong> of {qs.length} right on the first try.
        </p>
        <Link
          href={`/topics/${slug}`}
          className="mt-8 rounded-full bg-brand px-8 py-3 font-bold text-cream"
        >
          Back to topic
        </Link>
      </main>
    )
  }

  const q = qs[i]
  const last = i === qs.length - 1
  const locked = state === 'correct'

  async function check() {
    if (!answer.trim() || state === 'checking' || locked) return
    setState('checking')
    try {
      const res = await fetch('/api/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: q.id, response: answer }),
      })
      if (!res.ok) throw new Error('failed')
      const { correct } = await res.json()
      if (correct) {
        setState('correct')
        setResults(r => ({ ...r, [i]: !wrongHere }))
      } else {
        setState('wrong')
        setWrongHere(true)
      }
    } catch {
      setState('error')
    }
  }

  function next(skipped = false) {
    if (skipped) setResults(r => ({ ...r, [i]: false }))
    if (last) return setDone(true)
    setI(i + 1)
    setAnswer('')
    setState('idle')
    setWrongHere(false)
    window.scrollTo(0, 0)
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-6">
      <Link href={`/topics/${slug}`} className="text-sm font-semibold text-brand">&larr; Back to topic</Link>

      <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
        <span>Question {i + 1} of {qs.length}</span>
        <span className="font-semibold text-brand">{score} right first time</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
        <div className="h-full bg-brand" style={{ width: `${(i / qs.length) * 100}%` }} />
      </div>

      <article className="mt-4 rounded-2xl bg-white p-5 shadow">
        {q.card && <div className="text-xs font-semibold uppercase tracking-wide text-accent">{q.card.title}</div>}
        <div className="mt-2 text-lg">
          <MathText>{q.prompt_md}</MathText>
        </div>
        {q.figure && (
          <div className="mt-3">
            <Diagram figure={q.figure} />
          </div>
        )}

        <form onSubmit={e => { e.preventDefault(); check() }} className="mt-4">
          <input
            value={answer}
            onChange={e => { setAnswer(e.target.value); if (state === 'wrong' || state === 'error') setState('idle') }}
            readOnly={locked}
            maxLength={60}
            inputMode="text"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Your answer"
            className="w-full rounded-lg border-2 border-gray-300 px-3 py-3 text-lg focus:border-brand focus:outline-none"
          />
          {q.kind !== 'mcq' && !locked && (
            <div className="mt-2 flex gap-2">
              {['-', '/', '\u221a(', ')'].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setAnswer(a => a + s)}
                  className="rounded-lg bg-cream px-4 py-2 text-lg font-semibold"
                >
                  {s === '-' ? '\u2212' : s}
                </button>
              ))}
            </div>
          )}
          {HINTS[q.kind] && <p className="mt-2 text-xs text-gray-500">{HINTS[q.kind]}</p>}

          {state === 'correct' && <p className="mt-3 font-bold text-green-700">Correct!</p>}
          {state === 'wrong' && <p className="mt-3 font-semibold text-accent">Not quite. Check it and try again.</p>}
          {state === 'error' && <p className="mt-3 text-red-600">Something went wrong. Please try again.</p>}

          {!locked && (
            <button
              type="submit"
              disabled={state === 'checking' || !answer.trim()}
              className="mt-4 w-full rounded-full bg-brand py-3 text-lg font-bold text-cream disabled:opacity-50"
            >
              {state === 'checking' ? 'Checking...' : 'Check'}
            </button>
          )}
        </form>

        {!locked && <NonoPanel key={q.id} questionId={q.id} lastAnswer={wrongHere ? answer : ''} />}

        {locked && (
          <button
            onClick={() => next()}
            className="mt-4 w-full rounded-full bg-gold py-3 text-lg font-bold text-brand-dark"
          >
            {last ? 'Finish' : 'Next question'}
          </button>
        )}
      </article>

      {!locked && (
        <button onClick={() => next(true)} className="mt-4 text-sm font-semibold text-gray-500 underline">
          Skip this one
        </button>
      )}
    </main>
  )
}