import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/require-admin'

const clean = (s: string | undefined) => (s ?? '').replace(/^﻿/, '').trim()

export async function POST(req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { account_number } = await req.json()
  if (!account_number) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const admin = createClient(
    clean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    clean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: profile } = await admin.from('profiles').select('user_id, full_name').eq('account_number', account_number).single()
  if (!profile) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(profile.user_id)
  if (authErr || !authUser?.user?.email) return NextResponse.json({ error: 'No email on file for this client' }, { status: 404 })

  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: authUser.user.email,
  })
  if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 })

  return NextResponse.json({
    email: authUser.user.email,
    full_name: profile.full_name,
    resetLink: link.properties.action_link,
  })
}
