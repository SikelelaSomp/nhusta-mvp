import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: 'not signed in' }, { status: 401 })

  let body: { code?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }
  const raw = typeof body.code === 'string' ? body.code : ''
  // case-insensitive, ignores spaces and a missing dash: "math 4k7p" -> MATH-4K7P
  let code = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (code.length === 8) code = `${code.slice(0, 4)}-${code.slice(4)}`
  if (!code || code.length > 12) return NextResponse.json({ error: 'bad request' }, { status: 400 })

  const admin = createAdminClient()
  const { data: cls } = await admin
    .from('classes')
    .select('id,name,teacher_name')
    .eq('code', code)
    .maybeSingle()
  if (!cls) return NextResponse.json({ error: 'code not found' }, { status: 404 })

  const { error } = await admin
    .from('class_members')
    .upsert(
      { class_id: cls.id, learner_id: auth.user.id },
      { onConflict: 'class_id,learner_id', ignoreDuplicates: true }
    )
  if (error) {
    console.error('join failed:', error.message)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, className: cls.name, teacherName: cls.teacher_name })
}