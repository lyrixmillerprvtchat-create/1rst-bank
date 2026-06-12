'use client'
import { useState } from 'react'
import { X, Copy, CheckCircle, Building2 } from 'lucide-react'
import type { Profile, Account } from '@/lib/types'

export default function AddMoneyModal({ profile, account, onClose }: {
  profile: Profile | null
  account: Account | null
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)

  function copyAccount() {
    navigator.clipboard.writeText(account?.account_number ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
      <div className="bg-white w-full max-w-[430px] mx-auto rounded-t-3xl p-6 pb-10">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Add Money</h3>
          <button onClick={onClose}><X size={22} className="text-gray-400" /></button>
        </div>

        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mb-3">
            <Building2 size={26} className="text-blue-700" />
          </div>
          <p className="text-sm text-gray-500">Send funds to your 1rst Bank account</p>
        </div>

        {/* Account Details Card */}
        <div className="bg-gradient-to-br from-blue-700 to-blue-900 rounded-2xl p-5 mb-5 text-white space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-200 text-[11px] font-medium uppercase tracking-wide">Bank</p>
              <p className="text-white font-bold text-base mt-0.5">1rst Bank</p>
            </div>
            <div className="bg-white/20 rounded-lg px-2 py-1">
              <p className="text-white text-[10px] font-semibold">ACTIVE</p>
            </div>
          </div>

          <div>
            <p className="text-blue-200 text-[11px] font-medium uppercase tracking-wide">Account Name</p>
            <p className="text-white font-semibold text-base mt-0.5">{profile?.full_name ?? '—'}</p>
          </div>

          <div>
            <p className="text-blue-200 text-[11px] font-medium uppercase tracking-wide">Account Number</p>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-white font-bold text-xl tracking-widest">{account?.account_number ?? '—'}</p>
              <button
                onClick={copyAccount}
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 transition-colors px-3 py-1.5 rounded-xl text-white text-xs font-semibold"
              >
                {copied ? <><CheckCircle size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-2xl px-4 py-3 mb-5">
          <p className="text-xs text-blue-700 font-medium leading-relaxed">
            Transfer funds from any bank to the account number above. Your balance will be updated once the deposit is confirmed by the admin.
          </p>
        </div>

        <button onClick={onClose}
          className="w-full py-3.5 rounded-xl bg-blue-700 text-white font-semibold text-sm">
          Done
        </button>
      </div>
    </div>
  )
}
