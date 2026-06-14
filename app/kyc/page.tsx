import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import KycClient from './KycClient'

export default async function KycPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, account_number, kyc_status')
    .eq('user_id', user.id)
    .single()

  return <KycClient profile={profile} />
}
