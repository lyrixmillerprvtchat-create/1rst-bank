import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendCreditNotificationEmail, sendDebitNotificationEmail } from '@/lib/email'
import { requireAdmin } from '@/lib/require-admin'

const clean = (s: string | undefined) => (s ?? '').replace(/^﻿/, '').trim()

export async function POST(req: NextRequest) {
  try {
    const denied = await requireAdmin()
    if (denied) return denied

    const { account_number, amount, type, description } = await req.json()
    if (!account_number || !amount || !['credit', 'debit'].includes(type)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const admin = createClient(
      clean(process.env.NEXT_PUBLIC_SUPABASE_URL)!,
      clean(process.env.SUPABASE_SERVICE_ROLE_KEY)!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const rpcName = type === 'credit' ? 'admin_credit_account' : 'admin_debit_account'
    const { error: rpcError } = await admin.rpc(rpcName, {
      p_account_number: account_number,
      p_amount: amount,
    })
    if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 500 })

    // Look up client's email and send notification (fire-and-forget)
    const { data: clientProfile } = await admin
      .from('profiles')
      .select('user_id, full_name')
      .eq('account_number', account_number)
      .single()

    if (clientProfile) {
      const { data: authUser } = await admin.auth.admin.getUserById(clientProfile.user_id)
      if (authUser?.user?.email) {
        const emailArgs = {
          to: authUser.user.email,
          name: clientProfile.full_name,
          amount,
          description: description || undefined,
        }
        if (type === 'credit') {
          sendCreditNotificationEmail(emailArgs).catch(() => {})
        } else {
          sendDebitNotificationEmail(emailArgs).catch(() => {})
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
