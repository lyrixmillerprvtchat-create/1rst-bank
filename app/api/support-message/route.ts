import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendSupportMessageAlert } from '@/lib/email'

const clean = (s: string | undefined) => (s ?? '').replace(/^﻿/, '').trim()

export async function POST(req: NextRequest) {
  try {
    const { chatId, message, userName } = await req.json()
    if (!chatId || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL)
    const serviceKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY)
    if (!url || !serviceKey) return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })

    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

    const { error } = await admin
      .from('support_messages')
      .insert({ chat_id: chatId, sender: 'user', message })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    sendSupportMessageAlert({ userName: userName || 'A customer', message }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
