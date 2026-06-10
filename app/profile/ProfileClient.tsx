'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import { User, Phone, Mail, Hash, Shield, LogOut, ChevronRight, Copy } from 'lucide-react'
import type { Profile, Account } from '@/lib/types'

export default function ProfileClient({ profile, account, email }: { profile: Profile | null, account: Account | null, email: string }) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  function copyAccountNumber() {
    navigator.clipboard.writeText(account?.account_number ?? '')
  }

  const items = [
    { icon: Hash, label: 'Account Number', value: account?.account_number ?? '—' },
    { icon: Shield, label: 'Account Tier', value: profile?.tier ?? 'Tier 1' },
    { icon: Phone, label: 'Phone', value: profile?.phone ?? '—' },
    { icon: Mail, label: 'Email', value: email },
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-8" style={{ background: 'linear-gradient(135deg, #003087 0%, #0066cc 100%)' }}>
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center mb-3">
            <User size={36} className="text-white" />
          </div>
          <h2 className="text-white text-xl font-bold">{profile?.full_name ?? 'User'}</h2>
          <p className="text-blue-200 text-sm mt-1">{profile?.tier ?? 'Tier 1'} Member</p>
        </div>
      </div>

      <div className="px-5 mt-6 space-y-3">
        {items.map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-sm">
            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center">
              <Icon size={16} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-400 font-medium">{label}</p>
              <p className="text-sm text-gray-800 font-medium">{value}</p>
            </div>
            {label === 'Account Number' && (
              <button onClick={copyAccountNumber}><Copy size={15} className="text-gray-400" /></button>
            )}
          </div>
        ))}

        <button onClick={handleSignOut}
          className="w-full bg-red-50 rounded-2xl px-4 py-3.5 flex items-center gap-3 mt-4">
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
