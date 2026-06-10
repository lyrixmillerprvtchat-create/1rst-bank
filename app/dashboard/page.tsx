import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: account }, { data: transactions }] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('accounts').select('*').eq('user_id', user.id).single(),
    supabase.from('transactions')
      .select('*')
      .or(`sender_account.eq.${(await supabase.from('accounts').select('account_number').eq('user_id', user.id).single()).data?.account_number},receiver_account.eq.${(await supabase.from('accounts').select('account_number').eq('user_id', user.id).single()).data?.account_number}`)
      .order('created_at', { ascending: false })
      .limit(10)
  ])

  return <DashboardClient profile={profile} account={account} transactions={transactions || []} />
}
