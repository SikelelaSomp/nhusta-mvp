'use client'
import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLearner } from '@/lib/useLearner'
import { LIVE_TOPICS } from '@/lib/config'
import MathText from '@/components/MathText'

type Card = { id: string; position: number; title: string; body_md: string | null }

export default function CueCards({ params }: { params: Promise<{ topic: string }> }) {
  const { topic: slug } = use(params)
  const router = useRouter()
  const learner = useLearner()
  const [cards, setCards] = useState<Card[] | null>(null)
  const [i, setI] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!learner) return
    if (!LIVE_TOPICS.includes(slug)) return router.replace('/home')
    createClient()
      .from('cards')
      .select('id,position,title,body_md,topics!inner(slug)')
      .eq('topics.slug', slug)
      .order('position')
      .then(({ data, error }) => {
        if (error) return setError('Could not load the cards.')
        setCards((data as unknown as Card[]) ?? [])
      })
  }, [learner, slug, router])

  if (error) return <main className="p-6 text-red-600">{error}</main>
  if (!learner || !cards) return <main className="p-6">Loading...</main>
  if (cards.length === 0) return <main className="p-6">No cards yet.</main>

  const card = cards[i]
  const last = i === cards.length - 1

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-6">
      <Link href={`/topics/${slug}`} className="text-sm font-semibold text-brand">&larr; Back to topic</Link>

      <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
        <span>Card {i + 1} of {cards.length}</span>
        <span className="flex gap-1">
          {cards.map((c, n) => (
            <span key={c.id} className={`h-2 w-2 rounded-full ${n === i ? 'bg-brand' : 'bg-gray-300'}`} />
          ))}
        </span>
      </div>

      <article className="mt-3 flex-1 rounded-2xl bg-white p-5 shadow">
        <h1 className="text-xl font-bold text-brand">{card.title}</h1>
        <div className="mt-4 text-[15px]">
          <MathText>{card.body_md ?? ''}</MathText>
        </div>
      </article>

      <div className="sticky bottom-0 mt-4 flex gap-3 bg-cream py-3">
        <button
          onClick={() => { setI(i - 1); window.scrollTo(0, 0) }}
          disabled={i === 0}
          className="flex-1 rounded-full border-2 border-brand py-3 font-bold text-brand disabled:opacity-30"
        >
          Back
        </button>
        {last ? (
          <Link
            href={`/topics/${slug}`}
            className="flex-1 rounded-full bg-gold py-3 text-center font-bold text-brand-dark"
          >
            Done
          </Link>
        ) : (
          <button
            onClick={() => { setI(i + 1); window.scrollTo(0, 0) }}
            className="flex-1 rounded-full bg-brand py-3 font-bold text-cream"
          >
            Next
          </button>
        )}
      </div>
    </main>
  )
}