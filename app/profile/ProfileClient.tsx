'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import { User, Phone, Mail, Hash, Shield, LogOut, ChevronRight, Copy, TrendingUp, Building2, FileText, BadgeCheck, X, MessageCircle } from 'lucide-react'
import type { Profile, Account } from '@/lib/types'

const TIER_COLORS: Record<string, string> = {
  'Tier 1': 'bg-gray-100 text-gray-600',
  'Tier 2': 'bg-blue-100 text-blue-700',
  'Tier 3': 'bg-yellow-100 text-yellow-700',
}
const TIER_LABELS: Record<string, string> = {
  'Tier 1': 'Basic',
  'Tier 2': 'Standard',
  'Tier 3': 'Premium',
}

export default function ProfileClient({ profile, account, email }: { profile: Profile | null, account: Account | null, email: string }) {
  const router = useRouter()
  const [showKycModal, setShowKycModal] = useState(false)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  function copyAccountNumber() {
    navigator.clipboard.writeText(account?.account_number ?? '')
  }

  const tier = profile?.tier ?? 'Tier 1'

  const details = [
    { icon: Hash, label: 'Account Number', value: account?.account_number ?? '—', copy: true },
    { icon: Shield, label: 'Account Tier', value: `${tier} — ${TIER_LABELS[tier] ?? tier}`, copy: false },
    { icon: Phone, label: 'Phone', value: profile?.phone ?? '—', copy: false },
    { icon: Mail, label: 'Email', value: email, copy: false },
  ]

  const kycStatus = profile?.kyc_status ?? 'pending'
  const kycDesc =
    kycStatus === 'approved' ? 'Identity verified ✓' :
    kycStatus === 'rejected' ? 'Rejected — tap to resubmit' :
    kycStatus === 'pending' ? 'Under review' :
    'Upload your ID documents'

  const nonKycActions = [
    { icon: TrendingUp, label: 'Upgrade Account', desc: 'Unlock higher limits & features', href: '/upgrade', color: 'bg-blue-50 text-blue-600' },
    { icon: Building2, label: 'Linked Banks', desc: 'Manage external bank accounts', href: '/linked-banks', color: 'bg-purple-50 text-purple-600' },
    { icon: FileText, label: 'Bank Statement', desc: 'View & print your statement', href: '/statement', color: 'bg-green-50 text-green-600' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* KYC Contact Modal */}
      {showKycModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => setShowKycModal(false)}>
          <div className="w-full max-w-sm bg-white rounded-t-3xl px-6 py-8 flex flex-col items-center text-center" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-4">
              <MessageCircle size={28} className="text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">KYC Verification</h3>
            <p className="text-sm text-gray-500 mb-1 leading-relaxed">
              To complete your KYC verification, contact us at
            </p>
            <a href="mailto:1rstbanksupport@gmail.com" className="text-base font-bold text-blue-700 underline break-all mb-6">
              1rstbanksupport@gmail.com
            </a>
            <button onClick={() => setShowKycModal(false)}
              className="w-full py-3 rounded-xl bg-gray-100 text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-12 pb-8" style={{ background: 'linear-gradient(135deg, #003087 0%, #0066cc 100%)' }}>
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center mb-3">
            <User size={36} className="text-white" />
          </div>
          <h2 className="text-white text-xl font-bold">{profile?.full_name ?? 'User'}</h2>
          <span className={`mt-2 text-xs font-semibold px-3 py-1 rounded-full ${TIER_COLORS[tier]}`}>
            {tier} · {TIER_LABELS[tier] ?? tier}
          </span>
        </div>
      </div>

      <div className="px-5 mt-6 space-y-3">
        {/* Account Details — compact single card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
          {details.map(({ icon: Icon, label, value, copy }) => (
            <div key={label} className="px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <Icon size={14} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{label}</p>
                <p className="text-sm text-gray-800 font-medium truncate">{value}</p>
              </div>
              {copy && (
                <button onClick={copyAccountNumber}><Copy size={14} className="text-gray-400" /></button>
              )}
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2 pl-1">Account Services</p>
        {/* KYC card — opens contact modal */}
        <button onClick={() => setShowKycModal(true)} className="w-full bg-white rounded-2xl px-4 py-4 flex items-center gap-3 shadow-sm text-left">
          <div className={`w-10 h-10 rounded-2xl ${kycStatus === 'approved' ? 'bg-emerald-50 text-emerald-600' : kycStatus === 'rejected' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600'} flex items-center justify-center`}>
            <BadgeCheck size={18} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">KYC Verification</p>
            <p className="text-xs text-gray-400">{kycDesc}</p>
          </div>
          <ChevronRight size={16} className="text-gray-300" />
        </button>
        {nonKycActions.map(({ icon: Icon, label, desc, href, color }) => (
          <Link key={href} href={href} className="bg-white rounded-2xl px-4 py-4 flex items-center gap-3 shadow-sm block">
            <div className={`w-10 h-10 rounded-2xl ${color} flex items-center justify-center`}>
              <Icon size={18} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">{label}</p>
              <p className="text-xs text-gray-400">{desc}</p>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
          </Link>
        ))}

        {/* Sign Out */}
        <button onClick={handleSignOut}
          className="w-full bg-red-50 rounded-2xl px-4 py-3.5 flex items-center gap-3 mt-2">
          <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
            <LogOut size={16} className="text-red-500" />
          </div>
          <span className="text-sm font-medium text-red-500 flex-1 text-left">Sign Out</span>
          <ChevronRight size={16} className="text-red-300" />
        </button>
      </div>
      <BottomNav />
    </div>
  )
}
