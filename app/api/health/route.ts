import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const clean = (s: string | undefined) => (s ?? '').replace(/^﻿/, '').trim()

export async function GET() {
  try {
    const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL)
    const key = clean(process.env.SUPABASE_SERVICE_ROLE_KEY)
    if (!url || !key) {
      return NextResponse.json({ status: 'error', reason: 'env missing' }, { status: 500 })
    }

    const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
    const { error } = await db.from('profiles').select('user_id').limit(1)
    if (error) {
      return NextResponse.json({ status: 'error', reason: error.message }, { status: 500 })
    }

    return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() })
  } catch (err) {
    return NextResponse.json({ status: 'error', reason: String(err) }, { status: 500 })
  }
}
