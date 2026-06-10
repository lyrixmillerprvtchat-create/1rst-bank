'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { X, Loader2, CheckCircle } from 'lucide-react'
import type { Account } from '@/lib/types'

export default function TransferModal({ account, onClose }: { account: Account | null, onClose: () => void }) {
  const router = useRouter()
  const [step, setStep] = useState<'form' | 'confirm' | 'success'>('form')
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
    if (!data) { setError('Account not found'); setLoading(false); return }
    setRecipientName(data.full_name)
    setStep('confirm')
    setLoading(false)
  }

  async function executeTransfer() {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.rpc('transfer_funds', {
      p_from_account: account?.account_number,
      p_to_account: toAccount,
      p_amount: parseFloat(amount),
      p_description: description || `Transfer to ${toAccount}`
    })
    if (error) { setError(error.message); setLoading(false); return }
    setStep('success')
    setLoading(false)
    setTimeout(() => { onClose(); router.refresh() }, 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
      <div className="bg-white w-full max-w-[430px] mx-auto rounded-t-3xl p-6 pb-10">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Transfer Money</h3>
          <button onClick={onClose}><X size={22} className="text-gray-400" /></button>
        </div>

        {step === 'success' && (
          <div className="flex flex-col items-center py-8 gap-3">
            <CheckCircle size={56} className="text-green-500" />
            <p className="text-lg font-semibold text-gray-800">Transfer Successful!</p>
            <p className="text-sm text-gray-500">₦{parseFloat(amount).toLocaleString()} sent to {recipientName}</p>
          </div>
        )}

        {step === 'form' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Recipient Account Number</label>
              <input value={toAccount} onChange={e => setToAccount(e.target.value)} maxLength={10}
                className="mt-1 w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="0123456789" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Amount (₦)</label>
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

        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between"><span className="text-xs text-gray-500">Recipient</span><span className="text-sm font-semibold text-gray-800">{recipientName}</span></div>
              <div className="flex justify-between"><span className="text-xs text-gray-500">Account</span><span className="text-sm font-medium text-gray-700">{toAccount}</span></div>
              <div className="flex justify-between"><span className="text-xs text-gray-500">Amount</span><span className="text-sm font-bold text-blue-700">₦{parseFloat(amount).toLocaleString()}</span></div>
              {description && <div className="flex justify-between"><span className="text-xs text-gray-500">Narration</span><span className="text-sm text-gray-700">{description}</span></div>}
            </div>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setStep('form')} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium">Back</button>
              <button onClick={executeTransfer} disabled={loading}
                className="flex-1 py-3 rounded-xl bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : 'Confirm & Send'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
