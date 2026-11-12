'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Saved = { id: string; name: string; code: string }
const KEY = 'nhusta_classes'

export default function TeacherHome() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [teacherName, setTeacherName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [saved, setSaved] = useState<Saved[]>([])

  useEffect(() => {
    try {
      setSaved(JSON.parse(localStorage.getItem(KEY) ?? '[]'))
    } catch {
      setSaved([])
    }
  }, [])

  async function create() {
    if (!name.trim() || !teacherName.trim() || busy) return
    setBusy(true)
    setErr('')
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, teacherName }),
      })
      if (!res.ok) throw new Error('failed')
      const c: Saved = await res.json()
      try {
        localStorage.setItem(KEY, JSON.stringify([c, ...saved.filter(s => s.id !== c.id)]))
      } catch {}
      router.push(`/teacher/${c.id}`)
    } catch {
      setErr('Could not create the class. Try again.')
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 py-8">
        <Link href="/" className="text-sm font-semibold text-brand">&larr; Back to NHUSTA</Link>
      <h1 className="text-3xl font-bold text-brand">Teacher</h1>
      <p className="mt-1 text-gray-600">Create a class, give learners the code, assign homework, see results.</p>

      <div className="mt-6 rounded-2xl bg-white p-5 shadow">
        <label className="block text-sm font-semibold">Class name</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={60}
          placeholder="Grade 10A Maths"
          className="mt-1 w-full rounded-lg border-2 border-gray-300 px-3 py-3 focus:border-brand focus:outline-none"
        />
        <label className="mt-4 block text-sm font-semibold">Your name</label>
        <input
          value={teacherName}
          onChange={e => setTeacherName(e.target.value)}
          maxLength={60}
          placeholder="Mr Dlamini"
          className="mt-1 w-full rounded-lg border-2 border-gray-300 px-3 py-3 focus:border-brand focus:outline-none"
        />
        {err && <p className="mt-3 text-red-600">{err}</p>}
        <button
          onClick={create}
          disabled={busy || !name.trim() || !teacherName.trim()}
          className="mt-5 w-full rounded-full bg-brand py-3 text-lg font-bold text-cream disabled:opacity-50"
        >
          {busy ? 'Creating...' : 'Create class'}
        </button>
      </div>

      {saved.length > 0 && (
        <div className="mt-8">
          <h2 className="font-bold text-brand">Your classes</h2>
          <ul className="mt-2 space-y-2">
            {saved.map(c => (
              <li key={c.id}>
                <Link href={`/teacher/${c.id}`} className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow">
                  <span className="font-semibold">{c.name}</span>
                  <span className="font-mono text-sm text-gray-500">{c.code}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  )
}