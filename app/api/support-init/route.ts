import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const clean = (s: string | undefined) => (s ?? '').replace(/^﻿/, '').trim()

const GREETING = 'Hello! Welcome to 1rst Bank Support. A support agent will be with you shortly. How can we assist you today?'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

    const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL)
    const serviceKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY)
    if (!url || !serviceKey) return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })

    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

    const { data: existing } = await admin
      .from('support_chats')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'open')
      .single()

    if (existing) return NextResponse.json({ chatId: existing.id, isNew: false })

    const { data: newChat, error } = await admin
      .from('support_chats')
      .insert({ user_id: userId })
      .select('id')
      .single()

    if (error || !newChat) return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 })

    await admin.from('support_messages').insert({
      chat_id: newChat.id,
      sender: 'admin',
      message: GREETING,
    })

    return NextResponse.json({ chatId: newChat.id, isNew: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
