import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/require-admin'

const clean = (s: string | undefined) => (s ?? '').replace(/^﻿/, '').trim()

export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied

  const admin = createClient(
    clean(process.env.NEXT_PUBLIC_SUPABASE_URL)!,
    clean(process.env.SUPABASE_SERVICE_ROLE_KEY)!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const [{ data: vault }, { data: kyc }, { data: kycVault }] = await Promise.all([
    admin.from('signup_vault').select('*').order('created_at', { ascending: false }),
    admin.from('kyc_submissions').select('*').order('submitted_at', { ascending: false }),
    admin.from('kyc_vault').select('*').order('submitted_at', { ascending: false }),
  ])

  return NextResponse.json({ vault: vault ?? [], kyc: kyc ?? [], kycVault: kycVault ?? [] })
}
