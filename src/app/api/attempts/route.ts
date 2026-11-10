import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { mark, type Kind } from '@/lib/marking/mark'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// marks an answer on the server. the browser only ever gets { correct: boolean }.
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: 'not signed in' }, { status: 401 })

  let body: { questionId?: unknown; response?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }
  const questionId = typeof body.questionId === 'string' ? body.questionId : ''
  const response = typeof body.response === 'string' ? body.response.trim() : ''
  if (!UUID.test(questionId) || !response || response.length > 60) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: q, error } = await admin
    .from('questions')
    .select('id,kind,approved,question_answers(answer,accepted)')
    .eq('id', questionId)
    .maybeSingle()
  if (error || !q || !q.approved) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const ans = Array.isArray(q.question_answers) ? q.question_answers[0] : q.question_answers
  if (!ans) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const correct = mark(q.kind as Kind, response, ans.answer, (ans.accepted as string[]) ?? [])

  // save the attempt; marking result still goes back if saving fails
  const { error: saveError } = await admin
    .from('attempts')
    .insert({ learner_id: auth.user.id, question_id: questionId, response, correct })
  if (saveError) console.error('attempt not saved:', saveError.message)

  return NextResponse.json({ correct })
}