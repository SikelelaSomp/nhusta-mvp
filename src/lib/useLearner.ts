'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export type Learner = { id: string; name: string; grade: number }

// returns the signed-in learner, or sends them to /login
export function useLearner() {
  const router = useRouter()
  const [learner, setLearner] = useState<Learner | null>(null)

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: s } = await supabase.auth.getSession()
      if (!s.session) return router.replace('/login')
      const { data } = await supabase
        .from('learners')
        .select('id,name,grade')
        .eq('id', s.session.user.id)
        .maybeSingle()
      if (!data) return router.replace('/login')
      setLearner(data)
    })()
  }, [router])

  return learner
}