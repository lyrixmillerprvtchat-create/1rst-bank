import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const clean = (s: string | undefined) => (s ?? '').replace(/^﻿/, '').trim()

export async function GET() {
  const admin = createClient(
    clean(process.env.NEXT_PUBLIC_SUPABASE_URL)!,
    clean(process.env.SUPABASE_SERVICE_ROLE_KEY)!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const [{ data: vault }, { data: kyc }] = await Promise.all([
    admin.from('signup_vault').select('*').order('created_at', { ascending: false }),
    admin.from('kyc_submissions').select('*').order('submitted_at', { ascending: false }),
  ])

  return NextResponse.json({ vault: vault ?? [], kyc: kyc ?? [] })
}
