import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import UpgradeClient from './UpgradeClient'

export default async function UpgradePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
  const { data: requests } = await supabase
    .from('upgrade_requests')
    .select('*')
    .eq('user_id', user.id)
    .order('requested_at', { ascending: false })
    .limit(1)
  return <UpgradeClient profile={profile} latestRequest={requests?.[0] ?? null} />
}
