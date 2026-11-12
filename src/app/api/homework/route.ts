import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Row = {
  id: string
  title: string
  due_at: string | null
  cls: { name: string; teacher_name: string } | null
  assignment_questions: {
    position: number
    question: {
      id: string
      position: number
      prompt_md: string
      kind: string
      figure: unknown
      approved: boolean
      card: { position: number; title: string } | null
    } | null
  }[]
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: 'not signed in' }, { status: 401 })

  const slug = new URL(req.url).searchParams.get('topic') ?? ''
  if (!/^[a-z0-9-]{1,40}$/.test(slug)) return NextResponse.json({ error: 'bad request' }, { status: 400 })

  const admin = createAdminClient()
  const { data: members } = await admin
    .from('class_members')
    .select('class_id')
    .eq('learner_id', auth.user.id)
  const classIds = (members ?? []).map(m => m.class_id as string)
  if (classIds.length === 0) return NextResponse.json({ joined: false, assignments: [] })

  const { data, error } = await admin
    .from('assignments')
    .select(
      'id,title,due_at,created_at,cls:classes(name,teacher_name),topics!inner(slug),assignment_questions(position,question:questions(id,position,prompt_md,kind,figure,approved,card:cards(position,title)))'
    )
    .in('class_id', classIds)
    .eq('topics.slug', slug)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('homework load failed:', error.message)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }

  const rows = (data ?? []) as unknown as Row[]
  const assignments = rows.map(a => ({
    id: a.id,
    title: a.title,
    dueAt: a.due_at,
    className: a.cls?.name ?? '',
    teacherName: a.cls?.teacher_name ?? '',
    questions: a.assignment_questions
      .filter(x => x.question && x.question.approved)
      .sort((x, y) => x.position - y.position)
      .map(x => ({
        id: x.question!.id,
        position: x.question!.position,
        prompt_md: x.question!.prompt_md,
        kind: x.question!.kind,
        figure: x.question!.figure,
        card: x.question!.card,
      })),
  }))
  return NextResponse.json({ joined: true, assignments })
}