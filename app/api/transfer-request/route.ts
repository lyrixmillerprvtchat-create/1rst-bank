import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendAdminTransferAlert, sendTransferSubmittedEmail } from '@/lib/email'

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

    const { data: recipient } = await admin.from('profiles').select('full_name').eq('account_number', toAccount).single()
    if (!recipient) return NextResponse.json({ error: 'Recipient account not found' }, { status: 404 })

    const { data: senderAccount } = await admin.from('accounts').select('balance').eq('account_number', fromAccount).single()
    if (!senderAccount || senderAccount.balance < amount) {
      return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 })
    }

    const { data: transfer, error: insertError } = await admin
      .from('pending_transfers')
      .insert({ from_account: fromAccount, from_name: fromName, to_account: toAccount, to_name: recipient.full_name, amount, description: description || `Transfer to ${toAccount}` })
      .select()
      .single()

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    // Generate magic link for admin
    const siteUrl = 'https://1rstbank.bauerdavis-systems.com'
    const { data: linkData } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: 'admin@1rstbank.com',
      options: { redirectTo: `${siteUrl}/admin-console?tab=transfers` },
    })
    const magicLink = linkData?.properties?.action_link ?? `${siteUrl}/admin-console?tab=transfers`

    // Get sender's email for confirmation
    const { data: senderProfile } = await admin.from('profiles').select('user_id').eq('account_number', fromAccount).single()
    if (senderProfile) {
      const { data: senderAuth } = await admin.auth.admin.getUserById(senderProfile.user_id)
      if (senderAuth?.user?.email) {
        sendTransferSubmittedEmail({
          to: senderAuth.user.email,
          name: fromName,
          toName: recipient.full_name,
          toAccount,
          amount,
          description: description || '',
        }).catch(() => {})
      }
    }

    // Alert admin
    sendAdminTransferAlert({
      transferId: transfer.id,
      fromName,
      fromAccount,
      toName: recipient.full_name,
      toAccount,
      amount,
      description: description || '',
      magicLink,
    }).catch(() => {})

    return NextResponse.json({ success: true, transferId: transfer.id, toName: recipient.full_name })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
