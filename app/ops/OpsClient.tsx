'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Plus, Minus, Loader2, CheckCircle, RefreshCw,
  ArrowLeftRight, Shield, Search, Eye, EyeOff,
  Users, UserPlus, Clock, XCircle, ArrowDownLeft
} from 'lucide-react'

interface Client {
  user_id: string
  full_name: string
  account_number: string
  tier: string
  phone: string
  balance: number
  created_at: string
  status: string
  kyc_status: string
}

interface PendingTransfer {
  id: string
  from_account: string
  from_name: string
  to_account: string
  to_name: string
  amount: number
  description: string
  status: string
  created_at: string
}

type Screen = 'loading' | 'login' | 'dashboard'
type Section = 'transfers' | 'clients' | 'signups' | 'assign'

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden animate-pulse">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-100" />
          <div className="space-y-2">
            <div className="h-3 w-28 bg-gray-100 rounded" />
            <div className="h-2.5 w-20 bg-gray-100 rounded" />
          </div>
        </div>
        <div className="h-5 w-20 bg-gray-100 rounded" />
      </div>
      <div className="border-t border-gray-50 px-4 py-3 bg-gray-50/50">
        <div className="flex gap-2">
          <div className="flex-1 h-9 bg-gray-100 rounded-xl" />
          <div className="w-20 h-9 bg-gray-100 rounded-xl" />
          <div className="w-20 h-9 bg-gray-100 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export default function OpsClient() {
  const [screen, setScreen] = useState<Screen>('loading')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loginErr, setLoginErr] = useState('')
  const [loginWorking, setLoginWorking] = useState(false)
  const [activeSection, setActiveSection] = useState<Section>('transfers')

  const [clients, setClients] = useState<Client[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  const [filter, setFilter] = useState('')

  const [transfers, setTransfers] = useState<PendingTransfer[]>([])
  const [transfersLoading, setTransfersLoading] = useState(false)
  const [transferActionId, setTransferActionId] = useState<string | null>(null)

  const [adjustState, setAdjustState] = useState<Record<string, { amount: string; working: boolean; msg: string }>>({})
  const [statusActionId, setStatusActionId] = useState<string | null>(null)
  const [kycActionId, setKycActionId] = useState<string | null>(null)

  const [payerName, setPayerName] = useState('')
  const [toAcc, setToAcc] = useState('')
  const [txAmount, setTxAmount] = useState('')
  const [txNote, setTxNote] = useState('')
  const [txWorking, setTxWorking] = useState(false)
  const [txMsg, setTxMsg] = useState('')

  const pendingCount = transfers.filter(t => t.status === 'pending').length
  const newSignups = clients.filter(c => {
    const d = new Date(c.created_at)
    return (Date.now() - d.getTime()) < 7 * 24 * 60 * 60 * 1000
  })

  useEffect(() => {
    async function checkSession() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setScreen('login'); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single()
      if (profile?.role === 'admin') {
        setScreen('dashboard')
        loadAll()
      } else {
        setScreen('login')
      }
    }
    checkSession()
  }, [])

  // Realtime: new pending transfer arrives
  useEffect(() => {
    if (screen !== 'dashboard') return
    const supabase = createClient()
    const sub = supabase.channel('ops-transfers')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pending_transfers' }, (payload) => {
        setTransfers(prev => [payload.new as PendingTransfer, ...prev])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pending_transfers' }, (payload) => {
        setTransfers(prev => prev.map(t => t.id === payload.new.id ? payload.new as PendingTransfer : t))
      })
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [screen])

  const loadAll = useCallback(async () => {
    setDataLoading(true)
    setTransfersLoading(true)
    const supabase = createClient()

    // Load clients + balances
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, account_number, tier, phone, created_at')
      .neq('role', 'admin')
      .order('created_at', { ascending: false })

    if (profiles) {
      const withBalances = await Promise.all(profiles.map(async (p) => {
        const { data: acc } = await supabase.from('accounts').select('balance').eq('account_number', p.account_number).single()
        return { ...p, balance: acc?.balance ?? 0 } as Client
      }))
      setClients(withBalances)
    }
    setDataLoading(false)

    // Load transfers
    const { data: txData } = await supabase
      .from('pending_transfers')
      .select('*')
      .order('created_at', { ascending: false })
    setTransfers(txData ?? [])
    setTransfersLoading(false)
  }, [])

  async function handleLogin() {
    if (!password) return
    setLoginWorking(true)
    setLoginErr('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email: 'admin@1rstbank.com', password })
    if (error) { setLoginErr('Incorrect password'); setLoginWorking(false); return }
    setScreen('dashboard')
    loadAll()
    setLoginWorking(false)
  }

  async function handleTransferDecision(transfer: PendingTransfer, approve: boolean) {
    setTransferActionId(transfer.id)
    const res = await fetch('/api/admin/transfer-decision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transferId: transfer.id, action: approve ? 'approve' : 'decline' }),
    })
    if (!res.ok) {
      const { error } = await res.json()
      alert(error ?? 'Something went wrong')
      setTransferActionId(null)
      return
    }
    if (approve) {
      setClients(prev => prev.map(c => {
        if (c.account_number === transfer.from_account) return { ...c, balance: c.balance - transfer.amount }
        if (c.account_number === transfer.to_account) return { ...c, balance: c.balance + transfer.amount }
        return c
      }))
    }
    setTransfers(prev => prev.map(t => t.id === transfer.id ? { ...t, status: approve ? 'approved' : 'declined' } : t))
    setTransferActionId(null)
  }

  function getAdj(acc: string) {
    return adjustState[acc] ?? { amount: '', working: false, msg: '' }
  }
  function setAdj(acc: string, patch: Partial<{ amount: string; working: boolean; msg: string }>) {
    setAdjustState(prev => ({ ...prev, [acc]: { ...getAdj(acc), ...patch } }))
  }

  async function handleAdjust(client: Client, type: 'credit' | 'debit') {
    const adj = getAdj(client.account_number)
    const val = parseFloat(adj.amount)
    if (!val || val <= 0) return
    setAdj(client.account_number, { working: true, msg: '' })
    const res = await fetch('/api/admin/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_number: client.account_number, amount: val, type }),
    })
    const data = await res.json()
    if (!res.ok) { setAdj(client.account_number, { working: false, msg: `Error: ${data.error ?? 'Failed'}` }); return }
    const newBal = type === 'credit' ? client.balance + val : client.balance - val
    setClients(prev => prev.map(c => c.account_number === client.account_number ? { ...c, balance: newBal } : c))
    setAdj(client.account_number, { working: false, amount: '', msg: `${type === 'credit' ? '+' : '-'}${fmt(val)} done` })
    setTimeout(() => setAdj(client.account_number, { msg: '' }), 3000)
  }

  async function handleSetKyc(client: Client, kyc_status: string) {
    setKycActionId(client.account_number)
    const res = await fetch('/api/admin/set-kyc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_number: client.account_number, kyc_status }),
    })
    if (res.ok) {
      setClients(prev => prev.map(c => c.account_number === client.account_number ? { ...c, kyc_status } : c))
    }
    setKycActionId(null)
  }

  async function handleSetStatus(client: Client, newStatus: string) {
    setStatusActionId(client.account_number)
    const res = await fetch('/api/admin/set-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_number: client.account_number, status: newStatus }),
    })
    if (res.ok) {
      setClients(prev => prev.map(c => c.account_number === client.account_number ? { ...c, status: newStatus } : c))
    }
    setStatusActionId(null)
  }

  async function handleAssignTransfer() {
    const val = parseFloat(txAmount)
    if (!payerName || !toAcc || !val) return
    setTxWorking(true); setTxMsg('')
    const toClient = clients.find(c => c.account_number === toAcc)!
    const res = await fetch('/api/admin/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_number: toAcc, amount: val, type: 'credit', description: `From ${payerName}${txNote ? ` — ${txNote}` : ''}` }),
    })
    const data = await res.json()
    if (!res.ok) { setTxMsg(`Failed: ${data.error ?? 'Failed'}`); setTxWorking(false); return }
    setClients(prev => prev.map(c => c.account_number === toAcc ? { ...c, balance: c.balance + val } : c))
    setTxMsg(`${fmt(val)} credited to ${toClient.full_name} from ${payerName}`)
    setTxAmount(''); setTxNote(''); setPayerName(''); setToAcc('')
    setTxWorking(false)
    setTimeout(() => setTxMsg(''), 4000)
  }

  const filtered = clients.filter(c =>
    c.full_name.toLowerCase().includes(filter.toLowerCase()) ||
    c.account_number.includes(filter)
  )

  // ── LOADING ────────────────────────────────────────────────────
  if (screen === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-yellow-400/20 flex items-center justify-center">
            <Shield size={22} className="text-yellow-400" />
          </div>
          <Loader2 size={20} className="animate-spin text-white/50" />
        </div>
      </div>
    )
  }

  // ── LOGIN ──────────────────────────────────────────────────────
  if (screen === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-full bg-yellow-400/20 flex items-center justify-center mb-3">
              <Shield size={26} className="text-yellow-400" />
            </div>
            <h1 className="text-white text-2xl font-bold">Ops Console</h1>
            <p className="text-gray-400 text-sm mt-1">1rst Bank · Admin Access</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Admin Password</label>
              <div className="relative mt-1">
                <input type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => { setPassword(e.target.value); setLoginErr('') }}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="Enter password"
                  className="w-full px-4 py-3 pr-10 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 text-sm" />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {loginErr && <p className="text-red-400 text-xs mt-1.5">{loginErr}</p>}
            </div>
            <button onClick={handleLogin} disabled={!password || loginWorking}
              className="w-full py-3 rounded-xl bg-yellow-400 text-gray-900 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-yellow-300 transition-colors">
              {loginWorking ? <Loader2 size={16} className="animate-spin" /> : 'Enter Console'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── DASHBOARD ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }} className="px-5 pt-12 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-yellow-400/20 flex items-center justify-center">
              <Shield size={17} className="text-yellow-400" />
            </div>
            <div>
              <h1 className="text-white text-lg font-bold">Ops Console</h1>
              <p className="text-gray-400 text-xs">1rst Bank · All Controls</p>
            </div>
          </div>
          <button onClick={loadAll} className="text-white/50 hover:text-white transition-colors">
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Section tabs */}
        <div className="grid grid-cols-4 gap-1">
          {([
            { key: 'transfers', label: 'Transfers', icon: ArrowLeftRight, badge: pendingCount },
            { key: 'clients', label: 'Clients', icon: Users, badge: 0 },
            { key: 'signups', label: 'Sign-ups', icon: UserPlus, badge: newSignups.length },
            { key: 'assign', label: 'Assign', icon: ArrowDownLeft, badge: 0 },
          ] as const).map(({ key, label, icon: Icon, badge }) => (
            <button key={key} onClick={() => setActiveSection(key)}
              className={`relative py-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-0.5 transition-colors ${activeSection === key ? 'bg-white text-blue-700' : 'bg-white/10 text-white/70'}`}>
              <Icon size={11} /> {label}
              {badge > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold flex items-center justify-center text-white">{badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-5 space-y-4 pb-16 max-w-2xl mx-auto">

        {/* ── TRANSFERS SECTION ─────────────────────────────── */}
        {activeSection === 'transfers' && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Transfer Requests {!transfersLoading && `(${pendingCount} pending)`}
              </p>
              <button onClick={loadAll} className="text-blue-700 text-xs flex items-center gap-1"><RefreshCw size={11} /> Refresh</button>
            </div>

            {transfersLoading && [1, 2].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse space-y-3">
                <div className="flex justify-between">
                  <div className="h-3 w-32 bg-gray-100 rounded" />
                  <div className="h-5 w-16 bg-gray-100 rounded-full" />
                </div>
                <div className="h-16 bg-gray-50 rounded-xl" />
                <div className="flex gap-2">
                  <div className="flex-1 h-10 bg-gray-100 rounded-xl" />
                  <div className="flex-1 h-10 bg-gray-100 rounded-xl" />
                </div>
              </div>
            ))}

            {!transfersLoading && transfers.length === 0 && (
              <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
                <ArrowLeftRight size={28} className="mx-auto mb-2 text-gray-200" />
                <p className="text-sm text-gray-400">No transfer requests yet</p>
              </div>
            )}

            {!transfersLoading && transfers.map(transfer => (
              <div key={transfer.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{transfer.from_name}</p>
                    <p className="text-xs text-gray-400 font-mono">{transfer.from_account}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    transfer.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    transfer.status === 'approved' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-600'}`}>
                    {transfer.status.toUpperCase()}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-xl px-3 py-2.5 space-y-1.5 mb-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">To</span>
                    <span className="font-medium text-gray-700">{transfer.to_name} · <span className="font-mono">{transfer.to_account}</span></span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Amount</span>
                    <span className="font-bold text-blue-700 text-sm">{fmt(transfer.amount)}</span>
                  </div>
                  {transfer.description && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Note</span>
                      <span className="text-gray-600">{transfer.description}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">Time</span>
                    <span className="text-gray-500">{new Date(transfer.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>
                </div>

                {transfer.status === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => handleTransferDecision(transfer, true)} disabled={transferActionId === transfer.id}
                      className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50">
                      {transferActionId === transfer.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={13} />} Approve
                    </button>
                    <button onClick={() => handleTransferDecision(transfer, false)} disabled={transferActionId === transfer.id}
                      className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50">
                      {transferActionId === transfer.id ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={13} />} Decline
                    </button>
                  </div>
                )}

                {transfer.status !== 'pending' && (
                  <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${transfer.status === 'approved' ? 'bg-green-50' : 'bg-red-50'}`}>
                    {transfer.status === 'approved'
                      ? <CheckCircle size={13} className="text-green-600" />
                      : <XCircle size={13} className="text-red-500" />}
                    <p className="text-xs font-medium text-gray-600">
                      {transfer.status === 'approved' ? 'Approved — funds moved.' : 'Declined by admin.'}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* ── CLIENTS SECTION ───────────────────────────────── */}
        {activeSection === 'clients' && (
          <>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={filter} onChange={e => setFilter(e.target.value)}
                placeholder="Search name or account…"
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              All Clients {!dataLoading && `(${filtered.length})`}
            </p>

            <div className="space-y-3">
              {dataLoading && [1, 2, 3].map(i => <SkeletonCard key={i} />)}
              {!dataLoading && filtered.map(client => {
                const adj = getAdj(client.account_number)
                const status = client.status ?? 'active'
                const kyc = client.kyc_status ?? 'pending'
                const statusColor = status === 'active' ? 'bg-green-100 text-green-700' : status === 'suspended' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'
                const kycColor = kyc === 'approved' ? 'bg-emerald-100 text-emerald-700' : kyc === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                const isActing = statusActionId === client.account_number
                const isKycActing = kycActionId === client.account_number
                return (
                  <div key={client.account_number} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-4 pt-4 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                          <span className="text-blue-700 font-bold text-sm">{client.full_name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{client.full_name}</p>
                          <p className="text-xs text-gray-400 font-mono">{client.account_number}</p>
                          <p className="text-[10px] text-gray-400">{client.tier} · {client.phone || 'No phone'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold text-blue-700">{fmt(client.balance)}</p>
                        <div className="flex gap-1 justify-end mt-0.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${kycColor}`}>KYC: {kyc.toUpperCase()}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor}`}>{status.toUpperCase()}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">Joined {new Date(client.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                      </div>
                    </div>
                    <div className="border-t border-gray-50 px-4 py-3 bg-gray-50/50 space-y-2">
                      <div className="flex gap-2 items-center">
                        <input type="number" min="0.01" step="0.01" value={adj.amount}
                          onChange={e => setAdj(client.account_number, { amount: e.target.value, msg: '' })}
                          placeholder="Amount"
                          className="flex-1 px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <button onClick={() => handleAdjust(client, 'credit')} disabled={!adj.amount || adj.working}
                          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-green-600 text-white text-xs font-semibold disabled:opacity-40 hover:bg-green-700 transition-colors">
                          {adj.working ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Credit
                        </button>
                        <button onClick={() => handleAdjust(client, 'debit')} disabled={!adj.amount || adj.working}
                          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-red-500 text-white text-xs font-semibold disabled:opacity-40 hover:bg-red-600 transition-colors">
                          {adj.working ? <Loader2 size={12} className="animate-spin" /> : <Minus size={12} />} Debit
                        </button>
                      </div>
                      {adj.msg && (
                        <p className={`text-xs font-medium flex items-center gap-1 ${adj.msg.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>
                          {!adj.msg.startsWith('Error') && <CheckCircle size={11} />} {adj.msg}
                        </p>
                      )}
                      {kyc !== 'approved' && (
                        <div className="flex gap-2">
                          <button onClick={() => handleSetKyc(client, 'approved')} disabled={isKycActing}
                            className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 disabled:opacity-50">
                            {isKycActing ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle size={10} />} Approve KYC
                          </button>
                          {kyc !== 'rejected' && (
                            <button onClick={() => handleSetKyc(client, 'rejected')} disabled={isKycActing}
                              className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 disabled:opacity-50">
                              {isKycActing ? <Loader2 size={10} className="animate-spin" /> : <XCircle size={10} />} Reject KYC
                            </button>
                          )}
                        </div>
                      )}
                      <div className="flex gap-2">
                        {status !== 'active' && (
                          <button onClick={() => handleSetStatus(client, 'active')} disabled={isActing}
                            className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 disabled:opacity-50">
                            {isActing ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle size={10} />} Activate
                          </button>
                        )}
                        {status !== 'suspended' && (
                          <button onClick={() => handleSetStatus(client, 'suspended')} disabled={isActing}
                            className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-yellow-50 text-yellow-700 disabled:opacity-50">
                            {isActing ? <Loader2 size={10} className="animate-spin" /> : <Clock size={10} />} Suspend
                          </button>
                        )}
                        {status !== 'frozen' && (
                          <button onClick={() => handleSetStatus(client, 'frozen')} disabled={isActing}
                            className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 disabled:opacity-50">
                            {isActing ? <Loader2 size={10} className="animate-spin" /> : <XCircle size={10} />} Freeze
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              {!dataLoading && filtered.length === 0 && (
                <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
                  <p className="text-sm text-gray-400">{clients.length === 0 ? 'No clients yet' : `No match for "${filter}"`}</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── SIGN-UPS SECTION ──────────────────────────────── */}
        {activeSection === 'signups' && (
          <>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Recent Sign-ups (last 7 days) {!dataLoading && `· ${newSignups.length} new`}
            </p>

            {dataLoading && [1, 2].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100" />
                  <div className="space-y-2 flex-1">
                    <div className="h-3 w-36 bg-gray-100 rounded" />
                    <div className="h-2.5 w-24 bg-gray-100 rounded" />
                  </div>
                  <div className="h-4 w-16 bg-gray-100 rounded" />
                </div>
              </div>
            ))}

            {!dataLoading && newSignups.length === 0 && (
              <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
                <UserPlus size={28} className="mx-auto mb-2 text-gray-200" />
                <p className="text-sm text-gray-400">No new sign-ups in the last 7 days</p>
              </div>
            )}

            {!dataLoading && newSignups.map(client => (
              <div key={client.account_number} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <span className="text-green-700 font-bold text-sm">{client.full_name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">{client.full_name}</p>
                  <p className="text-xs text-gray-400 font-mono">{client.account_number} · {client.phone || 'No phone'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-green-600">{fmt(client.balance)}</p>
                  <p className="text-[10px] text-gray-400">{new Date(client.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              </div>
            ))}

            {/* All clients below new ones */}
            {!dataLoading && clients.length > newSignups.length && (
              <>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-2">All Clients ({clients.length})</p>
                {clients.filter(c => !newSignups.includes(c)).map(client => (
                  <div key={client.account_number} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <span className="text-blue-700 font-bold text-sm">{client.full_name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">{client.full_name}</p>
                      <p className="text-xs text-gray-400 font-mono">{client.account_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-blue-700">{fmt(client.balance)}</p>
                      <p className="text-[10px] text-gray-400">{new Date(client.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {/* ── ASSIGN TRANSFER SECTION ───────────────────────── */}
        {activeSection === 'assign' && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                <ArrowLeftRight size={13} className="text-blue-700" />
              </div>
              <h2 className="text-sm font-bold text-gray-800">Assign Transfer</h2>
            </div>

            {dataLoading && (
              <div className="flex justify-center py-10">
                <Loader2 size={20} className="animate-spin text-blue-700" />
              </div>
            )}

            {!dataLoading && clients.length < 2 && (
              <p className="text-sm text-gray-400 text-center py-6">Need at least 2 clients to assign a transfer.</p>
            )}

            {!dataLoading && clients.length >= 2 && (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Payer (From)</label>
                  <input
                    type="text"
                    value={payerName}
                    onChange={e => { setPayerName(e.target.value); setTxMsg('') }}
                    placeholder="e.g. John Smith, Chase Bank, Cash…"
                    className="mt-1 w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Payee (To)</label>
                  <select value={toAcc} onChange={e => { setToAcc(e.target.value); setTxMsg('') }}
                    className="mt-1 w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select payee…</option>
                    {clients.map(c => <option key={c.account_number} value={c.account_number} >{c.full_name} — {c.account_number} ({fmt(c.balance)})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Amount ($)</label>
                  <input type="number" min="0.01" step="0.01" value={txAmount}
                    onChange={e => { setTxAmount(e.target.value); setTxMsg('') }} placeholder="0.00"
                    className="mt-1 w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Narration (optional)</label>
                  <input type="text" value={txNote} onChange={e => setTxNote(e.target.value)} placeholder="e.g. Loan repayment"
                    className="mt-1 w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {txMsg && (
                  <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium ${txMsg.startsWith('Failed') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                    {!txMsg.startsWith('Failed') && <CheckCircle size={13} />} {txMsg}
                  </div>
                )}
                <button onClick={handleAssignTransfer}
                  disabled={!payerName || !toAcc || !txAmount || txWorking}
                  className="w-full py-3 rounded-xl bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-blue-800 transition-colors">
                  {txWorking ? <><Loader2 size={15} className="animate-spin" /> Processing…</> : <><ArrowLeftRight size={15} /> Execute Transfer</>}
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
