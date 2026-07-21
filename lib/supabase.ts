import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

const clean = (s: string | undefined) => (s ?? '').replace(/^﻿/, '').trim()

let client: SupabaseClient | undefined

export function createClient() {
  if (!client) {
    client = createBrowserClient(
      clean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    )
  }
  return client
}
