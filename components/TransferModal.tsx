'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { X, Loader2, CheckCircle, Clock } from 'lucide-react'
import type { Account } from '@/lib/types'

type Step = 'form' | 'confirm' | 'success' | 'review'
type BankType = '1rst Bank' | 'Other'

const inputClass = 'mt-1 w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm'
const labelClass = 'text-xs font-medium text-gray-500 uppercase tracking-wide'

export default function TransferModal({ account, onClose }: { account: Account | null, onClose: () => void }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('form')
  const [bank, setBank] = useState<BankType>('1rst Bank')
  const [bankName, setBankName] = useState('')
  const [toAccount, setToAccount] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [iban, setIban] = useState('')
  const [swift, setSwift] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canProceed = bank === '1rst Bank'
    ? (toAccount.length >= 6 && !!amount)
    : (!!bankName && !!toAccount && !!amount)

  async function handleContinue() {
    setError('')
    if (bank === 'Other') {
      setStep('confirm')
      return
    }
    setLoading(true)
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

    if (bank === 'Other') {
      setStep('review')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const senderName = (await supabase.from('profiles').select('full_name').eq('user_id', user?.id).single()).data?.full_name ?? 'Unknown'

    const res = await fetch('/api/transfer', {
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
    if (data.toName) setRecipientName(data.toName)
    setStep('success')
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
      <div className="bg-white w-full max-w-[430px] mx-auto rounded-t-3xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center px-6 pt-6 pb-4 shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">Transfer Money</h3>
          <button onClick={onClose}><X size={22} className="text-gray-400" /></button>
        </div>

        <div className="overflow-y-auto px-6 pb-10">

        {/* SUCCESS */}
        {step === 'success' && (
          <div className="flex flex-col items-center py-8 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-800">Transfer Successful</p>
              <p className="text-sm text-gray-500 mt-1">
                <span className="font-semibold text-blue-700">${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span> has been sent to <span className="font-semibold">{recipientName}</span>
              </p>
            </div>
            <div className="w-full bg-green-50 border border-green-100 rounded-2xl px-4 py-3">
              <p className="text-xs text-green-700 font-medium">Funds transferred instantly. A confirmation email has been sent to both you and the recipient.</p>
            </div>
            <button onClick={() => { onClose(); router.refresh() }}
              className="w-full py-3 rounded-xl bg-blue-700 text-white text-sm font-semibold">
              Done
            </button>
          </div>
        )}

        {/* REVIEW (external bank) */}
        {step === 'review' && (
          <div className="flex flex-col items-center py-8 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
              <Clock size={32} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-800">Transfer Submitted</p>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed px-2">
                Your external transfer has been submitted and is pending compliance review. This is a standard security check for international and external transfers.
              </p>
            </div>
            <div className="w-full bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
              <p className="text-xs text-blue-700 font-medium">Expected processing time: 1–3 business days. You will receive a notification once approved.</p>
            </div>
            <button onClick={() => { onClose(); router.push('/support') }}
              className="w-full py-3 rounded-xl bg-blue-700 text-white text-sm font-semibold">
              Contact Support
            </button>
            <button onClick={onClose} className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium">
              Close
            </button>
          </div>
        )}

        {/* FORM */}
        {step === 'form' && (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Bank</label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {(['1rst Bank', 'Other'] as BankType[]).map(b => (
                  <button key={b} type="button"
                    onClick={() => { setBank(b); setError(''); setBankName(''); setToAccount(''); setIban(''); setSwift('') }}
                    className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${bank === b ? 'border-blue-700 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {bank === 'Other' && (
              <div>
                <label className={labelClass}>Bank Name</label>
                <input value={bankName} onChange={e => setBankName(e.target.value)}
                  className={inputClass} placeholder="e.g. Chase Bank, Barclays..." />
              </div>
            )}

            <div>
              <label className={labelClass}>Recipient Account Number</label>
              <input value={toAccount} onChange={e => setToAccount(e.target.value)}
                maxLength={bank === '1rst Bank' ? 11 : 34}
                className={inputClass}
                placeholder={bank === '1rst Bank' ? '0123456789' : 'Account number or IBAN'} />
            </div>

            {bank === 'Other' && (
              <>
                <div>
                  <label className={labelClass}>IBAN <span className="text-gray-400 normal-case font-normal">(if applicable)</span></label>
                  <input value={iban} onChange={e => setIban(e.target.value)}
                    className={inputClass} placeholder="e.g. DE89370400440532013000" />
                </div>
                <div>
                  <label className={labelClass}>SWIFT / BIC Code</label>
                  <input value={swift} onChange={e => setSwift(e.target.value.toUpperCase())}
                    className={inputClass} placeholder="e.g. CHASUS33" />
                </div>
              </>
            )}

            <div>
              <label className={labelClass}>Amount ($)</label>
              <input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="1"
                className={inputClass} placeholder="0.00" />
            </div>

            <div>
              <label className={labelClass}>Narration (optional)</label>
              <input value={description} onChange={e => setDescription(e.target.value)}
                className={inputClass} placeholder="Payment for..." />
            </div>

            {error && <p className="text-red-500 text-xs">{error}</p>}

            <button onClick={handleContinue} disabled={!canProceed || loading}
              className="w-full py-3.5 rounded-xl bg-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Looking up...</> : 'Continue'}
            </button>
          </div>
        )}

        {/* CONFIRM */}
        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Bank</span>
                <span className="text-sm font-semibold text-gray-800">{bank === 'Other' ? bankName : '1rst Bank'}</span>
              </div>
              {bank === '1rst Bank' && recipientName && (
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Recipient</span>
                  <span className="text-sm font-semibold text-gray-800">{recipientName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Account</span>
                <span className="text-sm font-medium text-gray-700">{toAccount}</span>
              </div>
              {iban && (
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">IBAN</span>
                  <span className="text-sm font-medium text-gray-700">{iban}</span>
                </div>
              )}
              {swift && (
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">SWIFT / BIC</span>
                  <span className="text-sm font-medium text-gray-700">{swift}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Amount</span>
                <span className="text-sm font-bold text-blue-700">${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              {description && (
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Narration</span>
                  <span className="text-sm text-gray-700">{description}</span>
                </div>
              )}
            </div>

            {bank === 'Other' && (
              <div className="flex items-start gap-2 bg-blue-50 rounded-xl px-3 py-2.5 border border-blue-100">
                <Clock size={14} className="text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 leading-relaxed">
                  External transfers undergo a standard compliance review. Processing takes 1–3 business days.
                </p>
              </div>
            )}

            {error && <p className="text-red-500 text-xs">{error}</p>}

            <div className="flex flex-col gap-3">
              <button onClick={submitTransfer} disabled={loading}
                className="w-full py-3.5 rounded-xl bg-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                {loading
                  ? <><Loader2 size={16} className="animate-spin" /> Processing...</>
                  : bank === 'Other' ? 'Submit Request' : 'Send Transfer'}
              </button>
              <button onClick={() => setStep('form')}
                className="w-full py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium">
                Back
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
