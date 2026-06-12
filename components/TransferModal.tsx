'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { X, Loader2, CheckCircle, Clock } from 'lucide-react'
import type { Account } from '@/lib/types'

export default function TransferModal({ account, onClose }: { account: Account | null, onClose: () => void }) {
  const router = useRouter()
  const [step, setStep] = useState<'form' | 'confirm' | 'processing' | 'success'>('form')
  const [toAccount, setToAccount] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function lookupAccount() {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data } = await supabase.from('profiles').select('full_name').eq('account_number', toAccount).single()
    if (!data) { setError('Account not found on 1rst Bank'); setLoading(false); return }
    setRecipientName(data.full_name)
    setStep('confirm')
    setLoading(false)
  }

  async function submitTransfer() {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const senderName = (await supabase.from('profiles').select('full_name').eq('user_id', user?.id).single()).data?.full_name ?? 'Unknown'

    const res = await fetch('/api/transfer-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromAccount: account?.account_number,
        fromName: senderName,
        toAccount,
        amount: parseFloat(amount),
        description: description || `Transfer to ${toAccount}`,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Transfer failed'); setLoading(false); return }
    setStep('processing')
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
      <div className="bg-white w-full max-w-[430px] mx-auto rounded-t-3xl p-6 pb-10">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Transfer Money</h3>
          <button onClick={onClose}><X size={22} className="text-gray-400" /></button>
        </div>

        {/* PROCESSING STATE */}
        {step === 'processing' && (
          <div className="flex flex-col items-center py-8 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
              <Clock size={32} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-800">Transfer Processing</p>
              <p className="text-sm text-gray-500 mt-1">Your transfer of <span className="font-semibold text-blue-700">${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span> to <span className="font-semibold">{recipientName}</span> is awaiting admin approval.</p>
            </div>
            <div className="w-full bg-yellow-50 border border-yellow-100 rounded-2xl px-4 py-3">
              <p className="text-xs text-yellow-700 font-medium">You will be notified once approved. Funds will not move until then.</p>
            </div>
            <button onClick={() => { onClose(); router.refresh() }}
              className="w-full py-3 rounded-xl bg-blue-700 text-white text-sm font-semibold">
              Done
            </button>
          </div>
        )}

        {/* FORM */}
        {step === 'form' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Recipient Account Number</label>
              <input value={toAccount} onChange={e => setToAccount(e.target.value)} maxLength={10}
                className="mt-1 w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="0123456789" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Amount ($)</label>
              <input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="1"
                className="mt-1 w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="0.00" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Narration (optional)</label>
              <input value={description} onChange={e => setDescription(e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Payment for..." />
            </div>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button onClick={lookupAccount} disabled={!toAccount || !amount || loading}
              className="w-full py-3.5 rounded-xl bg-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Looking up...</> : 'Continue'}
            </button>
          </div>
        )}

        {/* CONFIRM */}
        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between"><span className="text-xs text-gray-500">Recipient</span><span className="text-sm font-semibold text-gray-800">{recipientName}</span></div>
              <div className="flex justify-between"><span className="text-xs text-gray-500">Account</span><span className="text-sm font-medium text-gray-700">{toAccount}</span></div>
              <div className="flex justify-between"><span className="text-xs text-gray-500">Amount</span><span className="text-sm font-bold text-blue-700">${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
              {description && <div className="flex justify-between"><span className="text-xs text-gray-500">Narration</span><span className="text-sm text-gray-700">{description}</span></div>}
            </div>
            <div className="flex items-center gap-2 bg-yellow-50 rounded-xl px-3 py-2.5">
              <Clock size={14} className="text-yellow-600 shrink-0" />
              <p className="text-xs text-yellow-700">Transfer will be held for admin approval before funds move</p>
            </div>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setStep('form')} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium">Back</button>
              <button onClick={submitTransfer} disabled={loading}
                className="flex-1 py-3 rounded-xl bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <><Loader2 size={16} className="animate-spin" /> Submitting...</> : 'Submit Transfer'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
