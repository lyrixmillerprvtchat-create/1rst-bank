import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const clean = (s: string | undefined) => (s ?? '').replace(/^﻿/, '').trim()

export async function GET() {
  const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const key = clean(process.env.SUPABASE_SERVICE_ROLE_KEY)

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { error } = await supabase.from('profiles').select('id').limit(1)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, ts: new Date().toISOString() })
}
