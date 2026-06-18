'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Eye, EyeOff, Loader2, CheckCircle, XCircle, Shield,
  ChevronDown, ChevronUp, RefreshCw, Search, Download,
  User, Phone, Mail, Hash, Calendar, MapPin, FileText,
  Image as ImageIcon, AlertTriangle, Clock, BadgeCheck
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────
interface KycSubmission {
  id: string
  doc_type: string
  doc_front_url: string
  doc_back_url: string | null
  selfie_url: string | null
  status: string
  submitted_at: string
  reviewed_at: string | null
}

interface KycForm {
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

interface ClientRecord {
  user_id: string
  full_name: string
  account_number: string
  phone: string | null
  tier: string
  status: string
  kyc_status: string
  created_at: string
  balance: number
  email: string | null
  signup_phone: string | null
  kyc_submissions: KycSubmission[]
  kyc_form: KycForm | null
}

type Screen = 'loading' | 'login' | 'dashboard'
type Filter = 'all' | 'with_docs' | 'no_docs' | 'approved' | 'pending' | 'rejected'

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2 })
}

function kycBadge(status: string) {
  if (status === 'approved') return 'bg-emerald-100 text-emerald-700'
  if (status === 'rejected') return 'bg-red-100 text-red-600'
  return 'bg-yellow-100 text-yellow-700'
}

