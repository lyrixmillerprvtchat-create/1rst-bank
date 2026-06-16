'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '' })
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const passwordsMatch = form.password && form.confirmPassword && form.password === form.confirmPassword
  const passwordMismatch = form.confirmPassword && form.password !== form.confirmPassword

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    setError('')

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        password: form.password,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Registration failed'); setLoading(false); return }

    // Auto-login immediately after registration
    const supabase = createClient()
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })
    if (loginError) {
      // Fallback to login page if auto-login fails
      router.push('/login')
      return
    }
    router.push('/dashboard')
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
              { label: 'Full Name', key: 'fullName', type: 'text', placeholder: 'John Doe', autoComplete: 'name' },
              { label: 'Email', key: 'email', type: 'email', placeholder: 'john@email.com', autoComplete: 'email' },
              { label: 'Phone', key: 'phone', type: 'tel', placeholder: '08012345678', autoComplete: 'tel' },
            ].map(({ label, key, type, placeholder, autoComplete }) => (
              <div key={key}>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
                <input type={type} value={form[key as keyof typeof form]} onChange={e => setForm({ ...form, [key]: e.target.value })} required
                  autoComplete={autoComplete} name={key}
                  className="mt-1 w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder={placeholder}
                />
              </div>
            ))}

            {/* Password */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Password</label>
              <div className="relative mt-1">
                <input type={showPass ? 'text' : 'password'} value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })} required
                  autoComplete="new-password" name="password"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm pr-12"
                  placeholder="••••••••" minLength={6}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3 text-gray-400">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Confirm Password</label>
              <div className="relative mt-1">
                <input type={showConfirm ? 'text' : 'password'} value={form.confirmPassword}
                  onChange={e => setForm({ ...form, confirmPassword: e.target.value })} required
                  autoComplete="new-password" name="confirm-password"
                  className={`w-full px-4 py-3 rounded-xl bg-gray-50 border text-gray-900 focus:outline-none focus:ring-2 text-sm pr-12 ${
                    passwordMismatch ? 'border-red-400 focus:ring-red-400' :
                    passwordsMatch ? 'border-green-400 focus:ring-green-400' :
                    'border-gray-200 focus:ring-blue-500'
                  }`}
                  placeholder="••••••••" minLength={6}
                />
                <div className="absolute right-3 top-3 flex items-center gap-1">
                  {passwordsMatch && <CheckCircle size={15} className="text-green-500" />}
                  {passwordMismatch && <AlertCircle size={15} className="text-red-400" />}
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="text-gray-400 ml-1">
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              {passwordMismatch && <p className="text-red-500 text-xs mt-1">Passwords do not match</p>}
              {passwordsMatch && <p className="text-green-600 text-xs mt-1">Passwords match</p>}
            </div>

            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button type="submit" disabled={loading || !!passwordMismatch || !form.password || !form.confirmPassword}
              className="w-full py-3.5 rounded-xl bg-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-blue-800 transition-colors disabled:opacity-60">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Creating account…</> : 'Create Account'}
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
