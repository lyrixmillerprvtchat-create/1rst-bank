'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Loader2, CheckCircle, RefreshCw,
  ArrowLeftRight, Shield, Search, Eye, EyeOff,
  Users, UserPlus, XCircle, ArrowDownLeft,
  ChevronDown, ChevronUp, FileText, Image as ImageIcon,
  MessageSquare, Send, User, ChevronLeft, BadgeCheck,
  KeyRound, Copy, X, Landmark
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
  email?: string
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

interface Transaction {
  id: string
  sender_account: string
  receiver_account: string
  amount: number
  type: string
  description: string
  created_at: string
}

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

interface SupportChat { id: string; user_id: string; status: string; created_at: string; latest?: string; latestAt?: string; full_name?: string }
interface SupportMessage { id: string; sender: 'user' | 'admin'; message: string; attachment_url?: string; attachment_type?: string; created_at: string }

type Screen = 'loading' | 'login' | 'dashboard'
type Section = 'transfers' | 'clients' | 'kyc' | 'signups' | 'assign' | 'support'

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  const isToday = d.toDateString() === new Date().toDateString()
  return isToday
    ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
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

  // Reset password
  const [resetActionId, setResetActionId] = useState<string | null>(null)
  const [resetResult, setResetResult] = useState<{ email: string; full_name: string; resetLink: string } | null>(null)
  const [resetError, setResetError] = useState('')
  const [copied, setCopied] = useState(false)

  const [expandedClient, setExpandedClient] = useState<string | null>(null)
  const [clientTxns, setClientTxns] = useState<Record<string, Transaction[]>>({})
  const [clientTxnLoading, setClientTxnLoading] = useState<string | null>(null)

  const [payerName, setPayerName] = useState('')
  const [toAcc, setToAcc] = useState('')
  const [txAmount, setTxAmount] = useState('')
  const [txNote, setTxNote] = useState('')
  const [txWorking, setTxWorking] = useState(false)
  const [txMsg, setTxMsg] = useState('')

  // KYC tab
  const [kycDocs, setKycDocs] = useState<KycSubmission[]>([])
  const [kycLoading, setKycLoading] = useState(false)
  const [kycActionDocId, setKycActionDocId] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)

  // Support tab
  const [supportChats, setSupportChats] = useState<SupportChat[]>([])
  const [selectedChat, setSelectedChat] = useState<SupportChat | null>(null)
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([])
  const [reply, setReply] = useState('')
  const [replySending, setReplySending] = useState(false)
  const [supportLoading, setSupportLoading] = useState(false)
  const supportBottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const pendingCount = transfers.filter(t => t.status === 'pending').length
  const newSignups = clients.filter(c => {
    const d = new Date(c.created_at)
    return (Date.now() - d.getTime()) < 7 * 24 * 60 * 60 * 1000
  })
  const pendingKyc = kycDocs.filter(k => k.status === 'pending').length

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

  // Support realtime
  useEffect(() => {
    if (screen !== 'dashboard') return
    const supabase = createClient()
    const sub = supabase.channel('ops-support')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, () => loadSupportChats())
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [screen])

  useEffect(() => {
    if (!selectedChat) return
    const supabase = createClient()
    const sub = supabase.channel(`ops-chat-${selectedChat.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `chat_id=eq.${selectedChat.id}` },
        (payload) => setSupportMessages(prev => [...prev, payload.new as SupportMessage])
      )
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [selectedChat])

  useEffect(() => {
    supportBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [supportMessages])

  const loadAll = useCallback(async () => {
    setDataLoading(true)
    setTransfersLoading(true)
    const supabase = createClient()

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, account_number, tier, phone, created_at, status, kyc_status')
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

    const { data: txData } = await supabase
      .from('pending_transfers')
      .select('*')
      .order('created_at', { ascending: false })
    setTransfers(txData ?? [])
    setTransfersLoading(false)
  }, [])

  async function loadKycDocs() {
    setKycLoading(true)
    const res = await fetch('/api/admin/kyc-docs')
    const data = await res.json()
    setKycDocs(data.submissions ?? [])
    setKycLoading(false)
  }

  async function loadSupportChats() {
    setSupportLoading(true)
    const supabase = createClient()
    const { data: chatData } = await supabase.from('support_chats').select('*').order('created_at', { ascending: false })
    if (!chatData) { setSupportLoading(false); return }
    const enriched = await Promise.all(chatData.map(async (chat) => {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('user_id', chat.user_id).single()
      const { data: lastMsg } = await supabase.from('support_messages').select('message, attachment_type, created_at').eq('chat_id', chat.id).order('created_at', { ascending: false }).limit(1).single()
      const latest = lastMsg?.attachment_type ? `[${lastMsg.attachment_type}]` : (lastMsg?.message ?? 'No messages yet')
      return { ...chat, full_name: profile?.full_name ?? 'Unknown', latest, latestAt: lastMsg?.created_at ?? chat.created_at }
    }))
    enriched.sort((a, b) => new Date(b.latestAt!).getTime() - new Date(a.latestAt!).getTime())
    setSupportChats(enriched)
    setSupportLoading(false)
  }

  async function loadSupportMessages(chatId: string) {
    const supabase = createClient()
    const { data } = await supabase.from('support_messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: true })
    if (data) setSupportMessages(data)
  }

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
    } else {
      const d = await res.json()
      alert(d.error ?? 'KYC update failed')
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
    } else {
      const d = await res.json()
      alert(d.error ?? 'Status update failed')
    }
    setStatusActionId(null)
  }

  async function handleResetPassword(client: Client) {
    setResetActionId(client.account_number)
    setResetError('')
    setCopied(false)
    const res = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_number: client.account_number }),
    })
    const data = await res.json()
    if (!res.ok) {
      setResetError(data.error ?? 'Failed to generate reset link')
      setResetActionId(null)
      return
    }
    setResetResult(data)
    setResetActionId(null)
  }

  async function toggleExpand(acc: string) {
    if (expandedClient === acc) { setExpandedClient(null); return }
    setExpandedClient(acc)
    if (!clientTxns[acc]) {
      setClientTxnLoading(acc)
      const res = await fetch(`/api/admin/client-transactions?account_number=${acc}`)
      const data = await res.json()
      setClientTxns(prev => ({ ...prev, [acc]: data.transactions ?? [] }))
      setClientTxnLoading(null)
    }
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

  async function handleKycDecision(id: string, status: 'approved' | 'rejected') {
    setKycActionDocId(id)
    const res = await fetch('/api/admin/kyc-docs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    if (res.ok) {
      setKycDocs(prev => prev.map(k => k.id === id ? { ...k, status } : k))
      const sub = kycDocs.find(k => k.id === id)
      if (sub) {
        setClients(prev => prev.map(c => c.account_number === sub.account_number ? { ...c, kyc_status: status } : c))
      }
    }
    setKycActionDocId(null)
  }

  async function sendSupportReply() {
    if (!reply.trim() || !selectedChat) return
    setReplySending(true)
    const supabase = createClient()
    await supabase.from('support_messages').insert({ chat_id: selectedChat.id, sender: 'admin', message: reply.trim() })
    setReply('')
    setReplySending(false)
  }

  async function handleSupportFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !selectedChat) return
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    form.append('chatId', selectedChat.id)
    const res = await fetch('/api/support-upload', { method: 'POST', body: form })
    const data = await res.json()
    if (res.ok) {
      const supabase = createClient()
      await supabase.from('support_messages').insert({
        chat_id: selectedChat.id,
        sender: 'admin',
        message: '',
        attachment_url: data.url,
        attachment_type: data.type,
      })
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
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
      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="KYC document" className="max-w-full max-h-full rounded-xl object-contain" />
        </div>
      )}

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

        {/* Section tabs — 3+2+2 grid */}
        <div className="grid grid-cols-3 gap-1 mb-1">
          {([
            { key: 'transfers', label: 'Transfers', icon: ArrowLeftRight, badge: pendingCount },
            { key: 'clients', label: 'Clients', icon: Users, badge: 0 },
            { key: 'kyc', label: 'KYC Docs', icon: BadgeCheck, badge: pendingKyc },
          ] as const).map(({ key, label, icon: Icon, badge }) => (
            <button key={key} onClick={() => { setActiveSection(key); if (key === 'kyc') loadKycDocs() }}
              className={`relative py-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-0.5 transition-colors ${activeSection === key ? 'bg-white text-blue-700' : 'bg-white/10 text-white/70'}`}>
              <Icon size={11} /> {label}
              {badge > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold flex items-center justify-center text-white">{badge}</span>
              )}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1 mb-1">
          {([
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
        <div className="grid grid-cols-1 gap-1">
          <button onClick={() => { setActiveSection('support'); loadSupportChats() }}
            className={`relative py-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-0.5 transition-colors ${activeSection === 'support' ? 'bg-yellow-400 text-gray-900' : 'bg-white/10 text-white/70'}`}>
            <MessageSquare size={11} /> Support
          </button>
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
                    {transfer.status === 'approved' ? <CheckCircle size={13} className="text-green-600" /> : <XCircle size={13} className="text-red-500" />}
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
                const isExpanded = expandedClient === client.account_number
                const txns = clientTxns[client.account_number] ?? []
                const isTxnLoading = clientTxnLoading === client.account_number
                return (
                  <div key={client.account_number} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <button onClick={() => toggleExpand(client.account_number)}
                      className="w-full flex items-center justify-between px-4 pt-4 pb-4 text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                          <span className="text-blue-700 font-bold text-sm">{client.full_name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{client.full_name}</p>
                          <p className="text-xs text-gray-400 font-mono">{client.account_number}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-base font-bold text-blue-700">{fmt(client.balance)}</p>
                        {isExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-100 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50/50">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                            (client.status ?? 'active') === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            {(client.status ?? 'active') === 'active' ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                          <div className="flex gap-2">
                            <button onClick={() => handleSetStatus(client, (client.status ?? 'active') === 'active' ? 'suspended' : 'active')}
                              disabled={statusActionId === client.account_number}
                              className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg disabled:opacity-50 ${
                                (client.status ?? 'active') === 'active' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                              {statusActionId === client.account_number
                                ? <Loader2 size={10} className="animate-spin" />
                                : (client.status ?? 'active') === 'active' ? <XCircle size={10} /> : <CheckCircle size={10} />}
                              {(client.status ?? 'active') === 'active' ? 'Mark Inactive' : 'Mark Active'}
                            </button>
                            <button onClick={() => handleResetPassword(client)}
                              disabled={resetActionId === client.account_number}
                              className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-700 disabled:opacity-50">
                              {resetActionId === client.account_number ? <Loader2 size={10} className="animate-spin" /> : <KeyRound size={10} />} Reset Password
                            </button>
                          </div>
                        </div>
                        {isTxnLoading && (
                          <div className="flex justify-center py-5"><Loader2 size={16} className="animate-spin text-blue-600" /></div>
                        )}
                        {!isTxnLoading && txns.length === 0 && (
                          <p className="text-xs text-gray-400 text-center py-5">No transactions yet</p>
                        )}
                        {!isTxnLoading && txns.map((t, i) => {
                          const isCredit = t.receiver_account === client.account_number
                          return (
                            <div key={t.id} className={`flex items-center justify-between px-4 py-2.5 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                              <div className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isCredit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                  {isCredit ? '+' : '-'}
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-700 leading-tight">{t.description || (isCredit ? 'Credit' : 'Debit')}</p>
                                  <p className="text-[10px] text-gray-400">{new Date(t.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                </div>
                              </div>
                              <span className={`text-xs font-bold ${isCredit ? 'text-green-600' : 'text-red-500'}`}>
                                {isCredit ? '+' : '-'}{fmt(t.amount)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
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

        {/* ── KYC DOCS SECTION ─────────────────────────────── */}
        {activeSection === 'kyc' && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">KYC Submissions {!kycLoading && `(${kycDocs.length})`}</p>
              <button onClick={loadKycDocs} className="text-blue-700 text-xs flex items-center gap-1"><RefreshCw size={11} /> Refresh</button>
            </div>

            {kycLoading && [1, 2].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse space-y-3">
                <div className="h-3 w-40 bg-gray-100 rounded" />
                <div className="h-20 bg-gray-50 rounded-xl" />
              </div>
            ))}

            {!kycLoading && kycDocs.length === 0 && (
              <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
                <BadgeCheck size={28} className="mx-auto mb-2 text-gray-200" />
                <p className="text-sm text-gray-400">No KYC submissions yet</p>
              </div>
            )}

            {!kycLoading && kycDocs.map(sub => {
              const statusColor = sub.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : sub.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'
              const isActingDoc = kycActionDocId === sub.id
              return (
                <div key={sub.id} className="bg-white rounded-2xl shadow-sm p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{sub.full_name}</p>
                      <p className="text-xs text-gray-400 font-mono">{sub.account_number}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Doc: <span className="font-medium">{sub.doc_type}</span></p>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${statusColor}`}>{sub.status.toUpperCase()}</span>
                      <p className="text-[10px] text-gray-400 mt-1">{new Date(sub.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>

                  {/* Document thumbnails */}
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {sub.doc_front_url && (
                      <button onClick={() => setLightbox(sub.doc_front_url)} className="relative group">
                        <img src={sub.doc_front_url} alt="Front" className="w-20 h-14 object-cover rounded-lg border border-gray-200" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        <div className="absolute inset-0 bg-black/30 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Eye size={14} className="text-white" />
                        </div>
                        <p className="text-[9px] text-gray-400 text-center mt-0.5">Front</p>
                      </button>
                    )}
                    {sub.doc_back_url && (
                      <button onClick={() => setLightbox(sub.doc_back_url)} className="relative group">
                        <img src={sub.doc_back_url} alt="Back" className="w-20 h-14 object-cover rounded-lg border border-gray-200" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        <div className="absolute inset-0 bg-black/30 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Eye size={14} className="text-white" />
                        </div>
                        <p className="text-[9px] text-gray-400 text-center mt-0.5">Back</p>
                      </button>
                    )}
                    {sub.selfie_url && (
                      <button onClick={() => setLightbox(sub.selfie_url!)} className="relative group">
                        <img src={sub.selfie_url} alt="Selfie" className="w-20 h-14 object-cover rounded-lg border border-gray-200" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        <div className="absolute inset-0 bg-black/30 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Eye size={14} className="text-white" />
                        </div>
                        <p className="text-[9px] text-gray-400 text-center mt-0.5">Selfie</p>
                      </button>
                    )}
                    {!sub.doc_front_url && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <FileText size={14} />
                        <span className="text-xs">Documents stored (not previewable)</span>
                      </div>
                    )}
                  </div>

                  {sub.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleKycDecision(sub.id, 'approved')} disabled={isActingDoc}
                        className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50">
                        {isActingDoc ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />} Approve KYC
                      </button>
                      <button onClick={() => handleKycDecision(sub.id, 'rejected')} disabled={isActingDoc}
                        className="flex-1 py-2 rounded-xl bg-red-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50">
                        {isActingDoc ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />} Reject KYC
                      </button>
                    </div>
                  )}
                  {sub.status !== 'pending' && (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${sub.status === 'approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                      {sub.status === 'approved' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      KYC {sub.status} — also updated on client profile
                    </div>
                  )}
                </div>
              )
            })}
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
            {dataLoading && <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-blue-700" /></div>}
            {!dataLoading && clients.length < 1 && (
              <p className="text-sm text-gray-400 text-center py-6">No clients yet.</p>
            )}
            {!dataLoading && clients.length >= 1 && (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Payer (From)</label>
                  <input type="text" value={payerName} onChange={e => { setPayerName(e.target.value); setTxMsg('') }}
                    placeholder="e.g. John Smith, Chase Bank, Cash…"
                    className="mt-1 w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Payee (To)</label>
                  <select value={toAcc} onChange={e => { setToAcc(e.target.value); setTxMsg('') }}
                    className="mt-1 w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select payee…</option>
                    {clients.map(c => <option key={c.account_number} value={c.account_number}>{c.full_name} — {c.account_number} ({fmt(c.balance)})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Amount ($)</label>
                  <input type="number" min="0.01" step="0.01" value={txAmount} onChange={e => { setTxAmount(e.target.value); setTxMsg('') }} placeholder="0.00"
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
                <button onClick={handleAssignTransfer} disabled={!payerName || !toAcc || !txAmount || txWorking}
                  className="w-full py-3 rounded-xl bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-blue-800 transition-colors">
                  {txWorking ? <><Loader2 size={15} className="animate-spin" /> Processing…</> : <><ArrowLeftRight size={15} /> Execute Transfer</>}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── SUPPORT SECTION ───────────────────────────────── */}
        {activeSection === 'support' && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ minHeight: '520px' }}>
            <div className="flex h-full" style={{ minHeight: '520px' }}>
              {/* Chat list */}
              <div className={`${selectedChat ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-64 border-r border-gray-100`}>
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={16} className="text-blue-700" />
                    <span className="text-sm font-semibold text-gray-800">Support Inbox</span>
                    <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{supportChats.length}</span>
                  </div>
                  <button onClick={loadSupportChats} className="text-gray-400 hover:text-blue-700">
                    <RefreshCw size={13} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {supportLoading && <div className="flex justify-center py-6"><Loader2 size={16} className="animate-spin text-blue-600" /></div>}
                  {!supportLoading && supportChats.length === 0 && (
                    <div className="text-center text-gray-400 text-xs mt-8 px-4">
                      <MessageSquare size={24} className="mx-auto mb-2 opacity-40" />
                      No support messages yet
                    </div>
                  )}
                  {!supportLoading && supportChats.map(chat => (
                    <button key={chat.id} onClick={() => { setSelectedChat(chat); loadSupportMessages(chat.id) }}
                      className={`w-full px-4 py-3 text-left border-b border-gray-50 hover:bg-gray-50 transition-colors ${selectedChat?.id === chat.id ? 'bg-blue-50' : ''}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <User size={12} className="text-gray-400" />
                        </div>
                        <span className="text-xs font-semibold text-gray-800 truncate flex-1">{chat.full_name}</span>
                        {chat.latestAt && <span className="text-[10px] text-gray-400 flex-shrink-0">{fmtTime(chat.latestAt)}</span>}
                      </div>
                      <p className="text-xs text-gray-400 truncate pl-9">{chat.latest}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message thread */}
              {selectedChat ? (
                <div className="flex flex-col flex-1">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                    <button onClick={() => setSelectedChat(null)} className="md:hidden text-gray-500">
                      <ChevronLeft size={18} />
                    </button>
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                      <User size={12} className="text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{selectedChat.full_name}</p>
                      <p className="text-xs text-gray-400">Customer Support</p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-gray-50" style={{ maxHeight: '360px' }}>
                    {supportMessages.map(m => {
                      const isAdmin = m.sender === 'admin'
                      return (
                        <div key={m.id} className={`flex items-end gap-1.5 ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                          {!isAdmin && (
                            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <User size={11} className="text-gray-400" />
                            </div>
                          )}
                          <div className="flex flex-col max-w-[75%]">
                            <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed ${isAdmin ? 'bg-blue-700 text-white rounded-br-sm' : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm'}`}>
                              {m.attachment_url && m.attachment_type === 'image' && (
                                <img src={m.attachment_url} alt="attachment" className="rounded-lg max-w-full mb-1 cursor-pointer" style={{ maxHeight: 180 }} onClick={() => setLightbox(m.attachment_url!)} />
                              )}
                              {m.attachment_url && m.attachment_type === 'document' && (
                                <a href={m.attachment_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1.5 underline text-xs ${isAdmin ? 'text-blue-200' : 'text-blue-700'}`}>
                                  <FileText size={12} /> View Document
                                </a>
                              )}
                              {m.message && m.message}
                            </div>
                            <span className={`text-[10px] text-gray-400 mt-0.5 ${isAdmin ? 'text-right' : 'text-left'}`}>{fmtTime(m.created_at)}</span>
                          </div>
                          {isAdmin && (
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <Landmark size={11} className="text-blue-700" />
                            </div>
                          )}
                        </div>
                      )
                    })}
                    <div ref={supportBottomRef} />
                  </div>

                  <div className="px-3 py-3 border-t border-gray-100 bg-white flex gap-2 items-center">
                    <input hidden ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx" onChange={handleSupportFileUpload} />
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                      className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 disabled:opacity-40 flex-shrink-0">
                      {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                    </button>
                    <input value={reply} onChange={e => setReply(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendSupportReply()}
                      placeholder="Reply to customer..."
                      className="flex-1 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <button onClick={sendSupportReply} disabled={!reply.trim() || replySending}
                      className="w-9 h-9 rounded-xl bg-blue-700 flex items-center justify-center text-white disabled:opacity-40">
                      {replySending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="hidden md:flex flex-1 items-center justify-center text-gray-300">
                  <div className="text-center">
                    <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Select a conversation</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Reset Password Error Toast */}
      {resetError && (
        <div className="fixed bottom-5 left-5 right-5 bg-red-50 border border-red-200 text-red-600 text-xs font-medium rounded-xl px-4 py-3 flex items-center justify-between shadow-lg z-50">
          {resetError}
          <button onClick={() => setResetError('')}><X size={14} /></button>
        </div>
      )}

      {/* Reset Password Result Modal */}
      {resetResult && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50" onClick={() => setResetResult(null)}>
          <div className="bg-white rounded-t-3xl p-5 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center">
                  <KeyRound size={16} className="text-purple-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Password Reset Link</p>
                  <p className="text-xs text-gray-400">{resetResult.full_name} · {resetResult.email}</p>
                </div>
              </div>
              <button onClick={() => setResetResult(null)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 break-all font-mono">
              {resetResult.resetLink}
            </div>
            <p className="text-[11px] text-gray-400">Send this link to the client. It lets them set a new password and expires per your Supabase Auth settings.</p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(resetResult.resetLink)
                setCopied(true)
              }}
              className="w-full py-3 rounded-xl bg-purple-700 text-white text-sm font-semibold flex items-center justify-center gap-2">
              {copied ? <CheckCircle size={16} /> : <Copy size={16} />} {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
