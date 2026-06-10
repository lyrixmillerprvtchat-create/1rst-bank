'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import TransferModal from '@/components/TransferModal'
import { Bell, ChevronRight, Plus, ArrowUpRight, ArrowDownLeft, Zap, Tv, Gamepad2, Phone, Wifi } from 'lucide-react'
import type { Profile, Account, Transaction } from '@/lib/types'

const services = [
  { icon: Zap, label: 'Bills', color: 'bg-yellow-100 text-yellow-600' },
  { icon: Phone, label: 'Airtime', color: 'bg-green-100 text-green-600' },
  { icon: Wifi, label: 'Data', color: 'bg-blue-100 text-blue-600' },
  { icon: Gamepad2, label: 'Betting', color: 'bg-purple-100 text-purple-600' },
  { icon: Tv, label: 'TV', color: 'bg-red-100 text-red-600' },
]

export default function DashboardClient({ profile, account, transactions }: {
  profile: Profile | null, account: Account | null, transactions: Transaction[]
}) {
  const router = useRouter()
  const [showBalance, setShowBalance] = useState(true)
  const [showTransfer, setShowTransfer] = useState(false)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const balance = account?.balance ?? 0

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-6" style={{ background: 'linear-gradient(135deg, #003087 0%, #0066cc 100%)' }}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-blue-200 text-xs font-medium uppercase tracking-wider">Good day,</p>
            <h2 className="text-white text-lg font-semibold">{profile?.full_name?.split(' ')[0] ?? 'User'}</h2>
          </div>
          <button className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <Bell size={18} className="text-white" />
          </button>
        </div>

        {/* Balance Card */}
        <div className="bg-white/15 backdrop-blur rounded-2xl p-5 border border-white/20">
          <p className="text-blue-200 text-xs font-medium mb-1">Total Balance</p>
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-white text-3xl font-bold">
              {showBalance ? `₦${balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}` : '••••••'}
            </h3>
            <button onClick={() => setShowBalance(!showBalance)} className="text-blue-200 text-xs border border-blue-300/40 px-2 py-0.5 rounded-full">
              {showBalance ? 'Hide' : 'Show'}
            </button>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowTransfer(true)}
              className="flex-1 py-2.5 rounded-xl bg-white text-blue-700 text-sm font-semibold flex items-center justify-center gap-1.5">
              <ArrowUpRight size={15} /> Transfer
            </button>
            <button className="flex-1 py-2.5 rounded-xl bg-white/20 text-white text-sm font-semibold flex items-center justify-center gap-1.5 border border-white/30">
              <Plus size={15} /> Add Money
            </button>
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="px-5 mt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-800 text-sm">All Services</h3>
          <button className="text-blue-600 text-xs flex items-center gap-0.5">See all <ChevronRight size={12} /></button>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {services.map(({ icon: Icon, label, color }) => (
            <button key={label} className="flex flex-col items-center gap-2">
              <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center`}>
                <Icon size={20} />
              </div>
              <span className="text-[10px] text-gray-600 font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Transactions */}
      <div className="px-5 mt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-800 text-sm">Recent Transactions</h3>
          <button className="text-blue-600 text-xs flex items-center gap-0.5">See all <ChevronRight size={12} /></button>
        </div>
        <div className="space-y-3">
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No transactions yet</div>
          ) : transactions.map(tx => {
            const isCredit = tx.type === 'credit' || tx.receiver_account === account?.account_number
            return (
              <div key={tx.id} className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isCredit ? 'bg-green-100' : 'bg-red-100'}`}>
                  {isCredit ? <ArrowDownLeft size={18} className="text-green-600" /> : <ArrowUpRight size={18} className="text-red-500" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{tx.description || (isCredit ? 'Credit' : 'Debit')}</p>
                  <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <p className={`text-sm font-bold ${isCredit ? 'text-green-600' : 'text-red-500'}`}>
                  {isCredit ? '+' : '-'}₦{tx.amount.toLocaleString()}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {showTransfer && <TransferModal account={account} onClose={() => setShowTransfer(false)} />}
      <BottomNav />
    </div>
  )
}
