'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Eye, EyeOff, Loader2, CheckCircle, XCircle, AlertTriangle,
  FileText, Image as ImageIcon, ChevronDown, ChevronUp, RefreshCw, Shield
} from 'lucide-react'

interface KycSubmission {
  id: string
  user_id: string
  account_number: string
  full_name: string
  doc_type: string
  doc_front_url: string
  doc_back_url: string | null
  selfie_url: string | null
  status: string
  submitted_at: string
}

interface KycVaultRecord {
  account_number: string
  full_name: string
  date_of_birth: string | null
  gender: string | null
  nationality: string | null
  maiden_name: string | null
  occupation: string | null
  primary_phone: string | null
  secondary_phone: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state_province: string | null
  postal_code: string | null
  country: string | null
  document_type: string | null
  document_number: string | null
  submitted_at: string
}

type Screen = 'loading' | 'login' | 'dashboard'

export default function KycDocsClient() {
  const [screen, setScreen] = useState<Screen>('loading')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loginErr, setLoginErr] = useState('')
  const [loginWorking, setLoginWorking] = useState(false)

  const [submissions, setSubmissions] = useState<KycSubmission[]>([])
  const [vault, setVault] = useState<KycVaultRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')

  useEffect(() => {
    async function checkSession() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setScreen('login'); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single()
      if (profile?.role === 'admin') { setScreen('dashboard'); loadData() }
      else setScreen('login')
    }
    checkSession()
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginWorking(true)
    setLoginErr('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: 'admin@1rstbank.com',
      password,
    })
    if (error) { setLoginErr('Incorrect password'); setLoginWorking(false); return }
    setScreen('dashboard')
    loadData()
    setLoginWorking(false)
  }

  async function loadData() {
    setLoading(true)
    const [subRes, vaultRes] = await Promise.all([
      fetch('/api/admin/kyc-docs'),
      fetch('/api/admin/vault'),
    ])
    const subData = await subRes.json()
    const vaultData = await vaultRes.json()
    if (subData.submissions) setSubmissions(subData.submissions)
    if (vaultData.kycVault) setVault(vaultData.kycVault)
    setLoading(false)
  }

  async function handleDecision(id: string, status: 'approved' | 'rejected') {
    setActionId(id)
    const res = await fetch('/api/admin/kyc-docs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    if (res.ok) {
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status } : s))
    }
    setActionId(null)
  }

  if (screen === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={24} className="animate-spin text-blue-600" />
      </div>
    )
  }

  if (screen === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Shield size={18} className="text-blue-700" />
            </div>
            <div>
              <p className="font-bold text-gray-900">KYC Document Vault</p>
              <p className="text-xs text-gray-400">Admin access only</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Admin Password</label>
              <div className="relative mt-1">
                <input type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} required
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm pr-12"
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-3 text-gray-400">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {loginErr && <p className="text-red-500 text-xs">{loginErr}</p>}
            <button type="submit" disabled={loginWorking}
              className="w-full py-3 rounded-xl bg-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
              {loginWorking ? <Loader2 size={16} className="animate-spin" /> : 'Access Vault'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  const filtered = submissions.filter(s => filter === 'all' || s.status === filter)
  const pendingCount = submissions.filter(s => s.status === 'pending').length

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="KYC document" className="max-w-full max-h-full rounded-xl object-contain" />
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-12 pb-5" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-white text-xl font-bold">KYC Document Vault</h1>
            <p className="text-gray-400 text-xs mt-0.5">
              {pendingCount} pending · {submissions.length} total submissions
            </p>
          </div>
          <button onClick={loadData} disabled={loading} className="flex items-center gap-1.5 text-gray-400 text-xs bg-white/10 px-3 py-2 rounded-xl">
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Refresh
          </button>
        </div>

        {/* Filter tabs */}
        <div className="grid grid-cols-4 gap-1">
          {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`py-1.5 rounded-xl text-[11px] font-semibold capitalize transition-colors ${filter === f ? 'bg-white text-blue-700' : 'bg-white/10 text-white/60'}`}>
              {f} {f === 'pending' && pendingCount > 0 && `(${pendingCount})`}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 mt-5 space-y-4">
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 size={24} className="animate-spin text-blue-600" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <FileText size={32} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-400">No submissions found</p>
          </div>
        )}

        {!loading && filtered.map(sub => {
          const vaultRecord = vault.find(v => v.account_number === sub.account_number)
          const isExpanded = expanded === sub.id
          const isActing = actionId === sub.id
          const statusColor = sub.status === 'approved' ? 'bg-green-100 text-green-700'
            : sub.status === 'rejected' ? 'bg-red-100 text-red-600'
            : 'bg-yellow-100 text-yellow-700'

          return (
            <div key={sub.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Summary row */}
              <div className="px-4 py-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <span className="text-blue-700 font-bold text-sm">{sub.full_name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{sub.full_name}</p>
                  <p className="text-xs text-gray-400 font-mono">{sub.account_number} · {sub.doc_type}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{new Date(sub.submitted_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor}`}>{sub.status.toUpperCase()}</span>
                  <button onClick={() => setExpanded(isExpanded ? null : sub.id)}
                    className="text-gray-400 flex items-center gap-1 text-xs">
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-50 px-4 py-4 space-y-4">
                  {/* Documents */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Documents</p>
                    <div className="grid grid-cols-3 gap-2">
                      {sub.doc_front_url && (
                        <div className="space-y-1">
                          <p className="text-[10px] text-gray-400 font-medium">Front</p>
                          <button onClick={() => setLightbox(sub.doc_front_url)}
                            className="w-full h-20 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center">
                            <img src={sub.doc_front_url} alt="front" className="w-full h-full object-cover" />
                          </button>
                        </div>
                      )}
                      {sub.doc_back_url && (
                        <div className="space-y-1">
                          <p className="text-[10px] text-gray-400 font-medium">Back</p>
                          <button onClick={() => setLightbox(sub.doc_back_url!)}
                            className="w-full h-20 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center">
                            <img src={sub.doc_back_url} alt="back" className="w-full h-full object-cover" />
                          </button>
                        </div>
                      )}
                      {sub.selfie_url && (
                        <div className="space-y-1">
                          <p className="text-[10px] text-gray-400 font-medium">Selfie</p>
                          <button onClick={() => setLightbox(sub.selfie_url!)}
                            className="w-full h-20 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center">
                            <img src={sub.selfie_url} alt="selfie" className="w-full h-full object-cover" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Vault personal details */}
                  {vaultRecord && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Personal Details</p>
                      <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                        {[
                          ['Full Name', vaultRecord.full_name],
                          ['Date of Birth', vaultRecord.date_of_birth],
                          ['Gender', vaultRecord.gender],
                          ['Nationality', vaultRecord.nationality],
                          ['Occupation', vaultRecord.occupation],
                          ['Phone', vaultRecord.primary_phone],
                          ['Alt Phone', vaultRecord.secondary_phone],
                          ['Address', [vaultRecord.address_line1, vaultRecord.address_line2, vaultRecord.city, vaultRecord.state_province, vaultRecord.postal_code, vaultRecord.country].filter(Boolean).join(', ')],
                          ['Doc Type', vaultRecord.document_type],
                          ['Doc Number', vaultRecord.document_number],
                        ].map(([label, value]) => value ? (
                          <div key={label} className="flex justify-between text-xs">
                            <span className="text-gray-400">{label}</span>
                            <span className="text-gray-700 font-medium text-right max-w-[60%]">{value}</span>
                          </div>
                        ) : null)}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {sub.status === 'pending' && (
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => handleDecision(sub.id, 'approved')} disabled={isActing}
                        className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50">
                        {isActing ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={13} />} Approve KYC
                      </button>
                      <button onClick={() => handleDecision(sub.id, 'rejected')} disabled={isActing}
                        className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50">
                        {isActing ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={13} />} Reject KYC
                      </button>
                    </div>
                  )}
                  {sub.status !== 'pending' && (
                    <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${sub.status === 'approved' ? 'bg-green-50' : 'bg-red-50'}`}>
                      {sub.status === 'approved'
                        ? <CheckCircle size={13} className="text-green-600" />
                        : <AlertTriangle size={13} className="text-red-500" />}
                      <p className="text-xs font-medium text-gray-600">
                        KYC {sub.status === 'approved' ? 'approved' : 'rejected'} — client profile updated.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
