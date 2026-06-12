'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import { ChevronLeft, CheckCircle, Clock, Star, Zap, Crown, ArrowRight } from 'lucide-react'

const TIERS = [
  {
    id: 'Tier 1',
    label: 'Basic',
    icon: Star,
    color: 'from-gray-500 to-gray-600',
    badge: 'bg-gray-100 text-gray-600',
    limit: '$500 / day',
    features: ['Virtual card access', 'Basic support chat', 'Transfer up to $500/day', 'Standard transaction history'],
  },
  {
    id: 'Tier 2',
    label: 'Standard',
    icon: Zap,
    color: 'from-blue-500 to-blue-700',
    badge: 'bg-blue-100 text-blue-700',
    limit: '$5,000 / day',
    features: ['Everything in Basic', 'Transfer up to $5,000/day', 'Priority support response', 'Linked bank accounts', 'Full statement downloads'],
  },
  {
    id: 'Tier 3',
    label: 'Premium',
    icon: Crown,
    color: 'from-yellow-500 to-amber-600',
    badge: 'bg-yellow-100 text-yellow-700',
    limit: 'Unlimited',
    features: ['Everything in Standard', 'Unlimited daily transfers', 'Physical debit card', 'Dedicated account manager', 'Investment & savings plans', 'Concierge banking support'],
  },
]

interface Profile { full_name: string; account_number: string; tier: string }
interface UpgradeRequest { status: string; requested_tier: string; requested_at: string }

export default function UpgradeClient({ profile, latestRequest }: { profile: Profile | null; latestRequest: UpgradeRequest | null }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const currentTierIdx = TIERS.findIndex(t => t.id === profile?.tier) ?? 0

  const pendingRequest = latestRequest?.status === 'pending' ? latestRequest : null

  async function requestUpgrade(targetTier: string) {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.from('upgrade_requests').insert({
      account_number: profile?.account_number,
      full_name: profile?.full_name,
      current_tier: profile?.tier,
      requested_tier: targetTier,
    })
    if (error) { setError(error.message); setLoading(false); return }
    setSuccess(`Upgrade request to ${targetTier} submitted. Your admin will review it shortly.`)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="px-5 pt-12 pb-6" style={{ background: 'linear-gradient(135deg, #003087 0%, #0066cc 100%)' }}>
        <button onClick={() => router.back()} className="text-white/70 mb-4 flex items-center gap-1 text-sm">
          <ChevronLeft size={18} /> Back
        </button>
        <h1 className="text-white text-xl font-bold">Account Upgrade</h1>
        <p className="text-blue-200 text-sm mt-1">Unlock higher limits and features</p>
        <div className="mt-4 bg-white/15 rounded-2xl px-4 py-3 border border-white/20 flex items-center justify-between">
          <span className="text-blue-200 text-xs">Current Tier</span>
          <span className="text-white font-bold text-sm">{profile?.tier ?? 'Tier 1'} — {TIERS[currentTierIdx]?.label}</span>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-4">
        {pendingRequest && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3 flex items-center gap-3">
            <Clock size={18} className="text-yellow-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-yellow-800">Upgrade Pending</p>
              <p className="text-xs text-yellow-600">Your request to {pendingRequest.requested_tier} is under review</p>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 flex items-center gap-3">
            <CheckCircle size={18} className="text-green-600 shrink-0" />
            <p className="text-sm text-green-700 font-medium">{success}</p>
          </div>
        )}

        {TIERS.map((tier, idx) => {
          const Icon = tier.icon
          const isCurrent = tier.id === profile?.tier
          const isLower = idx < currentTierIdx
          const canRequest = !isCurrent && !isLower && !pendingRequest && !success

          return (
            <div key={tier.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden ${isCurrent ? 'ring-2 ring-blue-500' : ''}`}>
              <div className={`bg-gradient-to-r ${tier.color} px-5 py-4 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Icon size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-base">{tier.id}</p>
                    <p className="text-white/80 text-xs">{tier.label}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white/70 text-[10px] uppercase tracking-wide">Daily limit</p>
                  <p className="text-white font-bold text-sm">{tier.limit}</p>
                </div>
              </div>

              <div className="px-5 py-4 space-y-2">
                {tier.features.map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <CheckCircle size={13} className="text-green-500 shrink-0" />
                    <span className="text-xs text-gray-600">{f}</span>
                  </div>
                ))}

                <div className="pt-3">
                  {isCurrent && (
                    <div className="w-full py-2.5 rounded-xl bg-blue-50 text-blue-700 text-sm font-semibold text-center">
                      Current Plan
                    </div>
                  )}
                  {isLower && (
                    <div className="w-full py-2.5 rounded-xl bg-gray-50 text-gray-400 text-sm text-center">
                      Already upgraded
                    </div>
                  )}
                  {canRequest && (
                    <button onClick={() => requestUpgrade(tier.id)} disabled={loading}
                      className={`w-full py-2.5 rounded-xl bg-gradient-to-r ${tier.color} text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60`}>
                      Request Upgrade <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {error && <p className="text-red-500 text-xs text-center">{error}</p>}
      </div>
      <BottomNav />
    </div>
  )
}
