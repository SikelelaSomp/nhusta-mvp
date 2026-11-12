import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I so codes survive being typed on a phone

function makeCode() {
  let s = ''
  for (let i = 0; i < 4; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  return `MATH-${s}`
}

export async function POST(req: Request) {
  let body: { name?: unknown; teacherName?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const teacherName = typeof body.teacherName === 'string' ? body.teacherName.trim() : ''
  if (!name || name.length > 60 || !teacherName || teacherName.length > 60) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }

  const admin = createAdminClient()
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeCode()
    const { data, error } = await admin
      .from('classes')
      .insert({ name, teacher_name: teacherName, code })
      .select('id,code,name')
      .single()
    if (!error && data) return NextResponse.json(data)
    if (error && error.code !== '23505') {
      console.error('class not created:', error.message)
      return NextResponse.json({ error: 'failed' }, { status: 500 })
    }
  }
  return NextResponse.json({ error: 'failed' }, { status: 500 })
}