const InfoRow = ({ label, value }: { label: string; value: string | null | undefined }) =>
  value ? (
    <div className="flex gap-2 text-xs">
      <span className="text-gray-400 w-28 shrink-0">{label}</span>
      <span className="text-gray-700 font-medium break-all">{value}</span>
    </div>
  ) : null

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ClientFilesClient() {
  const [screen, setScreen] = useState<Screen>('loading')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loginErr, setLoginErr] = useState('')
  const [loginWorking, setLoginWorking] = useState(false)

  const [clients, setClients] = useState<ClientRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)
  const [directKycId, setDirectKycId] = useState<string | null>(null)

  useEffect(() => {
    async function check() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setScreen('login'); return }
      const { data: p } = await supabase.from('profiles').select('role').eq('user_id', user.id).single()
      if (p?.role === 'admin') { setScreen('dashboard'); load() }
      else setScreen('login')
    }
    check()
  }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/all-clients')
    const data = await res.json()
    if (data.clients) setClients(data.clients)
    setLoading(false)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginWorking(true)
    setLoginErr('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email: 'admin@1rstbank.com', password })
    if (error) { setLoginErr('Incorrect password'); setLoginWorking(false); return }
    setScreen('dashboard')
    load()
    setLoginWorking(false)
  }

  async function approveKyc(submissionId: string, accountNumber: string) {
    setActionId(submissionId)
    await fetch('/api/admin/kyc-docs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: submissionId, status: 'approved' }),
    })
    setClients(prev => prev.map(c => {
      if (c.account_number !== accountNumber) return c
      return {
        ...c,
        kyc_status: 'approved',
        kyc_submissions: c.kyc_submissions.map(s =>
          s.id === submissionId ? { ...s, status: 'approved' } : s
        ),
      }
    }))
    setActionId(null)
  }

  async function rejectKyc(submissionId: string, accountNumber: string) {
    setActionId(submissionId)
    await fetch('/api/admin/kyc-docs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: submissionId, status: 'rejected' }),
    })
    setClients(prev => prev.map(c => {
      if (c.account_number !== accountNumber) return c
      return {
        ...c,
        kyc_status: 'rejected',
        kyc_submissions: c.kyc_submissions.map(s =>
          s.id === submissionId ? { ...s, status: 'rejected' } : s
        ),
      }
    }))
    setActionId(null)
  }

  async function setDirectKyc(accountNumber: string, kyc_status: 'approved' | 'rejected') {
    setDirectKycId(accountNumber)
    const res = await fetch('/api/admin/set-kyc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_number: accountNumber, kyc_status }),
    })
    if (res.ok) {
      setClients(prev => prev.map(c =>
        c.account_number === accountNumber ? { ...c, kyc_status } : c
      ))
    } else {
      const d = await res.json()
      alert(d.error ?? 'KYC update failed')
    }
    setDirectKycId(null)
  }

  const filtered = useMemo(() => {
    let list = clients
    if (filter === 'with_docs') list = list.filter(c => c.kyc_submissions.length > 0)
    else if (filter === 'no_docs') list = list.filter(c => c.kyc_submissions.length === 0)
    else if (filter === 'approved') list = list.filter(c => c.kyc_status === 'approved')
    else if (filter === 'pending') list = list.filter(c => c.kyc_status === 'pending')
    else if (filter === 'rejected') list = list.filter(c => c.kyc_status === 'rejected')
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.full_name.toLowerCase().includes(q) ||
        c.account_number.includes(q) ||
        (c.email ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [clients, filter, search])

  const withDocs = clients.filter(c => c.kyc_submissions.length > 0).length
  const pending  = clients.filter(c => c.kyc_status === 'pending').length

  // ── Login Screen ─────────────────────────────────────────────────────────────
  if (screen === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={26} className="animate-spin text-blue-600" />
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
              <p className="font-bold text-gray-900">Client Files</p>
              <p className="text-xs text-gray-400">Restricted — admin only</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Admin Password</label>
              <div className="relative mt-1">
                <input type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} required
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-3 text-gray-400">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {loginErr && <p className="text-red-500 text-xs">{loginErr}</p>}
            <button type="submit" disabled={loginWorking}
              className="w-full py-3 rounded-xl bg-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
              {loginWorking ? <Loader2 size={16} className="animate-spin" /> : 'Access Client Files'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-16">

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="document" className="max-w-full max-h-full rounded-xl object-contain shadow-2xl" />
          <p className="absolute bottom-6 text-white/60 text-xs">Tap anywhere to close</p>
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-12 pb-5" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)' }}>
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-white text-xl font-bold">Client Files</h1>
            <p className="text-slate-400 text-xs mt-0.5">
              {clients.length} clients · {withDocs} with KYC docs · {pending} pending review
            </p>
          </div>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 text-slate-400 text-xs bg-white/10 px-3 py-2 rounded-xl">
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Refresh
          </button>
        </div>

        {/* Search */}
        <div className="relative mt-4 mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, account, email…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {([
            ['all', 'All', clients.length],
            ['with_docs', 'Has Docs', withDocs],
            ['no_docs', 'No Docs', clients.length - withDocs],
            ['approved', 'Approved', clients.filter(c => c.kyc_status === 'approved').length],
            ['pending', 'Pending', pending],
            ['rejected', 'Rejected', clients.filter(c => c.kyc_status === 'rejected').length],
          ] as [Filter, string, number][]).map(([f, label, count]) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${filter === f ? 'bg-white text-blue-700' : 'bg-white/10 text-slate-300'}`}>
              {label} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Client List */}
      <div className="px-4 mt-4 space-y-3">
        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 size={26} className="animate-spin text-blue-600" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
            <User size={36} className="mx-auto mb-2 text-gray-300" />
            <p className="text-gray-400 text-sm">No clients match this filter</p>
          </div>
        )}

        {!loading && filtered.map(client => {
          const isOpen = expanded === client.account_number
          const latestKyc = client.kyc_submissions[0] ?? null
          const hasDoc = client.kyc_submissions.length > 0

          return (
            <div key={client.account_number} className="bg-white rounded-2xl shadow-sm overflow-hidden">

              {/* Summary row */}
              <button
                className="w-full px-4 py-3.5 flex items-center gap-3 text-left"
                onClick={() => setExpanded(isOpen ? null : client.account_number)}>
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <span className="text-blue-700 font-bold text-sm">{client.full_name.charAt(0).toUpperCase()}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{client.full_name}</p>
                  <p className="text-xs text-gray-400 font-mono">{client.account_number} · {fmt(client.balance)}</p>
                </div>

                {/* Badges */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${kycBadge(client.kyc_status)}`}>
                    KYC: {client.kyc_status.toUpperCase()}
                  </span>
                  {hasDoc
                    ? <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{client.kyc_submissions.length} DOC{client.kyc_submissions.length > 1 ? 'S' : ''}</span>
                    : <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">NO DOCS</span>
                  }
                </div>
                {isOpen ? <ChevronUp size={14} className="text-gray-400 shrink-0" /> : <ChevronDown size={14} className="text-gray-400 shrink-0" />}
              </button>

              {/* Expanded details */}
              {isOpen && (
                <div className="border-t border-gray-50 px-4 pb-5 pt-3 space-y-5">

                  {/* ── REGISTRATION DETAILS ── */}
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Registration Details</p>
                    <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                      <InfoRow label="Full Name" value={client.full_name} />
                      <InfoRow label="Email" value={client.email} />
                      <InfoRow label="Phone" value={client.phone || client.signup_phone} />
                      <InfoRow label="Account No." value={client.account_number} />
                      <InfoRow label="Tier" value={client.tier} />
                      <InfoRow label="Account Status" value={client.status} />
                      <InfoRow label="Joined" value={new Date(client.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })} />
                      <InfoRow label="Balance" value={fmt(client.balance)} />
                    </div>

                    {/* ── DIRECT KYC CONTROLS ── */}
                    <div className="mt-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">KYC Status Control</p>
                      {client.kyc_status === 'approved' ? (
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
                          <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                          <p className="text-xs text-emerald-700 font-medium">KYC Approved — account fully verified</p>
                          <button
                            onClick={() => setDirectKyc(client.account_number, 'rejected')}
                            disabled={directKycId === client.account_number}
                            className="ml-auto text-[10px] text-red-500 underline disabled:opacity-40">
                            Revoke
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setDirectKyc(client.account_number, 'approved')}
                            disabled={directKycId === client.account_number}
                            className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50">
                            {directKycId === client.account_number ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={12} />}
                            Approve KYC
                          </button>
                          <button
                            onClick={() => setDirectKyc(client.account_number, 'rejected')}
                            disabled={directKycId === client.account_number}
                            className="flex-1 py-2 rounded-xl bg-red-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50">
                            {directKycId === client.account_number ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={12} />}
                            Reject KYC
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── KYC FORM DATA ── */}
                  {client.kyc_form ? (
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">KYC Form Submitted</p>
                      <div className="bg-blue-50 rounded-xl p-3 space-y-2 border border-blue-100">
                        <InfoRow label="Date of Birth" value={client.kyc_form.date_of_birth} />
                        <InfoRow label="Gender" value={client.kyc_form.gender} />
                        <InfoRow label="Nationality" value={client.kyc_form.nationality} />
                        <InfoRow label="Maiden Name" value={client.kyc_form.maiden_name} />
                        <InfoRow label="Occupation" value={client.kyc_form.occupation} />
                        <InfoRow label="Primary Phone" value={client.kyc_form.primary_phone} />
                        <InfoRow label="Alt Phone" value={client.kyc_form.secondary_phone} />
                        <InfoRow label="Address" value={[
                          client.kyc_form.address_line1,
                          client.kyc_form.address_line2,
                        ].filter(Boolean).join(', ')} />
                        <InfoRow label="City" value={client.kyc_form.city} />
                        <InfoRow label="State / Province" value={client.kyc_form.state_province} />
                        <InfoRow label="Postal Code" value={client.kyc_form.postal_code} />
                        <InfoRow label="Country" value={client.kyc_form.country} />
                        <div className="border-t border-blue-200 pt-2 mt-1 space-y-2">
                          <InfoRow label="Document Type" value={client.kyc_form.document_type} />
                          <InfoRow label="Document No." value={client.kyc_form.document_number} />
                        </div>
                        <p className="text-[10px] text-blue-400 pt-1">
                          Submitted {new Date(client.kyc_form.submitted_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-3">
                      <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                      <p className="text-xs text-amber-700">Client has not submitted the KYC form yet.</p>
                    </div>
                  )}

                  {/* ── KYC DOCUMENT UPLOADS ── */}
                  {client.kyc_submissions.length > 0 ? (
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                        Uploaded Documents ({client.kyc_submissions.length} submission{client.kyc_submissions.length > 1 ? 's' : ''})
                      </p>
                      {client.kyc_submissions.map((sub, idx) => (
                        <div key={sub.id} className="mb-3 rounded-xl border border-gray-100 overflow-hidden">
                          {/* Submission header */}
                          <div className="bg-gray-50 px-3 py-2 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-semibold text-gray-700">{sub.doc_type}</p>
                              <p className="text-[10px] text-gray-400">
                                {new Date(sub.submitted_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                              </p>
                            </div>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              sub.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                              sub.status === 'rejected' ? 'bg-red-100 text-red-600' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>{sub.status.toUpperCase()}</span>
                          </div>

                          {/* Document images */}
                          <div className="p-3 grid grid-cols-3 gap-2">
                            {[
                              { url: sub.doc_front_url, label: 'Front' },
                              { url: sub.doc_back_url,  label: 'Back' },
                              { url: sub.selfie_url,    label: 'Selfie' },
                            ].map(({ url, label }) => url ? (
                              <div key={label} className="space-y-1">
                                <p className="text-[10px] text-gray-400 font-medium text-center">{label}</p>
                                <button
                                  onClick={() => setLightbox(url)}
                                  className="w-full h-20 rounded-xl overflow-hidden bg-gray-100 border border-gray-100">
                                  <img src={url} alt={label} className="w-full h-full object-cover" />
                                </button>
                                <a href={url} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center justify-center gap-1 text-[9px] text-blue-600">
                                  <Download size={9} /> Open
                                </a>
                              </div>
                            ) : null)}
                          </div>

                          {/* Approve / Reject actions */}
                          {sub.status === 'pending' && (
                            <div className="flex gap-2 px-3 pb-3">
                              <button
                                onClick={() => approveKyc(sub.id, client.account_number)}
                                disabled={actionId === sub.id}
                                className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50">
                                {actionId === sub.id ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={12} />} Approve
                              </button>
                              <button
                                onClick={() => rejectKyc(sub.id, client.account_number)}
                                disabled={actionId === sub.id}
                                className="flex-1 py-2 rounded-xl bg-red-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50">
                                {actionId === sub.id ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={12} />} Reject
                              </button>
                            </div>
                          )}
                          {sub.status !== 'pending' && (
                            <div className={`mx-3 mb-3 flex items-center gap-2 rounded-xl px-3 py-2 ${sub.status === 'approved' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                              {sub.status === 'approved'
                                ? <CheckCircle size={12} className="text-emerald-600" />
                                : <XCircle size={12} className="text-red-500" />}
                              <p className="text-xs text-gray-600">
                                KYC {sub.status} {sub.reviewed_at ? `· ${new Date(sub.reviewed_at).toLocaleDateString()}` : ''}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-3">
                      <ImageIcon size={14} className="text-gray-400 shrink-0" />
                      <p className="text-xs text-gray-500">No documents uploaded yet.</p>
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
