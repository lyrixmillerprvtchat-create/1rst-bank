'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { MessageCircle, Send, Loader2, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

interface Message { id: string; sender: 'user' | 'admin'; message: string; created_at: string }

export default function SupportPageClient() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [chatId, setChatId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
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
    const { data: existing } = await supabase
      .from('support_chats')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'open')
      .single()
    if (existing) {
      setChatId(existing.id)
    } else {
      const { data: newChat } = await supabase
        .from('support_chats')
        .insert({ user_id: userId })
        .select('id')
        .single()
      if (newChat) setChatId(newChat.id)
    }
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
    await supabase.from('support_messages').insert({ chat_id: chatId, sender: 'user', message: input.trim() })
    setInput('')
    setSending(false)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f0f4f8' }}>
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
            <p className="text-gray-400 text-xs mt-1">Send a message and we'll get back to you shortly.</p>
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
              {m.message}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-4 border-t border-gray-200 bg-white flex gap-2 items-center">
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
