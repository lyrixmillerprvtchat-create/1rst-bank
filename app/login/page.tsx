'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()

    let email = identifier
    if (!identifier.includes('@')) {
      const res = await fetch('/api/resolve-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountNumber: identifier })
      })
      const data = await res.json()
      if (!res.ok) { setError('Account number not found'); setLoading(false); return }
      email = data.email
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(160deg, #003087 0%, #0066cc 50%, #f0f4f8 100%)' }}>
      <div className="flex-1 flex flex-col justify-end px-6 pb-12">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white tracking-tight">1rst Bank</h1>
          <p className="text-blue-200 mt-1 text-sm">Welcome back</p>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-2xl">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Sign In</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email or Account Number</label>
              <input
                type="text" value={identifier} onChange={e => setIdentifier(e.target.value)} required
                className="mt-1 w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="your@email.com or account number"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Password</label>
              <div className="relative mt-1">
                <input
                  type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm pr-12"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3 text-gray-400">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl bg-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-blue-800 transition-colors disabled:opacity-60"
            >
              {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in...</> : 'Sign In'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            No account?{' '}
            <Link href="/register" className="text-blue-700 font-medium">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
