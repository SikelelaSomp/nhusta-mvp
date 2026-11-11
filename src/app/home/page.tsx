'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useLearner } from '@/lib/useLearner'
import { LIVE_TOPICS } from '@/lib/config'

type Topic = { slug: string; title: string; depth: string }

export default function Home() {
  const learner = useLearner()
  const [topics, setTopics] = useState<Topic[]>([])

  useEffect(() => {
    if (!learner) return
    createClient()
      .from('topics')
      .select('slug,title,depth')
      .eq('grade', learner.grade)
      .order('position')
      .then(({ data }) => setTopics((data as Topic[]) ?? []))
  }, [learner])

  if (!learner) return <main className="p-6">Loading...</main>

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 py-8">
      <h1 className="text-2xl font-bold text-brand">Hi {learner.name}</h1>
      <p className="mt-1 text-gray-600">Grade {learner.grade} maths. Pick a topic.</p>

      <ul className="mt-6 space-y-3">
        {topics.map(t => {
          const live = LIVE_TOPICS.includes(t.slug)
          const body = (
            <div
              className={`rounded-2xl p-5 shadow ${live ? 'bg-brand text-cream' : 'bg-white text-gray-400'}`}
            >
              <div className="text-xl font-bold">{t.title}</div>
              <div className="mt-1 text-sm">{live ? 'Open' : }</div>
            </div>
          )
          return (
            <li key={t.slug}>{live ? <Link href={`/topics/${t.slug}`}>{body}</Link> : body}</li>
          )
        })}
      </ul>
    </main>
  )
}