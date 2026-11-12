'use client'
import { use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
type Assignment = { id: string; title: string; dueAt: string | null; className: string; teacherName: string; questions: Q[] }
type Data = { joined: boolean; assignments: Assignment[] }
type State = 'idle' | 'checking' | 'correct' | 'wrong' | 'error'

const HINTS: Record<string, string> = {
  numeric: 'Type a number. Round as the question says.',
  algebra: 'Write fractions like 5/13. Use sqrt(3) or the √ button for a square root.',
}

export default function Homework({ params }: { params: Promise<{ topic: string }> }) {
  const { topic: slug } = use(params)
  const router = useRouter()
  const learner = useLearner()
  const [data, setData] = useState<Data | null>(null)
  const [loadError, setLoadError] = useState('')
  const [active, setActive] = useState<Assignment | null>(null)
  const [code, setCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinMsg, setJoinMsg] = useState('')
  const [addAnother, setAddAnother] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/homework?topic=${slug}`)
      if (!res.ok) throw new Error('failed')
      setData(await res.json())
    } catch {
      setLoadError('Could not load homework.')
    }
  }, [slug])

  useEffect(() => {
    if (!learner) return
    if (!LIVE_TOPICS.includes(slug)) return router.replace('/home')
    load()
  }, [learner, slug, router, load])

  async function join() {
    if (!code.trim() || joining) return
    setJoining(true)
    setJoinMsg('')
    try {
      const res = await fetch('/api/classes/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      if (res.status === 404) {
        setJoinMsg('That code was not found. Check it and try again.')
      } else if (!res.ok) {
        setJoinMsg('Something went wrong. Try again.')
      } else {
        setCode('')
        setAddAnother(false)
        await load()
      }
    } catch {
      setJoinMsg('Something went wrong. Try again.')
    }
    setJoining(false)
  }

  if (loadError) return <main className="p-6 text-red-600">{loadError}</main>
  if (!learner || !data) return <main className="p-6">Loading...</main>

  if (active) {
    return <Runner assignment={active} slug={slug} name={learner.name} onExit={() => setActive(null)} />
  }

  const joinBox = (
    <div className="mt-6 rounded-2xl bg-white p-5 shadow">
      <label className="block text-sm font-semibold">Class code from your teacher</label>
      <input
        value={code}
        onChange={e => setCode(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') join() }}
        maxLength={12}
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        placeholder="MATH-4K7P"
        className="mt-2 w-full rounded-lg border-2 border-gray-300 px-3 py-3 text-center font-mono text-xl uppercase tracking-widest focus:border-brand focus:outline-none"
      />
      {joinMsg && <p className="mt-3 font-semibold text-accent">{joinMsg}</p>}
      <button
        onClick={join}
        disabled={joining || !code.trim()}
        className="mt-4 w-full rounded-full bg-brand py-3 text-lg font-bold text-cream disabled:opacity-50"
      >
        {joining ? 'Joining...' : 'Join class'}
      </button>
    </div>
  )

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 py-6">
      <Link href={`/topics/${slug}`} className="text-sm font-semibold text-brand">&larr; Back to topic</Link>
      <h1 className="mt-4 text-3xl font-bold text-brand">Homework</h1>

      {!data.joined && (
        <>
          <p className="mt-2 text-gray-600">Your teacher gives you a class code. Type it in once to see your homework.</p>
          {joinBox}
        </>
      )}

      {data.joined && (
        <>
          {data.assignments.length === 0 ? (
            <p className="mt-3 text-gray-600">No homework for this topic yet. Check back soon.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {data.assignments.map(a => (
                <li key={a.id}>
                  <button
                    onClick={() => setActive(a)}
                    disabled={a.questions.length === 0}
                    className="w-full rounded-2xl bg-white p-4 text-left shadow disabled:opacity-50"
                  >
                    <div className="text-xs font-semibold uppercase tracking-wide text-accent">{a.className}</div>
                    <div className="mt-1 text-lg font-bold text-brand">{a.title}</div>
                    <div className="mt-1 text-sm text-gray-600">
                      {a.questions.length} question{a.questions.length === 1 ? '' : 's'}
                      {a.dueAt ? ` · due ${new Date(a.dueAt).toLocaleDateString()}` : ''}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => setAddAnother(v => !v)} className="mt-6 text-sm font-semibold text-gray-500 underline">
            Join another class
          </button>
          {addAnother && joinBox}
        </>
      )}
    </main>
  )
}

function Runner({ assignment, slug, name, onExit }: { assignment: Assignment; slug: string; name: string; onExit: () => void }) {
  const qs = assignment.questions
  const [i, setI] = useState(0)
  const [answer, setAnswer] = useState('')
  const [state, setState] = useState<State>('idle')
  const [wrongHere, setWrongHere] = useState(false)
  const [results, setResults] = useState<Record<number, boolean>>({})
  const [done, setDone] = useState(false)

  const score = Object.values(results).filter(Boolean).length

  if (done) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="text-3xl font-bold text-brand">Homework done, {name}</h1>
        <p className="mt-3 text-xl">
          You got <strong>{score}</strong> of {qs.length} right on the first try.
        </p>
        <p className="mt-2 text-gray-600">Your teacher can see your results.</p>
        <button onClick={onExit} className="mt-8 rounded-full bg-brand px-8 py-3 font-bold text-cream">
          Back to homework
        </button>
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
        body: JSON.stringify({ questionId: q.id, response: answer, assignmentId: assignment.id }),
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
      <button onClick={onExit} className="self-start text-sm font-semibold text-brand">&larr; Back to homework</button>
      <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-accent">{assignment.className} &middot; {assignment.title}</div>

      <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
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