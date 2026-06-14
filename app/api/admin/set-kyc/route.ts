import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const clean = (s: string | undefined) => (s ?? '').replace(/^﻿/, '').trim()

export async function POST(req: Request) {
  const { account_number, kyc_status } = await req.json()

  const allowed = ['pending', 'approved', 'rejected']
  if (!account_number || !allowed.includes(kyc_status)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const admin = createClient(
    clean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    clean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error } = await admin
    .from('profiles')
    .update({ kyc_status })
    .eq('account_number', account_number)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
