import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import BottomNav from '@/components/BottomNav'
import { TrendingUp, PiggyBank, BarChart3, ChevronRight } from 'lucide-react'

export default async function FinancePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: account } = await supabase.from('accounts').select('balance').eq('user_id', user.id).single()

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="px-5 pt-12 pb-8" style={{ background: 'linear-gradient(135deg, #003087 0%, #0066cc 100%)' }}>
        <h1 className="text-white text-xl font-bold mb-1">Finance</h1>
        <p className="text-blue-200 text-sm">Manage and grow your money</p>
        <div className="mt-5 bg-white/15 rounded-2xl p-4 border border-white/20">
          <p className="text-blue-200 text-xs mb-1">Net Worth</p>
          <p className="text-white text-2xl font-bold">₦{(account?.balance ?? 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp size={12} className="text-green-300" />
            <p className="text-green-300 text-xs">All from 1rst Bank</p>
          </div>
        </div>
      </div>

      <div className="px-5 mt-6 space-y-3">
        {[
          { icon: PiggyBank, label: 'Savings', desc: 'Earn up to 12% p.a on savings', color: 'bg-green-50 text-green-600' },
          { icon: BarChart3, label: 'Investments', desc: 'Grow your wealth with smart plans', color: 'bg-blue-50 text-blue-600' },
          { icon: TrendingUp, label: 'Analytics', desc: 'Track your spending patterns', color: 'bg-purple-50 text-purple-600' },
        ].map(({ icon: Icon, label, desc, color }) => (
          <div key={label} className="bg-white rounded-2xl px-4 py-4 flex items-center gap-3 shadow-sm">
            <div className={`w-10 h-10 rounded-2xl ${color} flex items-center justify-center`}>
              <Icon size={18} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">{label}</p>
              <p className="text-xs text-gray-400">{desc}</p>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  )
}
