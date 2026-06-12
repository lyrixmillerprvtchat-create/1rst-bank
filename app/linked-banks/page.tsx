import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import LinkedBanksClient from './LinkedBanksClient'

export default async function LinkedBanksPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: linkedBanks } = await supabase
    .from('linked_banks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  return <LinkedBanksClient linkedBanks={linkedBanks || []} />
}
