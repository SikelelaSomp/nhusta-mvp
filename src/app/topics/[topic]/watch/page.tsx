'use client'
import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLearner } from '@/lib/useLearner'
import BrandHeader from '@/components/BrandHeader'

// accepts a YouTube link (watch / youtu.be / shorts), a Vimeo link, or a direct .mp4 link
function toPlayer(url: string): { kind: 'iframe' | 'file'; src: string } {
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/)
  if (yt) return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0` }
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vm) return { kind: 'iframe', src: `https://player.vimeo.com/video/${vm[1]}` }
  return { kind: 'file', src: url }
}

export default function WatchPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic: slug } = use(params)
  const router = useRouter()
  const learner = useLearner()
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!learner) return
    createClient()
      .from('topics')
      .select('title, watch_video_url')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return router.replace('/home')
        setTitle(data.title)
        setUrl(data.watch_video_url)
        setLoaded(true)
      })
  }, [learner, slug, router])

  if (!learner || !loaded) return <main className="nh-pattern min-h-screen p-6">Loading...</main>

  const player = url ? toPlayer(url) : null

  return (
    <div className="nh-pattern min-h-screen">
      <BrandHeader back={{ href: `/topics/${slug}`, label: title }} />
      <main className="mx-auto max-w-md px-5 pb-10 pt-6">
        <p className="text-sm font-bold uppercase tracking-wide text-[var(--nh-red)]">Stage 1 · Watch</p>
        <h1 className="mt-1 text-2xl font-extrabold text-[var(--nh-ink)]">{title}</h1>

        <div className="mt-4 aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-md">
          {player?.kind === 'iframe' && (
            <iframe
              src={player.src}
              title={`${title} video lesson`}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
          )}
          {player?.kind === 'file' && (
            <video src={player.src} controls playsInline preload="metadata" className="h-full w-full" />
          )}
          {!player && (
            <div className="flex h-full items-center justify-center p-6 text-center text-white/80">
              The video for this topic is on its way. You can go straight to Explore.
            </div>
          )}
        </div>

        <Link
          href={`/topics/${slug}/explore`}
          className="mt-6 block rounded-2xl p-4 text-center text-lg font-bold shadow-md"
          style={{ background: 'var(--nh-gold)', color: 'var(--nh-ink)' }}
        >
          Next: Explore
        </Link>
      </main>
    </div>
  )
}