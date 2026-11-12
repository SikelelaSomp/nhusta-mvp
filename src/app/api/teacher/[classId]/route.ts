import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
type Ctx = { params: Promise<{ classId: string }> }

type A = {
  id: string
  title: string
  due_at: string | null
  topics: { title: string } | null
  assignment_questions: unknown[]
}
type B = { id: string; position: number; prompt_md: string; card: { position: number; title: string } | null }

export async function GET(req: Request, { params }: Ctx) {
  const { classId } = await params
  if (!UUID.test(classId)) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const topic = new URL(req.url).searchParams.get('topic') ?? 'trigonometry'
  if (!/^[a-z0-9-]{1,40}$/.test(topic)) return NextResponse.json({ error: 'bad request' }, { status: 400 })

  const admin = createAdminClient()
  const { data: cls } = await admin
    .from('classes')
    .select('id,name,teacher_name,code')
    .eq('id', classId)
    .maybeSingle()
  if (!cls) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const { count } = await admin
    .from('class_members')
    .select('learner_id', { count: 'exact', head: true })
    .eq('class_id', classId)

  const { data: asg } = await admin
    .from('assignments')
    .select('id,title,due_at,topics(title),assignment_questions(question_id)')
    .eq('class_id', classId)
    .order('created_at', { ascending: false })

  const { data: bank } = await admin
    .from('questions')
    .select('id,position,prompt_md,card:cards(position,title),topics!inner(slug)')
    .eq('topics.slug', topic)
    .eq('approved', true)

  const bankRows = ((bank ?? []) as unknown as B[]).sort(
    (a, b) => (a.card?.position ?? 0) - (b.card?.position ?? 0) || a.position - b.position
  )

  return NextResponse.json({
    class: cls,
    memberCount: count ?? 0,
    assignments: ((asg ?? []) as unknown as A[]).map(a => ({
      id: a.id,
      title: a.title,
      dueAt: a.due_at,
      topicTitle: a.topics?.title ?? '',
      questionCount: a.assignment_questions.length,
    })),
    bank: bankRows.map(q => ({
      id: q.id,
      prompt_md: q.prompt_md,
      cardTitle: q.card?.title ?? '',
    })),
  })
}

export async function POST(req: Request, { params }: Ctx) {
  const { classId } = await params
  if (!UUID.test(classId)) return NextResponse.json({ error: 'not found' }, { status: 404 })

  let body: { title?: unknown; dueAt?: unknown; topicSlug?: unknown; questionIds?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const topicSlug = typeof body.topicSlug === 'string' ? body.topicSlug : ''
  const ids = Array.isArray(body.questionIds)
    ? Array.from(new Set(body.questionIds.filter((x): x is string => typeof x === 'string' && UUID.test(x))))
    : []
  const due = typeof body.dueAt === 'string' && body.dueAt ? new Date(body.dueAt) : null
  if (!title || title.length > 80 || ids.length < 1 || ids.length > 50 || (due && isNaN(due.getTime()))) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: cls } = await admin.from('classes').select('id').eq('id', classId).maybeSingle()
  if (!cls) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const { data: topic } = await admin.from('topics').select('id').eq('slug', topicSlug).maybeSingle()
  if (!topic) return NextResponse.json({ error: 'topic not found' }, { status: 404 })

  const { data: valid } = await admin
    .from('questions')
    .select('id')
    .in('id', ids)
    .eq('topic_id', topic.id)
    .eq('approved', true)
  const ok = new Set((valid ?? []).map(v => v.id as string))
  const ordered = ids.filter(id => ok.has(id))
  if (ordered.length === 0) return NextResponse.json({ error: 'no valid questions' }, { status: 400 })

  const { data: created, error } = await admin
    .from('assignments')
    .insert({ class_id: classId, topic_id: topic.id, title, due_at: due ? due.toISOString() : null })
    .select('id')
    .single()
  if (error || !created) {
    console.error('assignment not created:', error?.message)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }

  const { error: linkError } = await admin
    .from('assignment_questions')
    .insert(ordered.map((question_id, position) => ({ assignment_id: created.id, question_id, position })))
  if (linkError) {
    await admin.from('assignments').delete().eq('id', created.id)
    console.error('assignment questions not saved:', linkError.message)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
  return NextResponse.json({ id: created.id })
}