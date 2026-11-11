'use client'
import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLearner } from '@/lib/useLearner'
import { LIVE_STAGES, LIVE_TOPICS, STAGES } from '@/lib/config'
import { scenes } from '@/components/scenes/registry'
import BrandHeader from '@/components/BrandHeader'

// one logo colour per stage, in order
const STAGE_COLOURS = [
  { bg: 'var(--nh-red)', fg: '#fff' },
  { bg: 'var(--nh-gold)', fg: 'var(--nh-ink)' },
  { bg: 'var(--nh-green)', fg: '#fff' },
  { bg: 'var(--nh-purple)', fg: '#fff' },
]

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

  if (!learner || !title) return <main className="nh-pattern min-h-screen p-6">Loading...</main>

  return (
    <div className="nh-pattern min-h-screen">
      <BrandHeader back={{ href: '/home', label: 'Topics' }} />
      <main className="mx-auto max-w-md px-5 pb-10 pt-6">
        <h1 className="text-3xl font-extrabold text-[var(--nh-ink)]">{title}</h1>
        <p className="mt-1 text-[var(--nh-ink)]/70">Four stages. Take them in order.</p>

        <ol className="mt-6 space-y-3">
          {STAGES.map((s, i) => {
            // explore is open wherever a simulation exists for this topic
            const live =
              LIVE_STAGES.includes(s.key) || (s.key === 'explore' && Boolean(scenes[slug]))
            const c = STAGE_COLOURS[i % STAGE_COLOURS.length]
            const row = (
              <div
                className={`flex items-center gap-4 rounded-2xl bg-white p-4 shadow-md ${
                  live ? 'active:scale-[0.98]' : 'opacity-60'
                }`}
                style={{ borderLeft: `8px solid ${c.bg}` }}
              >
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-extrabold"
                  style={{ background: c.bg, color: c.fg }}
                >
                  {i + 1}
                </span>
                <div className="flex-1">
                  <div className="text-lg font-bold text-[var(--nh-ink)]">{s.label}</div>
                  <div className="text-sm text-[var(--nh-ink)]/70">{s.desc}</div>
                </div>
                {live && (
                  <span
                    className="rounded-full px-3 py-1 text-sm font-bold"
                    style={{ background: c.bg, color: c.fg }}
                  >
                    Start
                  </span>
                )}
              </div>
            )
            return (
              <li key={s.key}>
                {live ? <Link href={`/topics/${slug}/${s.key}`}>{row}</Link> : row}
              </li>
            )
          })}
        </ol>

        <Link
          href={`/topics/${slug}/cards`}
          className="mt-6 block rounded-2xl bg-[var(--nh-ink)] p-5 text-white shadow-md"
          style={{ borderBottom: '6px solid var(--nh-gold)' }}
        >
          <div className="text-lg font-bold">Cue cards</div>
          <div className="text-sm text-white/80">Read the worked examples any time</div>
        </Link>
      </main>
    </div>
  )
}