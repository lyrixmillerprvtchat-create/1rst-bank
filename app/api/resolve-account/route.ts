import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { accountNumber } = body
    if (!accountNumber) return NextResponse.json({ error: 'Account number required' }, { status: 400 })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    // Strip BOM and whitespace that can sneak in from Windows env var storage
    const cleanKey = key.replace(/^﻿/, '').trim()
    const cleanUrl = url.replace(/^﻿/, '').trim()

    const profileRes = await fetch(
      `${cleanUrl}/rest/v1/profiles?account_number=eq.${encodeURIComponent(accountNumber)}&select=user_id`,
      { headers: { apikey: cleanKey, Authorization: `Bearer ${cleanKey}` } }
    )

    if (!profileRes.ok) {
      const text = await profileRes.text()
      return NextResponse.json({ error: 'Profile lookup failed', detail: text }, { status: 502 })
    }

    const profiles = await profileRes.json()
    if (!profiles?.length) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

    const userRes = await fetch(
      `${cleanUrl}/auth/v1/admin/users/${profiles[0].user_id}`,
      { headers: { apikey: cleanKey, Authorization: `Bearer ${cleanKey}` } }
    )

    if (!userRes.ok) {
      const text = await userRes.text()
      return NextResponse.json({ error: 'User lookup failed', detail: text }, { status: 502 })
    }

    const user = await userRes.json()
    if (!user?.email) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    return NextResponse.json({ email: user.email })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Internal error', detail: message }, { status: 500 })
  }
}
