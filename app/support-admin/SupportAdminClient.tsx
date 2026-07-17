'use client'
import { useState, useEffect } from 'react'
import { Eye, EyeOff, Loader2, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import AdminSupportInbox from '@/components/AdminSupportInbox'

type Screen = 'loading' | 'login' | 'inbox'

export default function SupportAdminClient({ initialChatId }: { initialChatId?: string }) {
  const [screen, setScreen] = useState<Screen>('loading')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loginErr, setLoginErr] = useState('')
  const [working, setWorking] = useState(false)

  useEffect(() => {
    async function check() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setScreen('login'); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single()
      setScreen(profile?.role === 'admin' ? 'inbox' : 'login')
    }
    check()
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setWorking(true)
    setLoginErr('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email: 'admin@1rstbank.com', password })
    if (error) {
      setLoginErr('Incorrect password')
      setWorking(false)
      return
    }
    setScreen('inbox')
    setWorking(false)
  }

  if (screen === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={28} className="animate-spin text-blue-600" />
      </div>
    )
  }

  if (screen === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-blue-700 flex items-center justify-center mb-4">
              <Shield size={26} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Support Admin</h1>
            <p className="text-gray-500 text-sm mt-1">1rst Bank — Support Inbox</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Admin password"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-11"
                required
              />
              <button type="button" onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {loginErr && <p className="text-red-500 text-xs text-center">{loginErr}</p>}
            <button type="submit" disabled={working || !password}
              className="w-full py-3 rounded-xl bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {working && <Loader2 size={14} className="animate-spin" />}
              {working ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f0f4f8' }}>
      <div className="px-4 py-4 shadow-sm flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #003087, #0066cc)' }}>
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
          <Shield size={18} className="text-white" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm">Support Inbox</p>
          <p className="text-white/70 text-xs">1rst Bank Admin</p>
        </div>
      </div>
      <div className="flex-1 p-4 max-w-4xl mx-auto w-full">
        <AdminSupportInbox initialChatId={initialChatId} />
      </div>
    </div>
  )
}
