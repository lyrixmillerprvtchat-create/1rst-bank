'use client'
import { useState, useEffect, useRef } from 'react'
import { MessageSquare, Send, Loader2, User, ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface Chat { id: string; user_id: string; status: string; created_at: string; latest?: string; full_name?: string }
interface Message { id: string; sender: 'user' | 'admin'; message: string; created_at: string }

export default function AdminSupportInbox() {
  const [chats, setChats] = useState<Chat[]>([])
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    loadChats()
    const sub = supabase
      .channel('admin-support')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, () => loadChats())
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [])

  useEffect(() => {
    if (!selectedChat) return
    loadMessages(selectedChat.id)
    const sub = supabase
      .channel(`admin-chat-${selectedChat.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `chat_id=eq.${selectedChat.id}` },
        (payload) => setMessages(prev => [...prev, payload.new as Message])
      )
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [selectedChat])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function loadChats() {
    const { data: chatData } = await supabase
      .from('support_chats')
      .select('*')
      .order('created_at', { ascending: false })
    if (!chatData) return

    const enriched = await Promise.all(chatData.map(async (chat) => {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('user_id', chat.user_id).single()
      const { data: lastMsg } = await supabase.from('support_messages').select('message').eq('chat_id', chat.id).order('created_at', { ascending: false }).limit(1).single()
      return { ...chat, full_name: profile?.full_name ?? 'Unknown', latest: lastMsg?.message ?? 'No messages yet' }
    }))
    setChats(enriched)
  }

  async function loadMessages(chatId: string) {
    const { data } = await supabase.from('support_messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: true })
    if (data) setMessages(data)
  }

  async function sendReply() {
    if (!reply.trim() || !selectedChat) return
    setSending(true)
    await supabase.from('support_messages').insert({ chat_id: selectedChat.id, sender: 'admin', message: reply.trim() })
    setReply('')
    setSending(false)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ height: '500px' }}>
      <div className="flex h-full">
        {/* Chat List */}
        <div className={`${selectedChat ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-64 border-r border-gray-100`}>
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-blue-700" />
              <span className="text-sm font-semibold text-gray-800">Support Inbox</span>
              <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{chats.length}</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {chats.length === 0 && (
              <div className="text-center text-gray-400 text-xs mt-8 px-4">
                <MessageSquare size={24} className="mx-auto mb-2 opacity-40" />
                No support messages yet
              </div>
            )}
            {chats.map(chat => (
              <button key={chat.id} onClick={() => setSelectedChat(chat)}
                className={`w-full px-4 py-3 text-left border-b border-gray-50 hover:bg-gray-50 transition-colors ${selectedChat?.id === chat.id ? 'bg-blue-50' : ''}`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                    <User size={12} className="text-blue-700" />
                  </div>
                  <span className="text-xs font-semibold text-gray-800 truncate">{chat.full_name}</span>
                </div>
                <p className="text-xs text-gray-400 truncate pl-9">{chat.latest}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Message View */}
        {selectedChat ? (
          <div className="flex flex-col flex-1">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
              <button onClick={() => setSelectedChat(null)} className="md:hidden text-gray-500">
                <ChevronLeft size={18} />
              </button>
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                <User size={12} className="text-blue-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{selectedChat.full_name}</p>
                <p className="text-xs text-gray-400">Customer Support</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-gray-50">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                    m.sender === 'admin'
                      ? 'bg-blue-700 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm'
                  }`}>
                    {m.message}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="px-3 py-3 border-t border-gray-100 bg-white flex gap-2">
              <input
                value={reply}
                onChange={e => setReply(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendReply()}
                placeholder="Reply to customer..."
                className="flex-1 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={sendReply} disabled={!reply.trim() || sending}
                className="w-9 h-9 rounded-xl bg-blue-700 flex items-center justify-center text-white disabled:opacity-40">
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center text-gray-300">
            <div className="text-center">
              <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Select a conversation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
