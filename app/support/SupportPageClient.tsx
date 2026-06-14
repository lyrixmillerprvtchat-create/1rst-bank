'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { MessageCircle, Send, Loader2, ArrowLeft, Image as ImageIcon, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

interface Message {
  id: string
  sender: 'user' | 'admin'
  message: string
  attachment_url?: string
  attachment_type?: string
  created_at: string
}

export default function SupportPageClient() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [chatId, setChatId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('Customer')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUserId(data.user.id)
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('user_id', data.user.id).single()
        if (profile?.full_name) setUserName(profile.full_name)
      }
    })
  }, [supabase])

  useEffect(() => {
    if (!userId) return
    initChat()
  }, [userId])

  useEffect(() => {
    if (!chatId) return
    loadMessages()
    const sub = supabase
      .channel(`support-page-${chatId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `chat_id=eq.${chatId}` },
        (payload) => setMessages(prev => [...prev, payload.new as Message])
      )
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [chatId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function initChat() {
    const res = await fetch('/api/support-init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    const data = await res.json()
    if (data.chatId) setChatId(data.chatId)
    setLoading(false)
  }

  async function loadMessages() {
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
    if (data) setMessages(data)
  }

  async function sendMessage() {
    if (!input.trim() || !chatId) return
    setSending(true)
    const message = input.trim()
    setInput('')
    await fetch('/api/support-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, message, userName }),
    })
    setSending(false)
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !chatId) return
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    form.append('chatId', chatId)
    const res = await fetch('/api/support-upload', { method: 'POST', body: form })
    const data = await res.json()
    if (res.ok) {
      await supabase.from('support_messages').insert({
        chat_id: chatId,
        sender: 'user',
        message: '',
        attachment_url: data.url,
        attachment_type: data.type,
      })
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f0f4f8' }}>
      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="attachment" className="max-w-full max-h-full rounded-xl object-contain" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 shadow-sm" style={{ background: 'linear-gradient(135deg, #003087, #0066cc)' }}>
        <Link href="/dashboard" className="text-white/70 hover:text-white">
          <ArrowLeft size={20} />
        </Link>
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
          <MessageCircle size={18} className="text-white" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm">1rst Bank Support</p>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <p className="text-white/70 text-xs">Online</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading && (
          <div className="flex justify-center mt-20">
            <Loader2 size={24} className="animate-spin text-blue-600" />
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="text-center mt-16">
            <MessageCircle size={40} className="mx-auto mb-3 text-blue-200" />
            <p className="text-gray-500 text-sm font-medium">How can we help you today?</p>
            <p className="text-gray-400 text-xs mt-1">Send a message and we&apos;ll get back to you shortly.</p>
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.sender === 'admin' && (
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center mr-2 mt-1 flex-shrink-0 text-[10px] font-bold text-blue-700">1B</div>
            )}
            <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
              m.sender === 'user'
                ? 'bg-blue-700 text-white rounded-br-sm'
                : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm'
            }`}>
              {m.sender === 'admin' && <p className="text-blue-600 font-semibold text-[10px] mb-0.5">Support Agent</p>}
              {m.attachment_url && m.attachment_type === 'image' && (
                <img src={m.attachment_url} alt="attachment" className="rounded-xl max-w-full mb-1 cursor-pointer" style={{ maxHeight: 200 }} onClick={() => setLightbox(m.attachment_url!)} />
              )}
              {m.attachment_url && m.attachment_type === 'document' && (
                <a href={m.attachment_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1.5 underline text-xs ${m.sender === 'user' ? 'text-blue-200' : 'text-blue-700'}`}>
                  <FileText size={13} /> View Document
                </a>
              )}
              {m.message && m.message}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-4 border-t border-gray-200 bg-white flex gap-2 items-center">
        <input hidden ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx" onChange={handleFileUpload} />
        <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
          className="w-11 h-11 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 disabled:opacity-40 flex-shrink-0">
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
        </button>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || sending}
          className="w-11 h-11 rounded-2xl bg-blue-700 flex items-center justify-center text-white disabled:opacity-40 flex-shrink-0"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  )
}
