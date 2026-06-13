'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { MessageCircle, X, Send, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface Message { id: string; sender: 'user' | 'admin'; message: string; created_at: string }

export default function SupportBubble() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [chatId, setChatId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = useMemo(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null
    return createClient()
  }, [])

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null)
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  useEffect(() => {
    if (!userId) return
    initChat()
  }, [userId])

  useEffect(() => {
    if (!chatId || !supabase) return
    loadMessages()

    const sub = supabase
      .channel(`chat-${chatId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const msg = payload.new as Message
          setMessages(prev => [...prev, msg])
          if (!open && msg.sender === 'admin') setUnread(n => n + 1)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [chatId, open, supabase])

  useEffect(() => {
    if (open) {
      setUnread(0)
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [open, messages])

  async function initChat() {
    if (!supabase) return
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
  }

  async function loadMessages() {
    if (!supabase) return
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
    if (data) setMessages(data)
  }

  async function sendMessage() {
    if (!input.trim() || !chatId || !supabase) return
    setSending(true)
    await supabase.from('support_messages').insert({ chat_id: chatId, sender: 'user', message: input.trim() })
    setInput('')
    setSending(false)
  }

  const isAdminPage = ['/admin-console', '/ops', '/manager', '/support'].some(p => pathname.startsWith(p))
  if (!userId || !supabase || isAdminPage) return null

  return (
    <div className="fixed bottom-20 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden" style={{ height: '420px' }}>
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #003087, #0066cc)' }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-white text-sm font-semibold">1rst Bank Support</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white">
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-gray-50">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 text-xs mt-8">
                <MessageCircle size={28} className="mx-auto mb-2 opacity-40" />
                <p>Hi! How can we help you today?</p>
              </div>
            )}
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
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
          <div className="px-3 py-3 border-t border-gray-100 bg-white flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={sendMessage} disabled={!input.trim() || sending}
              className="w-9 h-9 rounded-xl bg-blue-700 flex items-center justify-center text-white disabled:opacity-40">
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        </div>
      )}

      {/* Bubble Button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white relative transition-transform hover:scale-105"
        style={{ background: 'linear-gradient(135deg, #003087, #0066cc)' }}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>
    </div>
  )
}
