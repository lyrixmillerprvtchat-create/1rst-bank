import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTransferApprovedEmail, sendIncomingTransferEmail } from '@/lib/email'

const clean = (s: string | undefined) => (s ?? '').replace(/^﻿/, '').trim()

export async function POST(req: NextRequest) {
  try {
    const { fromAccount, fromName, toAccount, amount, description } = await req.json()
    if (!fromAccount || !toAccount || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL)
    const serviceKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY)
    if (!url || !serviceKey) return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })

    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

    const { data: recipient } = await admin.from('profiles').select('full_name, user_id').eq('account_number', toAccount).single()
    if (!recipient) return NextResponse.json({ error: 'Recipient account not found' }, { status: 404 })

    const { data: senderAccount } = await admin.from('accounts').select('balance').eq('account_number', fromAccount).single()
    if (!senderAccount || senderAccount.balance < amount) {
      return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 })
    }

    const { error: transferError } = await admin.rpc('transfer_funds', {
      p_from_account: fromAccount,
      p_to_account: toAccount,
      p_amount: amount,
      p_description: description || `Transfer to ${toAccount}`,
    })
    if (transferError) return NextResponse.json({ error: transferError.message }, { status: 500 })

    // Email sender confirmation
    const { data: senderProfile } = await admin.from('profiles').select('user_id').eq('account_number', fromAccount).single()
    if (senderProfile) {
      const { data: senderAuth } = await admin.auth.admin.getUserById(senderProfile.user_id)
      if (senderAuth?.user?.email) {
        sendTransferApprovedEmail({
          to: senderAuth.user.email,
          name: fromName,
          toName: recipient.full_name,
          toAccount,
          amount,
          description: description || '',
        }).catch(() => {})
      }
    }

    // Email recipient
    const { data: recipientAuth } = await admin.auth.admin.getUserById(recipient.user_id)
    if (recipientAuth?.user?.email) {
      sendIncomingTransferEmail({
        to: recipientAuth.user.email,
        name: recipient.full_name,
        fromName,
        fromAccount,
        amount,
        description: description || '',
      }).catch(() => {})
    }

    return NextResponse.json({ success: true, toName: recipient.full_name })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
