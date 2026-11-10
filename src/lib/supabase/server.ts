import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// server client that acts as the signed-in learner (reads the session cookie)
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(list) {
          try {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // called from a route handler that can't set cookies: safe to ignore
          }
        },
      },
    }
  )
}