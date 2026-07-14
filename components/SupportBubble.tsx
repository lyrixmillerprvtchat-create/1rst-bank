'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { MessageCircle, X, Send, Loader2, Image as ImageIcon, FileText, Landmark, User } from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface Message {
  id: string
  sender: 'user' | 'admin'
  message: string
  attachment_url?: string
  attachment_type?: string
  created_at: string
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  const isToday = d.toDateString() === new Date().toDateString()
  return isToday
    ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default function SupportBubble() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [chatId, setChatId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [unread, setUnread] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
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
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev
            return [...prev, msg]
          })
          if (msg.sender === 'admin') setUnread(n => n + 1)
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [chatId, supabase])

  useEffect(() => {
    if (open) setUnread(0)
  }, [open])

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
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

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !chatId || !supabase) return
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

  const [chatView, setChatView] = useState(false)

  function handleBubbleOpen() {
    setOpen(o => {
      if (!o) setChatView(false)
      return !o
    })
  }

  const isAdminPage = ['/admin-console', '/ops', '/manager', '/support'].some(p => pathname.startsWith(p))
  if (!userId || !supabase || isAdminPage) return null

  return (
    <>
      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="attachment" className="max-w-full max-h-full rounded-xl object-contain" />
        </div>
      )}

      <div className="fixed bottom-20 right-5 z-50 flex flex-col items-end gap-3">
        {open && (
          <div className="w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden" style={{ height: '440px' }}>
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between shrink-0" style={{ background: 'linear-gradient(135deg, #003087, #0066cc)' }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-white text-sm font-semibold">1rst Bank Support</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white">
                <X size={16} />
              </button>
            </div>

            {!chatView ? (
              /* Contact info screen */
              <div className="flex-1 flex flex-col items-center justify-center px-6 text-center bg-gray-50">
                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                  <MessageCircle size={28} className="text-blue-700" />
                </div>
                <p className="text-sm font-semibold text-gray-800 mb-2">Contact Customer Support</p>
                <p className="text-xs text-gray-500 leading-relaxed mb-1">
                  To speak with a customer support agent contact support at
                </p>
                <a href="mailto:1rstbanksupport@gmail.com" className="text-sm font-bold text-blue-700 underline break-all mb-6">
                  1rstbanksupport@gmail.com
                </a>
                <button
                  onClick={() => setChatView(true)}
                  className="w-full py-3 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Couldn&apos;t reach support / No response yet
                </button>
              </div>
            ) : (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-gray-50">
                  {messages.length === 0 && (
                    <div className="text-center text-gray-400 text-xs mt-8">
                      <MessageCircle size={28} className="mx-auto mb-2 opacity-40" />
                      <p>Hi! How can we help you today?</p>
                    </div>
                  )}
                  {messages.map(m => {
                    const isUser = m.sender === 'user'
                    return (
                      <div key={m.id} className={`flex items-end gap-1.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
                        {!isUser && (
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <Landmark size={11} className="text-blue-700" />
                          </div>
                        )}
                        <div className="flex flex-col max-w-[80%]">
                          <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                            isUser
                              ? 'bg-blue-700 text-white rounded-br-sm'
                              : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm'
                          }`}>
                            {m.sender === 'admin' && <p className="text-blue-600 font-semibold text-[10px] mb-0.5">Support Agent</p>}
                            {m.attachment_url && m.attachment_type === 'image' && (
                              <img src={m.attachment_url} alt="attachment" className="rounded-lg max-w-full mb-1 cursor-pointer" style={{ maxHeight: 140 }} onClick={() => setLightbox(m.attachment_url!)} />
                            )}
                            {m.attachment_url && m.attachment_type === 'document' && (
                              <a href={m.attachment_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1 underline text-[10px] ${isUser ? 'text-blue-200' : 'text-blue-700'}`}>
                                <FileText size={11} /> View Document
                              </a>
                            )}
                            {m.message && m.message}
                          </div>
                          <span className={`text-[10px] text-gray-400 mt-0.5 ${isUser ? 'text-right' : 'text-left'}`}>{fmtTime(m.created_at)}</span>
                        </div>
                        {isUser && (
                          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <User size={11} className="text-gray-400" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="px-3 py-3 border-t border-gray-100 bg-white flex gap-2 items-center shrink-0">
                  <input hidden ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx" onChange={handleFileUpload} />
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                    className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 disabled:opacity-40 flex-shrink-0">
                    {uploading ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />}
                  </button>
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button onClick={sendMessage} disabled={!input.trim() || sending}
                    className="w-9 h-9 rounded-xl bg-blue-700 flex items-center justify-center text-white disabled:opacity-40 flex-shrink-0">
                    {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Bubble Button */}
        <button
          onClick={handleBubbleOpen}
          className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white relative transition-transform hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #003087, #0066cc)' }}
        >
          {open ? <X size={22} /> : <MessageCircle size={22} />}
          {!open && unread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white">
              {unread}
            </span>
          )}
        </button>
      </div>
    </>
  )
}
