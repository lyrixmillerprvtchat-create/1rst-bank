import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const clean = (s: string | undefined) => (s ?? '').replace(/^﻿/, '').trim()

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    const chatId = form.get('chatId') as string | null

    if (!file || !chatId) return NextResponse.json({ error: 'Missing file or chatId' }, { status: 400 })

    const admin = createClient(
      clean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      clean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const ext = file.name.split('.').pop() ?? 'bin'
    const path = `${chatId}/${Date.now()}.${ext}`
    const bytes = await file.arrayBuffer()

    const { error: uploadErr } = await admin.storage
      .from('support-attachments')
      .upload(path, bytes, { contentType: file.type, upsert: false })

    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

    const { data: { publicUrl } } = admin.storage
      .from('support-attachments')
      .getPublicUrl(path)

    const type = file.type.startsWith('image/') ? 'image' : 'document'
    return NextResponse.json({ url: publicUrl, type })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
