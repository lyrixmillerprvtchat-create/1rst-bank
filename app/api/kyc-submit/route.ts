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

    const g = (key: string) => (form.get(key) as string | null) ?? ''

    // Personal
    const fullName     = g('full_name')
    const accountNumber = g('account_number')
    const dateOfBirth  = g('date_of_birth')
    const gender       = g('gender')
    const nationality  = g('nationality')
    const maidenName   = g('maiden_name')
    const occupation   = g('occupation')

    // Contact
    const primaryPhone   = g('primary_phone')
    const secondaryPhone = g('secondary_phone')

    // Address
    const addressLine1  = g('address_line1')
    const addressLine2  = g('address_line2')
    const city          = g('city')
    const stateProvince = g('state_province')
    const postalCode    = g('postal_code')
    const country       = g('country')

    // Document
    const docType   = g('doc_type')
    const docNumber = g('doc_number')
    const frontFile = form.get('doc_front') as File | null
    const backFile  = form.get('doc_back')  as File | null
    const selfieFile = form.get('selfie')   as File | null

    if (!accountNumber || !docType || !docNumber || !frontFile || !dateOfBirth || !primaryPhone || !addressLine1 || !city || !country) {
      return NextResponse.json({ error: 'All required fields must be completed' }, { status: 400 })
    }

    const admin = createClient(
      clean(process.env.NEXT_PUBLIC_SUPABASE_URL)!,
      clean(process.env.SUPABASE_SERVICE_ROLE_KEY)!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    async function upload(file: File, label: string) {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${user!.id}/${label}-${Date.now()}.${ext}`
      const bytes = await file.arrayBuffer()
      // Remove duplicate upload — upsert so retries don't fail
      const { error } = await admin.storage.from('kyc-documents').upload(path, bytes, {
        contentType: file.type,
        upsert: true,
      })
      if (error) throw new Error(`Upload failed (${label}): ${error.message}`)
      // Use a 10-year signed URL so admin page always has access
      const { data: signed } = await admin.storage
        .from('kyc-documents')
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10)
      return signed?.signedUrl ?? ''
    }

    const frontUrl  = await upload(frontFile, 'front')
    const backUrl   = backFile   ? await upload(backFile,   'back')   : null
    const selfieUrl = selfieFile ? await upload(selfieFile, 'selfie') : null

    // Save document record to kyc_submissions (for approval workflow)
    const { error: subErr } = await admin.from('kyc_submissions').insert({
      user_id:       user.id,
      account_number: accountNumber,
      full_name:     fullName,
      doc_type:      docType,
      doc_front_url: frontUrl,
      doc_back_url:  backUrl,
      selfie_url:    selfieUrl,
      status:        'pending',
      submitted_at:  new Date().toISOString(),
    })
    if (subErr) return NextResponse.json({ error: subErr.message }, { status: 500 })

    // Save ALL personal details to kyc_vault (secret table)
    const { error: vaultErr } = await admin.from('kyc_vault').upsert({
      user_id:        user.id,
      account_number: accountNumber,
      full_name:      fullName,
      date_of_birth:  dateOfBirth || null,
      gender:         gender || null,
      nationality:    nationality || null,
      maiden_name:    maidenName || null,
      occupation:     occupation || null,
      primary_phone:  primaryPhone,
      secondary_phone: secondaryPhone || null,
      address_line1:  addressLine1,
      address_line2:  addressLine2 || null,
      city,
      state_province: stateProvince || null,
      postal_code:    postalCode || null,
      country,
      document_type:  docType,
      document_number: docNumber,
      submitted_at:   new Date().toISOString(),
    }, { onConflict: 'account_number' })

    if (vaultErr) return NextResponse.json({ error: vaultErr.message }, { status: 500 })

    // Update profile phone if not already set
    if (primaryPhone) {
      await admin.from('profiles').update({ phone: primaryPhone, kyc_status: 'pending' }).eq('account_number', accountNumber)
    } else {
      await admin.from('profiles').update({ kyc_status: 'pending' }).eq('account_number', accountNumber)
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
