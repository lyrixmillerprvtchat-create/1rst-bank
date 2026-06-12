import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import StatementClient from './StatementClient'

export default async function StatementPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
  const { data: account } = await supabase.from('accounts').select('*').eq('user_id', user.id).single()
  const accountNumber = account?.account_number ?? ''
  const { data: transactions } = accountNumber
    ? await supabase
        .from('transactions')
        .select('*')
        .or(`sender_account.eq.${accountNumber},receiver_account.eq.${accountNumber}`)
        .order('created_at', { ascending: false })
        .limit(50)
    : { data: [] }
  return <StatementClient profile={profile} account={account} transactions={transactions || []} />
}
