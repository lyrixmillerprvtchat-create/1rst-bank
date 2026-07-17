import { NextRequest, NextResponse } from 'next/server'
import { sendSupportMessageAlert } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { chatId, message, userName } = await req.json()
    if (!chatId || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    sendSupportMessageAlert({ userName: userName || 'A customer', message, chatId }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
