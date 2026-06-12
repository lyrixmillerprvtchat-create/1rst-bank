'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Registration failed'); setLoading(false); return }
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(160deg, #003087 0%, #0066cc 50%, #f0f4f8 100%)' }}>
      <div className="flex-1 flex flex-col justify-end px-6 pb-10">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white tracking-tight">1rst Bank</h1>
          <p className="text-blue-200 mt-1 text-sm">Open your account today</p>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-2xl">
          <h2 className="text-xl font-semibold text-gray-900 mb-5">Create Account</h2>
          <form onSubmit={handleRegister} className="space-y-4">
            {[
              { label: 'Full Name', key: 'fullName', type: 'text', placeholder: 'John Doe' },
              { label: 'Email', key: 'email', type: 'email', placeholder: 'john@email.com' },
              { label: 'Phone', key: 'phone', type: 'tel', placeholder: '08012345678' },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
                <input type={type} value={form[key as keyof typeof form]} onChange={e => setForm({ ...form, [key]: e.target.value })} required
                  className="mt-1 w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder={placeholder}
                />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Password</label>
              <div className="relative mt-1">
                <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm pr-12"
                  placeholder="••••••••" minLength={6}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3 text-gray-400">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl bg-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-blue-800 transition-colors disabled:opacity-60">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Creating account...</> : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-700 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
