'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Topic = { slug: string; title: string; depth: string }

// step 1 smoke test (replaced by the welcome page in step 2)
export default function Home() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [cards, setCards] = useState<number | null>(null)
  const [status, setStatus] = useState('starting...')

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: s } = await supabase.auth.getSession()
      if (!s.session) {
        const { error } = await supabase.auth.signInAnonymously()
        if (error) return setStatus('sign in failed: ' + error.message)
      }
      const t = await supabase.from('topics').select('slug,title,depth').order('position')
      if (t.error) return setStatus('topics failed: ' + t.error.message)
      setTopics(t.data as Topic[])
      const c = await supabase.from('cards').select('id', { count: 'exact', head: true })
      setCards(c.count)
      setStatus('ok')
    })()
  }, [])

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>NHUSTA</h1>
      <p>status: {status}</p>
      <ul>{topics.map(t => <li key={t.slug}>{t.title} ({t.depth})</li>)}</ul>
      <p>cards visible: {cards ?? '-'}</p>
    </main>
  )
}