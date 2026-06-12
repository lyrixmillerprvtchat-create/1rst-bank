'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Users, Plus, Minus, Loader2, CheckCircle, RefreshCw,
  ArrowLeftRight, Shield, ChevronLeft, Search, AlertCircle
} from 'lucide-react'
import Link from 'next/link'

interface Client {
  user_id: string
  full_name: string
  account_number: string
  tier: string
  phone: string
  balance: number
}

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function ManagerClient() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  // Per-client inline adjust state
  const [adjustState, setAdjustState] = useState<Record<string, { amount: string; working: boolean; msg: string; err: string }>>({})

  // Transfer panel
  const [fromAcc, setFromAcc] = useState('')
  const [toAcc, setToAcc] = useState('')
  const [txAmount, setTxAmount] = useState('')
  const [txNote, setTxNote] = useState('')
  const [txWorking, setTxWorking] = useState(false)
  const [txMsg, setTxMsg] = useState('')
  const [txErr, setTxErr] = useState('')

  const loadClients = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, account_number, tier, phone')
      .neq('role', 'admin')
      .order('full_name', { ascending: true })

    if (!profiles) { setLoading(false); return }

    const withBalances = await Promise.all(profiles.map(async (p) => {
      const { data: acc } = await supabase
        .from('accounts')
        .select('balance')
        .eq('account_number', p.account_number)
        .single()
      return { ...p, balance: acc?.balance ?? 0 } as Client
    }))
    setClients(withBalances)
    setLoading(false)
  }, [])

  useEffect(() => { loadClients() }, [loadClients])

  function getAdj(acc: string) {
    return adjustState[acc] ?? { amount: '', working: false, msg: '', err: '' }
  }

  function setAdj(acc: string, patch: Partial<typeof adjustState[string]>) {
    setAdjustState(prev => ({ ...prev, [acc]: { ...getAdj(acc), ...patch } }))
  }

  async function handleAdjust(client: Client, type: 'credit' | 'debit') {
    const adj = getAdj(client.account_number)
    const val = parseFloat(adj.amount)
    if (!val || val <= 0) return
    setAdj(client.account_number, { working: true, msg: '', err: '' })
    const res = await fetch('/api/admin/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_number: client.account_number, amount: val, type }),
    })
    const data = await res.json()
    if (!res.ok) {
      setAdj(client.account_number, { working: false, err: data.error ?? 'Failed' })
      return
    }
    const newBal = type === 'credit' ? client.balance + val : client.balance - val
    setClients(prev => prev.map(c =>
      c.account_number === client.account_number ? { ...c, balance: newBal } : c
    ))
    setAdj(client.account_number, {
      working: false,
      amount: '',
      msg: `${type === 'credit' ? '+' : '-'}${fmt(val)} applied`,
      err: ''
    })
    setTimeout(() => setAdj(client.account_number, { msg: '' }), 3000)
  }

  async function handleTransfer() {
    const val = parseFloat(txAmount)
    if (!fromAcc || !toAcc || !val || fromAcc === toAcc) return
    setTxWorking(true); setTxMsg(''); setTxErr('')
    const fromClient = clients.find(c => c.account_number === fromAcc)!
    const toClient = clients.find(c => c.account_number === toAcc)!

    const note = txNote ? ` — ${txNote}` : ''

    // Debit sender (with email)
    const debitRes = await fetch('/api/admin/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_number: fromAcc, amount: val, type: 'debit', description: `Transfer to ${toClient.full_name}${note}` }),
    })
    if (!debitRes.ok) { const d = await debitRes.json(); setTxErr(d.error ?? 'Debit failed'); setTxWorking(false); return }

    // Credit receiver (with email)
    const creditRes = await fetch('/api/admin/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_number: toAcc, amount: val, type: 'credit', description: `Transfer from ${fromClient.full_name}${note}` }),
    })
    if (!creditRes.ok) {
      // Reverse the debit
      await fetch('/api/admin/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_number: fromAcc, amount: val, type: 'credit', description: 'Transfer reversal' }),
      })
      const d = await creditRes.json(); setTxErr(d.error ?? 'Credit failed'); setTxWorking(false); return
    }

    setClients(prev => prev.map(c => {
      if (c.account_number === fromAcc) return { ...c, balance: c.balance - val }
      if (c.account_number === toAcc) return { ...c, balance: c.balance + val }
      return c
    }))
    setTxMsg(`${fmt(val)} moved: ${fromClient.full_name} → ${toClient.full_name}`)
    setTxAmount(''); setTxNote(''); setFromAcc(''); setToAcc('')
    setTxWorking(false)
    setTimeout(() => setTxMsg(''), 4000)
  }

  const filtered = clients.filter(c =>
    c.full_name.toLowerCase().includes(filter.toLowerCase()) ||
    c.account_number.includes(filter)
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }} className="px-5 pt-12 pb-6">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/admin-console" className="text-white/60 hover:text-white transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <div className="w-8 h-8 rounded-full bg-yellow-400/20 flex items-center justify-center">
            <Shield size={16} className="text-yellow-400" />
          </div>
          <div>
            <h1 className="text-white text-lg font-bold">Client Manager</h1>
            <p className="text-gray-400 text-xs">Balance control · 1rst Bank</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5 pb-16 max-w-2xl mx-auto">

        {/* Search + Refresh */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Search name or account…"
              className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button onClick={loadClients} className="px-3 py-2.5 rounded-xl bg-white border border-gray-200 text-blue-700 hover:bg-blue-50 transition-colors">
            <RefreshCw size={15} />
          </button>
        </div>

        {/* Client cards */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <Users size={12} /> Clients ({filtered.length})
            </p>
          </div>

          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 size={22} className="animate-spin text-blue-700" />
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
              <p className="text-sm text-gray-400">No clients found</p>
            </div>
          )}

          <div className="space-y-3">
            {!loading && filtered.map(client => {
              const adj = getAdj(client.account_number)
              return (
                <div key={client.account_number} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  {/* Client info row */}
                  <div className="flex items-center justify-between px-4 pt-4 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <span className="text-blue-700 font-bold text-sm">{client.full_name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{client.full_name}</p>
                        <p className="text-xs text-gray-400 font-mono">{client.account_number}</p>
                        <p className="text-[10px] text-gray-400">{client.tier}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-blue-700">{fmt(client.balance)}</p>
                      <p className="text-[10px] text-gray-400">balance</p>
                    </div>
                  </div>

                  {/* Inline adjust */}
                  <div className="border-t border-gray-50 px-4 py-3 bg-gray-50/50">
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={adj.amount}
                        onChange={e => setAdj(client.account_number, { amount: e.target.value, msg: '', err: '' })}
                        placeholder="Amount"
                        className="flex-1 px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => handleAdjust(client, 'credit')}
                        disabled={!adj.amount || adj.working}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl bg-green-600 text-white text-xs font-semibold disabled:opacity-40 hover:bg-green-700 transition-colors"
                      >
                        {adj.working ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                        Credit
                      </button>
                      <button
                        onClick={() => handleAdjust(client, 'debit')}
                        disabled={!adj.amount || adj.working}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl bg-red-500 text-white text-xs font-semibold disabled:opacity-40 hover:bg-red-600 transition-colors"
                      >
                        {adj.working ? <Loader2 size={13} className="animate-spin" /> : <Minus size={13} />}
                        Debit
                      </button>
                    </div>
                    {adj.msg && (
                      <div className="flex items-center gap-1.5 mt-2 text-green-700 text-xs font-medium">
                        <CheckCircle size={12} /> {adj.msg}
                      </div>
                    )}
                    {adj.err && (
                      <div className="flex items-center gap-1.5 mt-2 text-red-600 text-xs font-medium">
                        <AlertCircle size={12} /> {adj.err}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Admin Transfer Panel */}
        {clients.length >= 2 && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                <ArrowLeftRight size={13} className="text-blue-700" />
              </div>
              <h2 className="text-sm font-bold text-gray-800">Assign Transfer</h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Payer (From)</label>
                <select
                  value={fromAcc}
                  onChange={e => { setFromAcc(e.target.value); setTxMsg(''); setTxErr('') }}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select payer…</option>
                  {clients.map(c => (
                    <option key={c.account_number} value={c.account_number}>
                      {c.full_name} — {c.account_number} ({fmt(c.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Payee (To)</label>
                <select
                  value={toAcc}
                  onChange={e => { setToAcc(e.target.value); setTxMsg(''); setTxErr('') }}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select payee…</option>
                  {clients.map(c => (
                    <option key={c.account_number} value={c.account_number} disabled={c.account_number === fromAcc}>
                      {c.full_name} — {c.account_number} ({fmt(c.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Amount ($)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={txAmount}
                  onChange={e => { setTxAmount(e.target.value); setTxMsg(''); setTxErr('') }}
                  placeholder="0.00"
                  className="mt-1 w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Narration (optional)</label>
                <input
                  type="text"
                  value={txNote}
                  onChange={e => setTxNote(e.target.value)}
                  placeholder="e.g. Loan repayment"
                  className="mt-1 w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {txMsg && (
                <div className="flex items-center gap-2 bg-green-50 text-green-700 rounded-xl px-3 py-2.5 text-xs font-medium">
                  <CheckCircle size={14} /> {txMsg}
                </div>
              )}
              {txErr && (
                <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-xl px-3 py-2.5 text-xs font-medium">
                  <AlertCircle size={14} /> {txErr}
                </div>
              )}

              <button
                onClick={handleTransfer}
                disabled={!fromAcc || !toAcc || !txAmount || fromAcc === toAcc || txWorking}
                className="w-full py-3 rounded-xl bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-blue-800 transition-colors"
              >
                {txWorking
                  ? <><Loader2 size={16} className="animate-spin" /> Processing…</>
                  : <><ArrowLeftRight size={16} /> Execute Transfer</>
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
