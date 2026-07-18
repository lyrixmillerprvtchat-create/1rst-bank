import { NextRequest, NextResponse } from 'next/server'

const clean = (s: string | undefined) => (s ?? '').replace(/^﻿/, '').trim()

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const key = clean(process.env.RESEND_API_KEY)
  if (!key) return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 })

  const res = await fetch(`https://api.resend.com/emails/${id}`, {
    headers: { Authorization: `Bearer ${key}` },
  })
  const body = await res.text()
  return new NextResponse(body, { status: res.status, headers: { 'Content-Type': 'application/json' } })
}
