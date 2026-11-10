'use client'
import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLearner } from '@/lib/useLearner'
import { LIVE_STAGES, LIVE_TOPICS, STAGES } from '@/lib/config'
import { scenes } from '@/components/scenes/registry'

export default function TopicHub({ params }: { params: Promise<{ topic: string }> }) {
  const { topic: slug } = use(params)
  const router = useRouter()
  const learner = useLearner()
  const [title, setTitle] = useState('')

  useEffect(() => {
    if (!learner) return
    if (!LIVE_TOPICS.includes(slug)) return router.replace('/home')
    createClient()
      .from('topics')
      .select('title')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data }) => (data ? setTitle(data.title) : router.replace('/home')))
  }, [learner, slug, router])

  if (!learner || !title) return <main className="p-6">Loading...</main>

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 py-8">
      <Link href="/home" className="text-sm font-semibold text-brand">&larr; Topics</Link>
      <h1 className="mt-3 text-2xl font-bold text-brand">{title}</h1>
      <p className="mt-1 text-gray-600">Four stages. Take them in order.</p>

      <ol className="mt-6 space-y-3">
        {STAGES.map((s, i) => {
          // explore is open wherever a simulation exists for this topic
          const live =
            LIVE_STAGES.includes(s.key) || (s.key === 'explore' && Boolean(scenes[slug]))
          const row = (
            <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold text-lg font-bold text-brand-dark">
                {i + 1}
              </span>
              <div className="flex-1">
                <div className="text-lg font-bold">{s.label}</div>
                <div className="text-sm text-gray-600">{s.desc}</div>
              </div>
              <span className={`text-xs font-semibold ${live ? 'text-brand' : 'text-gray-400'}`}>
                {live ? 'open' : 'soon'}
              </span>
            </div>
          )
          return (
            <li key={s.key}>{live ? <Link href={`/topics/${slug}/${s.key}`}>{row}</Link> : row}</li>
          )
        })}
      </ol>

      <Link
        href={`/topics/${slug}/cards`}
        className="mt-6 block rounded-2xl bg-brand p-5 text-cream shadow"
      >
        <div className="text-lg font-bold">Cue cards</div>
        <div className="text-sm opacity-90">Read the worked examples any time</div>
      </Link>
    </main>
  )
}