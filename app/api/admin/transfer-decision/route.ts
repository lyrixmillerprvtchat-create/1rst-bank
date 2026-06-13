import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendTransferApprovedEmail, sendTransferDeclinedEmail, sendIncomingTransferEmail } from '@/lib/email'

const clean = (s: string | undefined) => (s ?? '').replace(/^﻿/, '').trim()

export async function POST(req: NextRequest) {
  try {
    const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL)
    const anonKey = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

    // Verify caller: try cookie-based session first, fall back to Bearer token
    let user: { id: string } | null = null
    try {
      const caller = await createServerSupabaseClient()
      const { data } = await caller.auth.getUser()
      user = data?.user ?? null
    } catch {}

    if (!user) {
      const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
      if (bearer) {
        const tokenClient = createClient(url!, anonKey!, { auth: { autoRefreshToken: false, persistSession: false } })
        const { data } = await tokenClient.auth.getUser(bearer)
        user = data?.user ?? null
      }
    }

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check admin role using service key (avoids RLS issues)
    const serviceKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY)
    const adminCheck = createClient(url!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data: profile } = await adminCheck.from('profiles').select('role').eq('user_id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { transferId, action } = await req.json()
    if (!transferId || !['approve', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const admin = adminCheck

    // Fetch transfer details
    const { data: transfer } = await admin.from('pending_transfers').select('*').eq('id', transferId).single()
    if (!transfer) return NextResponse.json({ error: 'Transfer not found' }, { status: 404 })
    if (transfer.status !== 'pending') return NextResponse.json({ error: 'Transfer already processed' }, { status: 400 })

    if (action === 'approve') {
      const { error } = await admin.rpc('admin_execute_transfer', {
        p_transfer_id: transferId,
        p_from_account: transfer.from_account,
        p_to_account: transfer.to_account,
        p_amount: transfer.amount,
        p_description: transfer.description,
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      await admin
        .from('pending_transfers')
        .update({ status: 'declined', reviewed_at: new Date().toISOString() })
        .eq('id', transferId)
    }

    // Email sender
    const { data: senderProfile } = await admin.from('profiles').select('user_id').eq('account_number', transfer.from_account).single()
    if (senderProfile) {
      const { data: senderAuth } = await admin.auth.admin.getUserById(senderProfile.user_id)
      if (senderAuth?.user?.email) {
        const emailArgs = {
          to: senderAuth.user.email,
          name: transfer.from_name,
          toName: transfer.to_name,
          toAccount: transfer.to_account,
          amount: transfer.amount,
          description: transfer.description,
        }
        if (action === 'approve') {
          sendTransferApprovedEmail(emailArgs).catch(() => {})
        } else {
          sendTransferDeclinedEmail(emailArgs).catch(() => {})
        }
      }
    }

    // Email recipient when approved
    if (action === 'approve') {
      const { data: recipientProfile } = await admin.from('profiles').select('user_id').eq('account_number', transfer.to_account).single()
      if (recipientProfile) {
        const { data: recipientAuth } = await admin.auth.admin.getUserById(recipientProfile.user_id)
        if (recipientAuth?.user?.email) {
          sendIncomingTransferEmail({
            to: recipientAuth.user.email,
            name: transfer.to_name,
            fromName: transfer.from_name,
            fromAccount: transfer.from_account,
            amount: transfer.amount,
            description: transfer.description,
          }).catch(() => {})
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
