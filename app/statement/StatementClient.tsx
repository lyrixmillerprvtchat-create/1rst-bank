'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { ChevronLeft, ArrowDownLeft, ArrowUpRight, Printer } from 'lucide-react'

interface Profile { full_name: string; account_number: string; tier: string }
interface Account { account_number: string; balance: number }
interface Transaction { id: string; sender_account: string; receiver_account: string; amount: number; type: string; description: string; created_at: string }

const RANGES = [
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 60 days', days: 60 },
  { label: 'All transactions', days: 0 },
]

export default function StatementClient({ profile, account, transactions }: {
  profile: Profile | null; account: Account | null; transactions: Transaction[]
}) {
  const router = useRouter()
  const [range, setRange] = useState(30)

  const filtered = range === 0 ? transactions : transactions.filter(tx => {
    const age = (Date.now() - new Date(tx.created_at).getTime()) / (1000 * 60 * 60 * 24)
    return age <= range
  })

  const totalIn = filtered.filter(tx => tx.receiver_account === account?.account_number).reduce((s, tx) => s + tx.amount, 0)
  const totalOut = filtered.filter(tx => tx.sender_account === account?.account_number).reduce((s, tx) => s + tx.amount, 0)

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="px-5 pt-12 pb-6 print:pt-6" style={{ background: 'linear-gradient(135deg, #003087 0%, #0066cc 100%)' }}>
        <div className="flex items-center justify-between mb-4 print:hidden">
          <button onClick={() => router.back()} className="text-white/70 flex items-center gap-1 text-sm">
            <ChevronLeft size={18} /> Back
          </button>
          <button onClick={() => window.print()} className="text-white flex items-center gap-1.5 text-sm bg-white/20 px-3 py-1.5 rounded-xl">
            <Printer size={14} /> Print
          </button>
        </div>
        <h1 className="text-white text-xl font-bold">Bank Statement</h1>
        <p className="text-blue-200 text-xs mt-0.5">1rst Bank · Official Account Statement</p>
        <div className="mt-4 bg-white/15 rounded-2xl px-4 py-3 border border-white/20 space-y-1">
          <div className="flex justify-between"><span className="text-blue-200 text-xs">Account Name</span><span className="text-white text-xs font-semibold">{profile?.full_name}</span></div>
          <div className="flex justify-between"><span className="text-blue-200 text-xs">Account Number</span><span className="text-white text-xs font-mono">{account?.account_number}</span></div>
          <div className="flex justify-between"><span className="text-blue-200 text-xs">Tier</span><span className="text-white text-xs">{profile?.tier}</span></div>
          <div className="flex justify-between"><span className="text-blue-200 text-xs">Current Balance</span><span className="text-white text-xs font-bold">${(account?.balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
        </div>
      </div>

      <div className="px-5 mt-4 print:hidden">
        <div className="flex gap-2">
          {RANGES.map(r => (
            <button key={r.days} onClick={() => setRange(r.days)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${range === r.days ? 'bg-blue-700 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 mt-4 grid grid-cols-2 gap-3">
        <div className="bg-green-50 rounded-2xl p-4">
          <p className="text-xs text-green-600 font-medium">Total In</p>
          <p className="text-base font-bold text-green-700 mt-0.5">+${totalIn.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-4">
          <p className="text-xs text-red-500 font-medium">Total Out</p>
          <p className="text-base font-bold text-red-600 mt-0.5">-${totalOut.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="px-5 mt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{filtered.length} Transactions</p>
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-10 text-gray-400 text-sm">No transactions in this period</div>
          )}
          {filtered.map(tx => {
            const isCredit = tx.receiver_account === account?.account_number
            return (
              <div key={tx.id} className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isCredit ? 'bg-green-100' : 'bg-red-100'}`}>
                  {isCredit ? <ArrowDownLeft size={16} className="text-green-600" /> : <ArrowUpRight size={16} className="text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{tx.description || (isCredit ? 'Credit' : 'Debit')}</p>
                  <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <p className={`text-sm font-bold shrink-0 ${isCredit ? 'text-green-600' : 'text-red-500'}`}>
                  {isCredit ? '+' : '-'}${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            )
          })}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
