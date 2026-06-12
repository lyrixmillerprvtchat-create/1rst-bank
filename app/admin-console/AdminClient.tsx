'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Search, Plus, Minus, Loader2, CheckCircle, Shield, MessageSquare, Users, RefreshCw, ChevronRight, TrendingUp, X, ArrowLeftRight, Clock, XCircle, ExternalLink } from 'lucide-react'
import AdminSupportInbox from '@/components/AdminSupportInbox'
import Link from 'next/link'

interface Profile { full_name: string; account_number: string; tier: string; role: string; phone: string; created_at: string }
interface ClientWithBalance extends Profile { balance: number }
interface FoundUser { name: string; account: string; balance: number }
interface UpgradeRequest { id: string; user_id: string; full_name: string; account_number: string; current_tier: string; requested_tier: string; status: string; requested_at: string }
interface PendingTransfer { id: string; from_account: string; from_name: string; to_account: string; to_name: string; amount: number; description: string; status: string; created_at: string }

export default function AdminClient({ defaultTab }: { defaultTab?: string }) {
  type TabType = 'clients' | 'accounts' | 'support' | 'upgrades' | 'transfers'
  const validTabs: TabType[] = ['clients', 'accounts', 'support', 'upgrades', 'transfers']
  const [tab, setTab] = useState<TabType>(
    validTabs.includes(defaultTab as TabType) ? (defaultTab as TabType) : 'clients'
  )

  // Clients list state
  const [clients, setClients] = useState<ClientWithBalance[]>([])
  const [clientsLoading, setClientsLoading] = useState(false)
  const [selectedClient, setSelectedClient] = useState<ClientWithBalance | null>(null)

  // Account adjustment state
  const [searchAccount, setSearchAccount] = useState('')
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Upgrade requests state
  const [upgradeRequests, setUpgradeRequests] = useState<UpgradeRequest[]>([])
  const [upgradesLoading, setUpgradesLoading] = useState(false)
  const [upgradeActionId, setUpgradeActionId] = useState<string | null>(null)

  // Pending transfers state
  const [transfers, setTransfers] = useState<PendingTransfer[]>([])
  const [transfersLoading, setTransfersLoading] = useState(false)
  const [transferActionId, setTransferActionId] = useState<string | null>(null)
  const pendingCount = transfers.filter(t => t.status === 'pending').length

  useEffect(() => {
    if (tab === 'clients') loadClients()
    if (tab === 'upgrades') loadUpgradeRequests()
    if (tab === 'transfers') loadTransfers()
  }, [tab])

  // Realtime: new pending transfer badge
  useEffect(() => {
    const supabase = createClient()
    const sub = supabase.channel('admin-transfers')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pending_transfers' }, (payload) => {
        setTransfers(prev => [payload.new as PendingTransfer, ...prev])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pending_transfers' }, (payload) => {
        setTransfers(prev => prev.map(t => t.id === payload.new.id ? payload.new as PendingTransfer : t))
      })
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [])

  async function loadTransfers() {
    setTransfersLoading(true)
    const supabase = createClient()
    const { data } = await supabase.from('pending_transfers').select('*').order('created_at', { ascending: false })
    setTransfers(data ?? [])
    setTransfersLoading(false)
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

  async function loadUpgradeRequests() {
    setUpgradesLoading(true)
    const supabase = createClient()
    const { data } = await supabase.from('upgrade_requests').select('*').order('requested_at', { ascending: false })
    setUpgradeRequests(data ?? [])
    setUpgradesLoading(false)
  }

  async function handleUpgradeDecision(req: UpgradeRequest, approve: boolean) {
    setUpgradeActionId(req.id)
    const supabase = createClient()
    if (approve) {
      await supabase.from('profiles').update({ tier: req.requested_tier }).eq('account_number', req.account_number)
      setClients(prev => prev.map(c => c.account_number === req.account_number ? { ...c, tier: req.requested_tier } : c))
    }
    await supabase.from('upgrade_requests').update({ status: approve ? 'approved' : 'rejected', reviewed_at: new Date().toISOString() }).eq('id', req.id)
    setUpgradeRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: approve ? 'approved' : 'rejected' } : r))
    setUpgradeActionId(null)
  }

  async function loadClients() {
    setClientsLoading(true)
    const supabase = createClient()
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .neq('role', 'admin')
      .order('created_at', { ascending: false })

    if (!profileData) { setClientsLoading(false); return }

    const withBalances = await Promise.all(profileData.map(async (p: Profile) => {
      const { data: acc } = await supabase.from('accounts').select('balance').eq('account_number', p.account_number).single()
      return { ...p, balance: acc?.balance ?? 0 }
    }))
    setClients(withBalances)
    setClientsLoading(false)
  }

  function openClientAdjust(client: ClientWithBalance) {
    setFoundUser({ name: client.full_name, account: client.account_number, balance: client.balance })
    setAmount('')
    setError('')
    setSuccess('')
    setTab('accounts')
    setSearchAccount(client.account_number)
  }

  async function searchUser() {
    setLoading(true)
    setError('')
    setFoundUser(null)
    setSuccess('')
    const supabase = createClient()
    const { data: profileData } = await supabase.from('profiles').select('full_name, account_number').eq('account_number', searchAccount).single()
    if (!profileData) { setError('Account not found'); setLoading(false); return }
    const { data: accountData } = await supabase.from('accounts').select('balance').eq('account_number', searchAccount).single()
    setFoundUser({ name: profileData.full_name, account: profileData.account_number, balance: accountData?.balance ?? 0 })
    setLoading(false)
  }

  async function handleAction(type: 'credit' | 'debit') {
    if (!foundUser || !amount) return
    setActionLoading(true)
    setError('')
    setSuccess('')
    const val = parseFloat(amount)
    const res = await fetch('/api/admin/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_number: foundUser.account, amount: val, type }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed'); setActionLoading(false); return }
    const newBalance = type === 'credit' ? foundUser.balance + val : foundUser.balance - val
    setFoundUser({ ...foundUser, balance: newBalance })
    setClients(prev => prev.map(c => c.account_number === foundUser.account ? { ...c, balance: newBalance } : c))
    setSuccess(`$${val.toLocaleString()} ${type === 'credit' ? 'credited to' : 'debited from'} ${foundUser.name}'s account`)
    setAmount('')
    setActionLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="px-5 pt-12 pb-6" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-yellow-400/20 flex items-center justify-center">
            <Shield size={18} className="text-yellow-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-white text-xl font-bold">The Controller</h1>
            <p className="text-gray-400 text-xs">Admin Console · 1rst Bank</p>
          </div>
          <Link href="/manager" className="flex items-center gap-1 text-yellow-400 text-xs font-semibold bg-yellow-400/10 px-3 py-1.5 rounded-xl hover:bg-yellow-400/20 transition-colors">
            <ExternalLink size={11} /> Manager
          </Link>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-5 gap-1">
          <button onClick={() => setTab('clients')}
            className={`py-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-0.5 transition-colors ${tab === 'clients' ? 'bg-white text-blue-700' : 'bg-white/10 text-white/70'}`}>
            <Users size={11} /> Clients
          </button>
          <button onClick={() => setTab('transfers')}
            className={`py-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-0.5 transition-colors relative ${tab === 'transfers' ? 'bg-white text-blue-700' : 'bg-white/10 text-white/70'}`}>
            <ArrowLeftRight size={11} /> Transfers
            {pendingCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold flex items-center justify-center text-white">{pendingCount}</span>}
          </button>
          <button onClick={() => setTab('accounts')}
            className={`py-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-0.5 transition-colors ${tab === 'accounts' ? 'bg-white text-blue-700' : 'bg-white/10 text-white/70'}`}>
            <Shield size={11} /> Adjust
          </button>
          <button onClick={() => setTab('upgrades')}
            className={`py-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-0.5 transition-colors ${tab === 'upgrades' ? 'bg-white text-blue-700' : 'bg-white/10 text-white/70'}`}>
            <TrendingUp size={11} /> Tiers
          </button>
          <button onClick={() => setTab('support')}
            className={`py-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-0.5 transition-colors ${tab === 'support' ? 'bg-white text-blue-700' : 'bg-white/10 text-white/70'}`}>
            <MessageSquare size={11} /> Chat
          </button>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-5 pb-10">

        {/* CLIENTS TAB */}
        {tab === 'clients' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">All Clients ({clients.length})</h2>
              <button onClick={loadClients} className="text-blue-700 flex items-center gap-1 text-xs">
                <RefreshCw size={12} /> Refresh
              </button>
            </div>

            {clientsLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-blue-700" />
              </div>
            )}

            {!clientsLoading && clients.length === 0 && (
              <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
                <Users size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-400">No clients registered yet</p>
              </div>
            )}

            {!clientsLoading && clients.map(client => (
              <div key={client.account_number} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-700 font-bold text-sm">{client.full_name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{client.full_name}</p>
                      <p className="text-xs text-gray-400 font-mono">{client.account_number}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-blue-700">${client.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs text-gray-400">{client.tier}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                  <div className="text-xs text-gray-400">
                    📞 {client.phone || 'N/A'} · Joined {new Date(client.created_at).toLocaleDateString('en-GB')}
                  </div>
                  <button onClick={() => openClientAdjust(client)}
                    className="flex items-center gap-1 text-xs text-blue-700 font-semibold bg-blue-50 px-3 py-1.5 rounded-lg">
                    Adjust <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* TRANSFERS TAB */}
        {tab === 'transfers' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">
                Transfer Requests ({pendingCount} pending)
              </h2>
              <button onClick={loadTransfers} className="text-blue-700 flex items-center gap-1 text-xs">
                <RefreshCw size={12} /> Refresh
              </button>
            </div>

            {transfersLoading && <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-blue-700" /></div>}

            {!transfersLoading && transfers.length === 0 && (
              <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
                <ArrowLeftRight size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-400">No transfer requests yet</p>
              </div>
            )}

            {!transfersLoading && transfers.map(transfer => (
              <div key={transfer.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <ArrowLeftRight size={14} className="text-blue-700" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{transfer.from_name}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{transfer.from_account}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    transfer.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    transfer.status === 'approved' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-600'
                  }`}>{transfer.status.toUpperCase()}</span>
                </div>

                <div className="bg-gray-50 rounded-xl px-3 py-2.5 space-y-1.5 mb-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">To</span>
                    <span className="font-medium text-gray-700">{transfer.to_name} · <span className="font-mono">{transfer.to_account}</span></span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Amount</span>
                    <span className="font-bold text-blue-700 text-sm">${transfer.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {transfer.description && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Narration</span>
                      <span className="text-gray-600">{transfer.description}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
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
                      {transfer.status === 'approved' ? 'Transfer completed — funds moved.' : 'Transfer declined by admin.'}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* UPGRADES TAB */}
        {tab === 'upgrades' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">Upgrade Requests ({upgradeRequests.filter(r => r.status === 'pending').length} pending)</h2>
              <button onClick={loadUpgradeRequests} className="text-blue-700 flex items-center gap-1 text-xs">
                <RefreshCw size={12} /> Refresh
              </button>
            </div>

            {upgradesLoading && <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-blue-700" /></div>}

            {!upgradesLoading && upgradeRequests.length === 0 && (
              <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
                <TrendingUp size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-400">No upgrade requests yet</p>
              </div>
            )}

            {!upgradesLoading && upgradeRequests.map(req => (
              <div key={req.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{req.full_name}</p>
                    <p className="text-xs text-gray-400 font-mono">{req.account_number}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    req.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    req.status === 'approved' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-600'
                  }`}>{req.status.toUpperCase()}</span>
                </div>
                <div className="bg-gray-50 rounded-xl px-3 py-2 flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>{req.current_tier}</span>
                  <span>→</span>
                  <span className="font-semibold text-blue-700">{req.requested_tier}</span>
                </div>
                <p className="text-xs text-gray-400 mb-3">{new Date(req.requested_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                {req.status === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => handleUpgradeDecision(req, true)} disabled={upgradeActionId === req.id}
                      className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50">
                      {upgradeActionId === req.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={13} />} Approve
                    </button>
                    <button onClick={() => handleUpgradeDecision(req, false)} disabled={upgradeActionId === req.id}
                      className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50">
                      {upgradeActionId === req.id ? <Loader2 size={12} className="animate-spin" /> : <X size={13} />} Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* SUPPORT TAB */}
        {tab === 'support' && <AdminSupportInbox />}

        {/* ADJUST TAB */}
        {tab === 'accounts' && (
          <>
            {/* Search */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Find Client by Account</h3>
              <div className="flex gap-2">
                <input value={searchAccount} onChange={e => setSearchAccount(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Enter account number" maxLength={10} />
                <button onClick={searchUser} disabled={!searchAccount || loading}
                  className="px-4 py-3 rounded-xl bg-blue-700 text-white flex items-center gap-2 text-sm font-medium disabled:opacity-50">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                </button>
              </div>
              {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
            </div>

            {/* Found User */}
            {foundUser && (
              <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Name</span>
                    <span className="text-sm font-semibold text-gray-800">{foundUser.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Account</span>
                    <span className="text-sm text-gray-700 font-mono">{foundUser.account}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Balance</span>
                    <span className="text-sm font-bold text-blue-700">${foundUser.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Amount ($)</label>
                  <input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="1"
                    className="mt-1 w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Enter amount" />
                </div>

                {success && (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-xl px-3 py-2">
                    <CheckCircle size={16} /> <p className="text-xs font-medium">{success}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => handleAction('credit')} disabled={!amount || actionLoading}
                    className="flex-1 py-3 rounded-xl bg-green-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Credit
                  </button>
                  <button onClick={() => handleAction('debit')} disabled={!amount || actionLoading}
                    className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Minus size={16} />} Debit
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
