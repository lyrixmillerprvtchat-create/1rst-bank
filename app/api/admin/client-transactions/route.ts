import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/require-admin'

const clean = (s: string | undefined) => (s ?? '').replace(/^﻿/, '').trim()

export async function GET(req: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  const account_number = req.nextUrl.searchParams.get('account_number')
  if (!account_number) return NextResponse.json({ error: 'Missing account_number' }, { status: 400 })

  const admin = createClient(
    clean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    clean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await admin
    .from('transactions')
    .select('*')
    .or(`sender_account.eq.${account_number},receiver_account.eq.${account_number}`)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ transactions: data ?? [] })
}
