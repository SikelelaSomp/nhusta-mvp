'use client'
import { use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import MathText from '@/components/MathText'

const TOPIC = 'trigonometry' // the only fully working topic for now
const KEY = 'nhusta_classes'

type Info = {
  class: { id: string; name: string; teacher_name: string; code: string }
  memberCount: number
  assignments: { id: string; title: string; dueAt: string | null; topicTitle: string; questionCount: number }[]
  bank: { id: string; prompt_md: string; cardTitle: string }[]
}
type Dash = {
  assignment: { id: string; title: string; dueAt: string | null; questionCount: number }
  summary: {
    members: number
    started: number
    completed: number
    completionPct: number
    avgScorePct: number
    answersMarked: number
    minutesSaved: number
  }
  learners: { id: string; name: string; answered: number; rightFirstTime: number; scorePct: number; status: string }[]
  perQuestion: { n: number; id: string; prompt_md: string; attemptedBy: number; rightFirstTimePct: number | null }[]
}

export default function ClassPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = use(params)
  const [info, setInfo] = useState<Info | null>(null)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [dash, setDash] = useState<Dash | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/teacher/${classId}?topic=${TOPIC}`)
      if (!res.ok) throw new Error('failed')
      const data: Info = await res.json()
      setInfo(data)
      try {
        const list: { id: string; name: string; code: string }[] = JSON.parse(localStorage.getItem(KEY) ?? '[]')
        const me = { id: data.class.id, name: data.class.name, code: data.class.code }
        localStorage.setItem(KEY, JSON.stringify([me, ...list.filter(c => c.id !== me.id)]))
      } catch {}
    } catch {
      setError('Could not load this class.')
    }
  }, [classId])

  useEffect(() => {
    load()
  }, [load])

  // dashboard: load now, then refresh every 8 seconds while open
  useEffect(() => {
    if (!openId) return
    let stop = false
    const pull = async () => {
      try {
        const res = await fetch(`/api/dashboard/${openId}`)
        if (!res.ok) return
        const d: Dash = await res.json()
        if (!stop) setDash(d)
      } catch {}
    }
    pull()
    const t = setInterval(pull, 8000)
    return () => {
      stop = true
      clearInterval(t)
    }
  }, [openId])

  // open the newest assignment by default
  useEffect(() => {
    if (info && !openId && info.assignments.length > 0) setOpenId(info.assignments[0].id)
  }, [info, openId])

  function toggle(id: string) {
    setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]))
  }

  async function assign() {
    if (!title.trim() || picked.length === 0 || busy || !info) return
    setBusy(true)
    setMsg('')
    try {
      // keep the question bank order, not click order
      const ordered = info.bank.map(b => b.id).filter(id => picked.includes(id))
      const res = await fetch(`/api/teacher/${classId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, dueAt: due, topicSlug: TOPIC, questionIds: ordered }),
      })
      if (!res.ok) throw new Error('failed')
      const { id } = await res.json()
      setTitle('')
      setDue('')
      setPicked([])
      setMsg('Homework assigned.')
      await load()
      setDash(null)
      setOpenId(id)
    } catch {
      setMsg('Could not assign. Try again.')
    }
    setBusy(false)
  }

  if (error) return <main className="p-6 text-red-600">{error}</main>
  if (!info) return <main className="p-6">Loading...</main>

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-8">
      <Link href="/teacher" className="text-sm font-semibold text-brand">&larr; All classes</Link>
      <h1 className="mt-3 text-3xl font-bold text-brand">{info.class.name}</h1>
      <p className="text-gray-600">{info.class.teacher_name} &middot; {info.memberCount} learner{info.memberCount === 1 ? '' : 's'} joined</p>

      <div className="mt-5 rounded-2xl bg-brand p-5 text-center text-cream">
        <div className="text-sm uppercase tracking-wide">Class code, give this to your learners</div>
        <div className="mt-1 font-mono text-4xl font-bold tracking-widest">{info.class.code}</div>
        <div className="mt-1 text-sm">Learners open Trigonometry &gt; Homework and type it in once.</div>
      </div>

      {/* assign */}
      <section className="mt-8 rounded-2xl bg-white p-5 shadow">
        <h2 className="text-xl font-bold text-brand">Assign homework (Trigonometry)</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={80}
            placeholder="Homework title, e.g. Trig homework 2"
            className="rounded-lg border-2 border-gray-300 px-3 py-3 focus:border-brand focus:outline-none"
          />
          <input
            type="date"
            value={due}
            onChange={e => setDue(e.target.value)}
            className="rounded-lg border-2 border-gray-300 px-3 py-3 focus:border-brand focus:outline-none"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold">{picked.length} selected</span>
          <button type="button" onClick={() => setPicked(info.bank.slice(0, 5).map(b => b.id))} className="rounded-full bg-cream px-3 py-1 font-semibold">First 5</button>
          <button type="button" onClick={() => setPicked(info.bank.map(b => b.id))} className="rounded-full bg-cream px-3 py-1 font-semibold">All</button>
          <button type="button" onClick={() => setPicked([])} className="rounded-full bg-cream px-3 py-1 font-semibold">Clear</button>
        </div>
        <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
          {info.bank.map((b, i) => (
            <li key={b.id}>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3">
                <input type="checkbox" checked={picked.includes(b.id)} onChange={() => toggle(b.id)} className="mt-1 h-5 w-5" />
                <span className="text-sm">
                  <span className="font-bold text-brand">{i + 1}. </span>
                  <span className="text-xs uppercase text-accent">{b.cardTitle}</span>
                  <div><MathText>{b.prompt_md}</MathText></div>
                </span>
              </label>
            </li>
          ))}
        </ul>
        {msg && <p className="mt-3 font-semibold text-brand">{msg}</p>}
        <button
          onClick={assign}
          disabled={busy || !title.trim() || picked.length === 0}
          className="mt-4 w-full rounded-full bg-brand py-3 text-lg font-bold text-cream disabled:opacity-50"
        >
          {busy ? 'Assigning...' : 'Assign to class'}
        </button>
      </section>

      {/* dashboard */}
      <section className="mt-8">
        <h2 className="text-xl font-bold text-brand">Results</h2>
        {info.assignments.length === 0 ? (
          <p className="mt-2 text-gray-600">No homework assigned yet.</p>
        ) : (
          <>
            <div className="mt-2 flex flex-wrap gap-2">
              {info.assignments.map(a => (
                <button
                  key={a.id}
                  onClick={() => { setDash(null); setOpenId(a.id) }}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${openId === a.id ? 'bg-brand text-cream' : 'bg-white shadow'}`}
                >
                  {a.title}
                </button>
              ))}
            </div>

            {!dash && <p className="mt-4">Loading results...</p>}
            {dash && (
              <div className="mt-4 space-y-5">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat label="Completed" value={`${dash.summary.completed}/${dash.summary.members}`} sub={`${dash.summary.completionPct}% of class`} />
                  <Stat label="Average score" value={`${dash.summary.avgScorePct}%`} sub="right first time" />
                  <Stat label="Answers auto-marked" value={`${dash.summary.answersMarked}`} sub="no marking by hand" />
                  <Stat label="Marking time saved" value={`~${dash.summary.minutesSaved} min`} sub="estimate, 1 min per answer" />
                </div>

                <div className="rounded-2xl bg-white p-5 shadow">
                  <h3 className="font-bold text-brand">Hardest questions</h3>
                  <p className="text-xs text-gray-500">% of learners who got it right on the first try</p>
                  <ul className="mt-3 space-y-3">
                    {dash.perQuestion.map(q => (
                      <li key={q.id}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold">Q{q.n}</span>
                          <span>{q.rightFirstTimePct === null ? 'no answers yet' : `${q.rightFirstTimePct}% (${q.attemptedBy} answered)`}</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-200">
                          <div className="h-full bg-brand" style={{ width: `${q.rightFirstTimePct ?? 0}%` }} />
                        </div>
                        <div className="mt-1 text-xs text-gray-600"><MathText>{q.prompt_md}</MathText></div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow">
                  <h3 className="font-bold text-brand">Learners</h3>
                  {dash.learners.length === 0 ? (
                    <p className="mt-2 text-sm text-gray-600">Nobody has joined yet.</p>
                  ) : (
                    <table className="mt-3 w-full text-left text-sm">
                      <thead className="text-xs uppercase text-gray-500">
                        <tr><th className="py-1">Name</th><th>Status</th><th>Answered</th><th>Score</th></tr>
                      </thead>
                      <tbody>
                        {dash.learners.map(l => (
                          <tr key={l.id} className="border-t border-gray-100">
                            <td className="py-2 font-semibold">{l.name}</td>
                            <td className={l.status === 'not started' ? 'text-accent' : ''}>{l.status}</td>
                            <td>{l.answered}/{dash.assignment.questionCount}</td>
                            <td>{l.answered ? `${l.scorePct}%` : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <p className="text-xs text-gray-500">Updates every few seconds. Score counts questions right on the first try.</p>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 text-center shadow">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-brand">{value}</div>
      <div className="text-xs text-gray-500">{sub}</div>
    </div>
  )
}