import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const clean = (s: string | undefined) => (s ?? '').replace(/^﻿/, '').trim()

export async function POST(req: NextRequest) {
  try {
    const caller = await createServerSupabaseClient()
    const { data: { user } } = await caller.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const form = await req.formData()
    const docType = form.get('doc_type') as string
    const frontFile = form.get('doc_front') as File | null
    const backFile = form.get('doc_back') as File | null
    const selfieFile = form.get('selfie') as File | null
    const accountNumber = form.get('account_number') as string
    const fullName = form.get('full_name') as string

    if (!docType || !frontFile || !accountNumber) {
      return NextResponse.json({ error: 'doc_type, doc_front and account_number required' }, { status: 400 })
    }

    const admin = createClient(
      clean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      clean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    async function upload(file: File, label: string) {
      const ext = file.name.split('.').pop() ?? 'bin'
      const path = `${user!.id}/${label}-${Date.now()}.${ext}`
      const bytes = await file.arrayBuffer()
      const { error } = await admin.storage.from('kyc-documents').upload(path, bytes, { contentType: file.type })
      if (error) throw new Error(error.message)
      const { data: signed } = await admin.storage.from('kyc-documents').createSignedUrl(path, 60 * 60 * 24 * 365)
      return signed?.signedUrl ?? ''
    }

    const frontUrl = await upload(frontFile, 'front')
    const backUrl = backFile ? await upload(backFile, 'back') : null
    const selfieUrl = selfieFile ? await upload(selfieFile, 'selfie') : null

    const { error } = await admin.from('kyc_submissions').insert({
      user_id: user.id,
      account_number: accountNumber,
      full_name: fullName,
      doc_type: docType,
      doc_front_url: frontUrl,
      doc_back_url: backUrl,
      selfie_url: selfieUrl,
      status: 'pending',
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Set kyc_status to 'pending' (in case it was 'rejected' before)
    await admin.from('profiles').update({ kyc_status: 'pending' }).eq('account_number', accountNumber)

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
