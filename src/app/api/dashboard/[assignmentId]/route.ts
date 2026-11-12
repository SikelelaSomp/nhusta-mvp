import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MINUTES_PER_ANSWER = 1 // rough estimate of a teacher's time to mark one answer by hand

type AQ = { position: number; question: { id: string; position: number; prompt_md: string } | null }
type M = { learner: { id: string; name: string } | null }
type At = { learner_id: string; question_id: string; correct: boolean }

export async function GET(_req: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params
  if (!UUID.test(assignmentId)) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const admin = createAdminClient()
  const { data: asg } = await admin
    .from('assignments')
    .select('id,title,due_at,class_id')
    .eq('id', assignmentId)
    .maybeSingle()
  if (!asg) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const { data: aq } = await admin
    .from('assignment_questions')
    .select('position,question:questions(id,position,prompt_md)')
    .eq('assignment_id', assignmentId)
  const { data: mem } = await admin
    .from('class_members')
    .select('learner:learners(id,name)')
    .eq('class_id', asg.class_id)
  const { data: att } = await admin
    .from('attempts')
    .select('learner_id,question_id,correct')
    .eq('assignment_id', assignmentId)
    .order('created_at', { ascending: true })

  const questions = ((aq ?? []) as unknown as AQ[])
    .filter(x => x.question)
    .sort((a, b) => a.position - b.position)
    .map(x => x.question!)
  const members = ((mem ?? []) as unknown as M[]).map(m => m.learner).filter((l): l is { id: string; name: string } => !!l)
  const attempts = (att ?? []) as unknown as At[]

  // first attempt per learner per question decides "right first time"
  const first = new Map<string, Map<string, boolean>>()
  for (const a of attempts) {
    let m = first.get(a.learner_id)
    if (!m) first.set(a.learner_id, (m = new Map()))
    if (!m.has(a.question_id)) m.set(a.question_id, a.correct)
  }

  const total = questions.length
  const learners = members
    .map(l => {
      const m = first.get(l.id) ?? new Map<string, boolean>()
      const answered = m.size
      const right = Array.from(m.values()).filter(Boolean).length
      return {
        id: l.id,
        name: l.name,
        answered,
        rightFirstTime: right,
        scorePct: total ? Math.round((right / total) * 100) : 0,
        status: answered === 0 ? 'not started' : answered < total ? 'in progress' : 'done',
      }
    })
    .sort((a, b) => a.scorePct - b.scorePct)

  const perQuestion = questions.map((q, i) => {
    let tried = 0
    let right = 0
    for (const l of members) {
      const r = first.get(l.id)?.get(q.id)
      if (r !== undefined) {
        tried++
        if (r) right++
      }
    }
    return {
      n: i + 1,
      id: q.id,
      prompt_md: q.prompt_md,
      attemptedBy: tried,
      rightFirstTimePct: tried ? Math.round((right / tried) * 100) : null,
    }
  })

  const started = learners.filter(l => l.answered > 0)
  const completed = learners.filter(l => l.status === 'done')
  const answersMarked = learners.reduce((s, l) => s + l.answered, 0)

  return NextResponse.json({
    assignment: { id: asg.id, title: asg.title, dueAt: asg.due_at, questionCount: total },
    summary: {
      members: members.length,
      started: started.length,
      completed: completed.length,
      completionPct: members.length ? Math.round((completed.length / members.length) * 100) : 0,
      avgScorePct: started.length ? Math.round(started.reduce((s, l) => s + l.scorePct, 0) / started.length) : 0,
      answersMarked,
      minutesSaved: answersMarked * MINUTES_PER_ANSWER,
    },
    learners,
    perQuestion,
  })
}