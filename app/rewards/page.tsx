import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import BottomNav from '@/components/BottomNav'
import { Gift, Star, Zap, ChevronRight } from 'lucide-react'

export default async function RewardsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="px-5 pt-12 pb-8" style={{ background: 'linear-gradient(135deg, #003087 0%, #0066cc 100%)' }}>
        <h1 className="text-white text-xl font-bold mb-1">Rewards</h1>
        <p className="text-blue-200 text-sm">Earn points on every transaction</p>
        <div className="mt-5 bg-white/15 rounded-2xl p-4 flex items-center gap-4 border border-white/20">
          <div className="w-14 h-14 rounded-full bg-yellow-400/20 flex items-center justify-center">
            <Star size={28} className="text-yellow-300" />
          </div>
          <div>
            <p className="text-white text-2xl font-bold">0 pts</p>
            <p className="text-blue-200 text-xs">Your reward points</p>
          </div>
        </div>
      </div>

      <div className="px-5 mt-6 space-y-3">
        {[
          { icon: Gift, label: 'Redeem Points', desc: 'Exchange points for cash or gifts', color: 'bg-pink-50 text-pink-600' },
          { icon: Zap, label: 'Earn More', desc: 'Transact more to earn faster', color: 'bg-yellow-50 text-yellow-600' },
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
