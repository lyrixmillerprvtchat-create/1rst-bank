import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import BottomNav from '@/components/BottomNav'
import { CreditCard, Plus, Lock, Eye } from 'lucide-react'

export default async function CardsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
  const { data: account } = await supabase.from('accounts').select('*').eq('user_id', user.id).single()

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="px-5 pt-12 pb-6" style={{ background: 'linear-gradient(135deg, #003087 0%, #0066cc 100%)' }}>
        <h1 className="text-white text-xl font-bold mb-6">My Cards</h1>

        {/* Virtual Card */}
        <div className="rounded-3xl p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', minHeight: 190 }}>
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/5 -translate-y-1/4 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 translate-y-1/4 -translate-x-1/4" />
          <div className="relative">
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-gray-400 text-xs">Virtual Card</p>
                <p className="text-white font-semibold text-sm mt-0.5">1rst Bank</p>
              </div>
              <CreditCard size={28} className="text-blue-300" />
            </div>
            <p className="text-white text-lg font-mono tracking-widest mb-6">
              •••• •••• •••• {account?.account_number?.slice(-4) ?? '0000'}
            </p>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-gray-400 text-[10px] uppercase">Card Holder</p>
                <p className="text-white text-sm font-medium">{profile?.full_name ?? 'Card Holder'}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-[10px] uppercase">Expires</p>
                <p className="text-white text-sm font-medium">12/28</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 mt-6 space-y-3">
        {[
          { icon: Eye, label: 'View Card Details', desc: 'See full card number and CVV' },
          { icon: Lock, label: 'Freeze Card', desc: 'Temporarily block your card' },
          { icon: Plus, label: 'Request Physical Card', desc: 'Get a physical debit card' },
        ].map(({ icon: Icon, label, desc }) => (
          <button key={label} className="w-full bg-white rounded-2xl px-4 py-4 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Icon size={18} className="text-blue-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-gray-800">{label}</p>
              <p className="text-xs text-gray-400">{desc}</p>
            </div>
          </button>
        ))}
      </div>
      <BottomNav />
    </div>
  )
}
