'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Login() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // already signed in with a name? go straight home
  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: s } = await supabase.auth.getSession()
      if (!s.session) return
      const { data } = await supabase.from('learners').select('id').eq('id', s.session.user.id).maybeSingle()
      if (data) router.replace('/home')
    })()
  }, [router])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const clean = name.trim().slice(0, 40)
    if (!clean) return setError('Type your name to continue.')
    setBusy(true)
    setError('')
    const supabase = createClient()

    const { data: s } = await supabase.auth.getSession()
    let uid = s.session?.user.id
    if (!uid) {
      const { data, error } = await supabase.auth.signInAnonymously()
      if (error || !data.user) {
        setBusy(false)
        return setError('Could not sign you in. Please try again.')
      }
      uid = data.user.id
    }

    const { error: saveError } = await supabase.from('learners').upsert({ id: uid, name: clean, grade: 10 })
    if (saveError) {
      setBusy(false)
      return setError('Could not save your name. Please try again.')
    }
    router.push('/home')
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-brand">Welcome</h1>
        <p className="mt-1 text-sm text-gray-600">Tell us who you are to get started.</p>

        <label className="mt-6 block text-sm font-semibold">Your name</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={40}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-3 text-lg"
          placeholder="e.g. Thandi"
          autoComplete="given-name"
        />

        <label className="mt-4 block text-sm font-semibold">Grade</label>
        <div className="mt-1 rounded-lg bg-cream px-3 py-3 text-lg">Grade 10</div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-full bg-brand py-3 text-lg font-bold text-cream disabled:opacity-60"
        >
          {busy ? 'One moment...' : "Let's go"}
        </button>
      </form>
    </main>
  )
}