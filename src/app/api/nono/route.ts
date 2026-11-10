import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { askNono, type Msg } from '@/lib/nono/askNono'
import { buildSystemPrompt } from '@/lib/nono/prompt'
import { guardReply } from '@/lib/nono/guard'
import type { Kind } from '@/lib/marking/mark'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// simple per-learner limit: 10 messages a minute (per server instance)
const hits = new Map<string, number[]>()
function limited(id: string) {
  const now = Date.now()
  const recent = (hits.get(id) ?? []).filter(t => now - t < 60_000)
  recent.push(now)
  hits.set(id, recent)
  return recent.length > 10
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: 'not signed in' }, { status: 401 })
  if (limited(auth.user.id)) {
    return NextResponse.json({ reply: 'Give me a moment to catch my breath, then ask again.' })
  }

  let body: { questionId?: unknown; message?: unknown; history?: unknown; lastAnswer?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }

  const questionId = typeof body.questionId === 'string' ? body.questionId : ''
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 200) : ''
  const lastAnswer = typeof body.lastAnswer === 'string' ? body.lastAnswer.trim().slice(0, 60) : ''
  const history: Msg[] = Array.isArray(body.history)
    ? body.history
        .filter(
          (m): m is Msg =>
            !!m &&
            (m.role === 'user' || m.role === 'assistant') &&
            typeof m.content === 'string'
        )
        .slice(-6)
        .map(m => ({ role: m.role, content: m.content.slice(0, 600) }))
    : []
  if (!UUID.test(questionId)) return NextResponse.json({ error: 'bad request' }, { status: 400 })

  const admin = createAdminClient()
  const { data: q } = await admin
    .from('questions')
    .select('id,kind,prompt_md,approved,card_id,question_answers(answer,accepted)')
    .eq('id', questionId)
    .maybeSingle()
  if (!q || !q.approved) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const ans = Array.isArray(q.question_answers) ? q.question_answers[0] : q.question_answers
  if (!ans) return NextResponse.json({ error: 'not found' }, { status: 404 })

  let knowledge = ''
  if (q.card_id) {
    const { data: k } = await admin.from('knowledge').select('content').eq('card_id', q.card_id).maybeSingle()
    knowledge = k?.content ?? ''
  }

  // note: the answer is never sent to the model. the guard below only checks its reply.
  const system = buildSystemPrompt({ knowledge, question: q.prompt_md, lastAnswer })
  const messages: Msg[] = [...history, { role: 'user', content: message || 'Can I have a hint?' }]

  try {
    const raw = await askNono({ system, history: messages })
    const { text } = guardReply(raw, {
      kind: q.kind as Kind,
      answer: ans.answer,
      accepted: (ans.accepted as string[]) ?? [],
      prompt: q.prompt_md,
    })
    return NextResponse.json({ reply: text })
  } catch (e) {
    console.error('nono failed:', e instanceof Error ? e.message : e)
    return NextResponse.json({ reply: "I'm having trouble right now. Try the cue cards, then have another go." })
  }
}