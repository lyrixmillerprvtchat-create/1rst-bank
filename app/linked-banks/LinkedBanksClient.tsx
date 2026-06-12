'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import { ChevronLeft, Plus, Building2, Trash2, Loader2, CheckCircle, X } from 'lucide-react'

const BANKS = [
  'Chase Bank', 'Bank of America', 'Wells Fargo', 'Citibank', 'US Bank',
  'Capital One', 'TD Bank', 'PNC Bank', 'Goldman Sachs', 'Morgan Stanley',
  'First National Bank', 'Regions Bank', 'SunTrust Bank', 'Fifth Third Bank', 'KeyBank',
]

interface LinkedBank { id: string; bank_name: string; account_number: string; account_name: string; status: string; created_at: string }

export default function LinkedBanksClient({ linkedBanks: initial }: { linkedBanks: LinkedBank[] }) {
  const router = useRouter()
  const [banks, setBanks] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ bank_name: '', account_number: '', account_name: '' })
  const [loading, setLoading] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  async function addBank(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data, error } = await supabase.from('linked_banks').insert(form).select().single()
    if (error) { setError(error.message); setLoading(false); return }
    setBanks(prev => [data, ...prev])
    setForm({ bank_name: '', account_number: '', account_name: '' })
    setShowForm(false)
    setSuccess('Bank account linked successfully')
    setLoading(false)
  }

  async function removeBank(id: string) {
    setRemoving(id)
    const supabase = createClient()
    await supabase.from('linked_banks').delete().eq('id', id)
    setBanks(prev => prev.filter(b => b.id !== id))
    setRemoving(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="px-5 pt-12 pb-6" style={{ background: 'linear-gradient(135deg, #003087 0%, #0066cc 100%)' }}>
        <button onClick={() => router.back()} className="text-white/70 mb-4 flex items-center gap-1 text-sm">
          <ChevronLeft size={18} /> Back
        </button>
        <h1 className="text-white text-xl font-bold">Linked Bank Accounts</h1>
        <p className="text-blue-200 text-sm mt-1">Connect your external bank accounts</p>
      </div>

      <div className="px-5 mt-5 space-y-4">
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 flex items-center gap-3">
            <CheckCircle size={16} className="text-green-600 shrink-0" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        <button onClick={() => { setShowForm(true); setSuccess('') }}
          className="w-full py-3.5 rounded-2xl bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2">
          <Plus size={16} /> Link New Bank Account
        </button>

        {showForm && (
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Add Bank Account</h3>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <form onSubmit={addBank} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Bank Name</label>
                <select value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} required
                  className="mt-1 w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  <option value="">Select bank...</option>
                  {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Account Number</label>
                <input value={form.account_number} onChange={e => setForm({ ...form, account_number: e.target.value })} required
                  className="mt-1 w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Enter account number" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Account Name</label>
                <input value={form.account_name} onChange={e => setForm({ ...form, account_name: e.target.value })} required
                  className="mt-1 w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Full name on account" />
              </div>
              {error && <p className="text-red-500 text-xs">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? <><Loader2 size={14} className="animate-spin" /> Linking...</> : 'Link Account'}
              </button>
            </form>
          </div>
        )}

        {banks.length === 0 && !showForm && (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <Building2 size={32} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-400">No linked banks yet</p>
            <p className="text-xs text-gray-300 mt-1">Add an external bank account to get started</p>
          </div>
        )}

        {banks.map(bank => (
          <div key={bank.id} className="bg-white rounded-2xl px-4 py-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                  <Building2 size={18} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{bank.bank_name}</p>
                  <p className="text-xs text-gray-400 font-mono">{bank.account_number}</p>
                </div>
              </div>
              <button onClick={() => removeBank(bank.id)} disabled={removing === bank.id}
                className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
                {removing === bank.id ? <Loader2 size={14} className="animate-spin text-red-400" /> : <Trash2 size={14} className="text-red-400" />}
              </button>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-50 flex items-center justify-between">
              <p className="text-xs text-gray-500">{bank.account_name}</p>
              <span className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-medium">Active</span>
            </div>
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  )
}
