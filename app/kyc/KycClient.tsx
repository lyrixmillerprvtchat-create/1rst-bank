'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, CheckCircle, Loader2, FileText, Camera, CreditCard, AlertTriangle } from 'lucide-react'

const DOC_TYPES = [
  'International Passport',
  'National Identity Card',
  "Driver's License",
  "Voter's Card",
  'Residence Permit',
  'Utility Bill',
]

interface Props {
  profile: { full_name: string; account_number: string; kyc_status: string } | null
}

export default function KycClient({ profile }: Props) {
  const router = useRouter()
  const [docType, setDocType] = useState('')
  const [frontFile, setFrontFile] = useState<File | null>(null)
  const [backFile, setBackFile] = useState<File | null>(null)
  const [selfieFile, setSelfieFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  function preview(file: File | null) {
    if (!file) return null
    return URL.createObjectURL(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!docType || !frontFile) { setError('Please select document type and upload front of document.'); return }
    setSubmitting(true)
    setError('')

    const form = new FormData()
    form.append('doc_type', docType)
    form.append('doc_front', frontFile)
    if (backFile) form.append('doc_back', backFile)
    if (selfieFile) form.append('selfie', selfieFile)
    form.append('account_number', profile?.account_number ?? '')
    form.append('full_name', profile?.full_name ?? '')

    const res = await fetch('/api/kyc-submit', { method: 'POST', body: form })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Submission failed'); setSubmitting(false); return }
    setDone(true)
    setSubmitting(false)
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Profile not found. <Link href="/dashboard" className="text-blue-700">Go back</Link></p>
      </div>
    )
  }

  if (profile.kyc_status === 'approved') {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <div className="px-4 py-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #003087, #0066cc)' }}>
          <Link href="/profile" className="text-white/70 hover:text-white"><ArrowLeft size={20} /></Link>
          <p className="text-white font-semibold text-sm">KYC Verification</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <CheckCircle size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">KYC Approved</h2>
          <p className="text-gray-500 text-sm">Your identity has been verified. Your account is fully activated.</p>
          <Link href="/dashboard" className="mt-6 px-6 py-3 rounded-xl bg-blue-700 text-white text-sm font-semibold">Back to Dashboard</Link>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <div className="px-4 py-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #003087, #0066cc)' }}>
          <p className="text-white font-semibold text-sm">KYC Verification</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
            <CheckCircle size={32} className="text-blue-700" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Documents Submitted</h2>
          <p className="text-gray-500 text-sm">Your KYC documents have been received and are under review. You will be notified once approved.</p>
          <button onClick={() => router.push('/dashboard')} className="mt-6 px-6 py-3 rounded-xl bg-blue-700 text-white text-sm font-semibold">Back to Dashboard</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 pb-10">
      {/* Header */}
      <div className="px-4 py-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #003087, #0066cc)' }}>
        <Link href="/profile" className="text-white/70 hover:text-white"><ArrowLeft size={20} /></Link>
        <div>
          <p className="text-white font-semibold text-sm">KYC Verification</p>
          <p className="text-white/70 text-xs">Identity verification required</p>
        </div>
      </div>

      {profile.kyc_status === 'pending' && (
        <div className="mx-4 mt-4 flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-xl p-3">
          <AlertTriangle size={15} className="text-yellow-600 mt-0.5 shrink-0" />
          <p className="text-xs text-yellow-700">Your KYC is under review. You can resubmit if documents were rejected.</p>
        </div>
      )}

      {profile.kyc_status === 'rejected' && (
        <div className="mx-4 mt-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
          <AlertTriangle size={15} className="text-red-600 mt-0.5 shrink-0" />
          <p className="text-xs text-red-700">Your previous KYC was rejected. Please resubmit with clearer documents.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="px-4 mt-5 space-y-5">
        {/* Client info */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Your Details</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Full Name</span>
              <span className="font-semibold text-gray-800">{profile.full_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Account No.</span>
              <span className="font-mono text-gray-800">{profile.account_number}</span>
            </div>
          </div>
        </div>

        {/* Document type */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Document Type</p>
          <div className="grid grid-cols-2 gap-2">
            {DOC_TYPES.map(type => (
              <button key={type} type="button" onClick={() => setDocType(type)}
                className={`px-3 py-2.5 rounded-xl text-xs font-medium text-left border transition-colors ${docType === type ? 'bg-blue-700 text-white border-blue-700' : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-blue-300'}`}>
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Document upload */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Upload Documents</p>

          {/* Front */}
          <div>
            <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5 mb-2">
              <CreditCard size={13} className="text-blue-600" /> Front of Document <span className="text-red-500">*</span>
            </label>
            <label className={`flex flex-col items-center justify-center w-full rounded-xl border-2 border-dashed cursor-pointer transition-colors ${frontFile ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-blue-300'}`} style={{ minHeight: 100 }}>
              {frontFile ? (
                <div className="flex flex-col items-center p-3">
                  {frontFile.type.startsWith('image/') && <img src={preview(frontFile)!} alt="front" className="h-20 object-contain rounded-lg mb-1" />}
                  <p className="text-xs text-blue-700 font-medium text-center truncate max-w-full px-2">{frontFile.name}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center py-6 text-gray-400">
                  <Upload size={22} className="mb-1" />
                  <p className="text-xs">Tap to upload</p>
                </div>
              )}
              <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => setFrontFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>

          {/* Back */}
          <div>
            <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5 mb-2">
              <CreditCard size={13} className="text-blue-600" /> Back of Document <span className="text-gray-400 text-[10px]">(optional)</span>
            </label>
            <label className={`flex flex-col items-center justify-center w-full rounded-xl border-2 border-dashed cursor-pointer transition-colors ${backFile ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-blue-300'}`} style={{ minHeight: 80 }}>
              {backFile ? (
                <div className="flex flex-col items-center p-3">
                  {backFile.type.startsWith('image/') && <img src={preview(backFile)!} alt="back" className="h-16 object-contain rounded-lg mb-1" />}
                  <p className="text-xs text-blue-700 font-medium text-center truncate max-w-full px-2">{backFile.name}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center py-5 text-gray-400">
                  <FileText size={20} className="mb-1" />
                  <p className="text-xs">Tap to upload</p>
                </div>
              )}
              <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => setBackFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>

          {/* Selfie */}
          <div>
            <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5 mb-2">
              <Camera size={13} className="text-blue-600" /> Selfie with Document <span className="text-gray-400 text-[10px]">(optional but recommended)</span>
            </label>
            <label className={`flex flex-col items-center justify-center w-full rounded-xl border-2 border-dashed cursor-pointer transition-colors ${selfieFile ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-blue-300'}`} style={{ minHeight: 80 }}>
              {selfieFile ? (
                <div className="flex flex-col items-center p-3">
                  <img src={preview(selfieFile)!} alt="selfie" className="h-16 object-contain rounded-lg mb-1" />
                  <p className="text-xs text-blue-700 font-medium text-center truncate max-w-full px-2">{selfieFile.name}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center py-5 text-gray-400">
                  <Camera size={20} className="mb-1" />
                  <p className="text-xs">Tap to take/upload selfie</p>
                </div>
              )}
              <input type="file" className="hidden" accept="image/*" capture="user" onChange={e => setSelfieFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
            <AlertTriangle size={14} className="text-red-500 shrink-0" />
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        <button type="submit" disabled={submitting || !docType || !frontFile}
          className="w-full py-3.5 rounded-xl bg-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-blue-800 transition-colors">
          {submitting ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : <><Upload size={16} /> Submit KYC Documents</>}
        </button>
      </form>
    </div>
  )
}
