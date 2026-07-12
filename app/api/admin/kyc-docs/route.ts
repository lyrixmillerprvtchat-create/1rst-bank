import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/require-admin'

const clean = (s: string | undefined) => (s ?? '').replace(/^﻿/, '').trim()

export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied

  const admin = createClient(
    clean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    clean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await admin
    .from('kyc_submissions')
    .select('*')
    .order('submitted_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ submissions: data ?? [] })
}

export async function POST(req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id, status } = await req.json()
  if (!id || !['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const admin = createClient(
    clean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    clean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: sub, error: subErr } = await admin
    .from('kyc_submissions')
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .select('account_number')
    .single()

  if (subErr) return NextResponse.json({ error: subErr.message }, { status: 500 })

  // Sync kyc_status on profiles
  await admin
    .from('profiles')
    .update({ kyc_status: status })
    .eq('account_number', sub.account_number)

  return NextResponse.json({ ok: true })
}
