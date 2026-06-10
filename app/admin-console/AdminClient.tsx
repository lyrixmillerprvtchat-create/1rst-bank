'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Search, Plus, Minus, Loader2, CheckCircle, Shield } from 'lucide-react'

interface FoundUser { name: string; account: string; balance: number }

export default function AdminClient() {
  const [searchAccount, setSearchAccount] = useState('')
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function searchUser() {
    setLoading(true)
    setError('')
    setFoundUser(null)
    setSuccess('')
    const supabase = createClient()
    const { data: profileData } = await supabase.from('profiles').select('full_name, account_number').eq('account_number', searchAccount).single()
    if (!profileData) { setError('Account not found'); setLoading(false); return }
    const { data: accountData } = await supabase.from('accounts').select('balance').eq('account_number', searchAccount).single()
    setFoundUser({ name: profileData.full_name, account: profileData.account_number, balance: accountData?.balance ?? 0 })
    setLoading(false)
  }

  async function handleAction(type: 'credit' | 'debit') {
    if (!foundUser || !amount) return
    setActionLoading(true)
    setError('')
    setSuccess('')
    const supabase = createClient()
    const { error } = await supabase.rpc(type === 'credit' ? 'admin_credit_account' : 'admin_debit_account', {
      p_account_number: foundUser.account,
      p_amount: parseFloat(amount),
    })
    if (error) { setError(error.message); setActionLoading(false); return }
    const newBalance = type === 'credit' ? foundUser.balance + parseFloat(amount) : foundUser.balance - parseFloat(amount)
    setFoundUser({ ...foundUser, balance: newBalance })
    setSuccess(`₦${parseFloat(amount).toLocaleString()} ${type === 'credit' ? 'credited to' : 'debited from'} ${foundUser.name}'s account`)
    setAmount('')
    setActionLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="px-5 pt-12 pb-8" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-full bg-yellow-400/20 flex items-center justify-center">
            <Shield size={18} className="text-yellow-400" />
          </div>
          <div>
            <h1 className="text-white text-xl font-bold">The Controller</h1>
            <p className="text-gray-400 text-xs">Admin Console · 1rst Bank</p>
          </div>
        </div>
      </div>

      <div className="px-5 mt-6 space-y-5">
        {/* Search */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Find Client</h3>
          <div className="flex gap-2">
            <input value={searchAccount} onChange={e => setSearchAccount(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Enter account number" maxLength={10} />
            <button onClick={searchUser} disabled={!searchAccount || loading}
              className="px-4 py-3 rounded-xl bg-blue-700 text-white flex items-center gap-2 text-sm font-medium disabled:opacity-50">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            </button>
          </div>
          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
        </div>

        {/* Found User */}
        {foundUser && (
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Name</span>
                <span className="text-sm font-semibold text-gray-800">{foundUser.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Account</span>
                <span className="text-sm text-gray-700 font-mono">{foundUser.account}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Balance</span>
                <span className="text-sm font-bold text-blue-700">₦{foundUser.balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Amount (₦)</label>
              <input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="1"
                className="mt-1 w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Enter amount" />
            </div>

            {success && (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-xl px-3 py-2">
                <CheckCircle size={16} /> <p className="text-xs font-medium">{success}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => handleAction('credit')} disabled={!amount || actionLoading}
                className="flex-1 py-3 rounded-xl bg-green-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Credit
              </button>
              <button onClick={() => handleAction('debit')} disabled={!amount || actionLoading}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Minus size={16} />} Debit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
