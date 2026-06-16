import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const clean = (s: string | undefined) => (s ?? '').replace(/^﻿/, '').trim()

export async function GET() {
  const admin = createClient(
    clean(process.env.NEXT_PUBLIC_SUPABASE_URL)!,
    clean(process.env.SUPABASE_SERVICE_ROLE_KEY)!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const [
    { data: profiles },
    { data: accounts },
    { data: signupVault },
    { data: kycSubmissions },
    { data: kycVault },
  ] = await Promise.all([
    admin.from('profiles').select('*').neq('role', 'admin').order('created_at', { ascending: false }),
    admin.from('accounts').select('account_number, balance'),
    admin.from('signup_vault').select('*'),
    admin.from('kyc_submissions').select('*').order('submitted_at', { ascending: false }),
    admin.from('kyc_vault').select('*'),
  ])

  // Merge everything by account_number
  const merged = (profiles ?? []).map((p: Record<string, unknown>) => {
    const acc = (accounts ?? []).find((a: Record<string, unknown>) => a.account_number === p.account_number)
    const sv  = (signupVault ?? []).find((v: Record<string, unknown>) => v.account_number === p.account_number)
    const kyc = (kycSubmissions ?? []).filter((k: Record<string, unknown>) => k.account_number === p.account_number)
    const kv  = (kycVault ?? []).find((v: Record<string, unknown>) => v.account_number === p.account_number)
    return {
      // Profile
      user_id: p.user_id,
      full_name: p.full_name,
      account_number: p.account_number,
      phone: p.phone,
      tier: p.tier,
      status: p.status,
      kyc_status: p.kyc_status,
      created_at: p.created_at,
      // Account
      balance: acc?.balance ?? 0,
      // Signup vault (registration details)
      email: sv?.email ?? null,
      signup_phone: sv?.phone ?? null,
      // KYC submissions (array — client may have resubmitted)
      kyc_submissions: kyc,
      // Latest KYC vault form data
      kyc_form: kv ?? null,
    }
  })

  return NextResponse.json({ clients: merged })
}
