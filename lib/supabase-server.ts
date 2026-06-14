import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const clean = (s: string | undefined) => (s ?? '').replace(/^﻿/, '').trim()

// Hard cap every Supabase call at 8s so a cold/slow instance can never hang a
// page until Vercel's function timeout kills it and returns a 504.
const timedFetch = (url: RequestInfo | URL, options?: RequestInit) =>
  fetch(url, { ...options, signal: AbortSignal.timeout(8000) })

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
    clean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    {
      global: { fetch: timedFetch },
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
