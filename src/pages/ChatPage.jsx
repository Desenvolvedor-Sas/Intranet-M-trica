import { useState, useEffect, useRef } from 'react'
import {
  collection,
  doc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import {
  Send,
  Search,
  Plus,
  MessageCircle,
  User,
  MoreVertical,
  ArrowLeft,
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name = '') {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function formatTimestamp(ts) {
  if (!ts) return ''
  const date = ts.toDate ? ts.toDate() : new Date(ts)
  const now = new Date()
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' })
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, size = 10, online = false }) {
  return (
    <div className="relative flex-shrink-0">
      <div
        className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-semibold text-sm`}
        style={{ background: '#3380ff' }}
      >
        {getInitials(name)}
      </div>
      {online && (
        <span
          className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
          style={{ background: '#22c55e', borderColor: '#0f1425' }}
        />
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ChatPage() {
  const { user } = useAuth()

  // contacts & chats
  const [users, setUsers] = useState([])
  const [chats, setChats] = useState([]) // [{chatId, otherUser, lastMessage, lastTimestamp}]
  const [searchQuery, setSearchQuery] = useState('')

  // active conversation
  const [activeChat, setActiveChat] = useState(null) // {chatId, otherUser}
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const messagesEndRef = useRef(null)

  // new chat modal
  const [showNewChat, setShowNewChat] = useState(false)
  const [newChatSearch, setNewChatSearch] = useState('')

  // mobile: show contacts or conversation
  const [mobileView, setMobileView] = useState('contacts') // 'contacts' | 'conversation'

  // ── Load all users (contacts) ──────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'users'))
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((u) => u.id !== user.uid)
      setUsers(list)
    })
    return unsub
  }, [user])

  // ── Load chats where current user is a participant ─────────────────────────
  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    )
    const unsub = onSnapshot(q, async (snap) => {
      const results = await Promise.all(
        snap.docs.map(async (chatDoc) => {
          const data = chatDoc.data()
          const otherUid = data.participants.find((p) => p !== user.uid)
          const otherUser = users.find((u) => u.id === otherUid) || {
            id: otherUid,
            name: 'Usuário',
          }

          // last message
          const msgQ = query(
            collection(db, 'chats', chatDoc.id, 'messages'),
            orderBy('timestamp', 'desc')
          )
          const msgSnap = await getDocs(msgQ)
          const lastMsg = msgSnap.docs[0]?.data() || null

          return {
            chatId: chatDoc.id,
            otherUser,
            lastMessage: lastMsg?.text || '',
            lastTimestamp: lastMsg?.timestamp || null,
          }
        })
      )
      // sort by most recent
      results.sort((a, b) => {
        const ta = a.lastTimestamp?.toMillis?.() ?? 0
        const tb = b.lastTimestamp?.toMillis?.() ?? 0
        return tb - ta
      })
      setChats(results)
    })
    return unsub
  }, [user, users])

  // ── Subscribe to messages of active chat ──────────────────────────────────
  useEffect(() => {
    if (!activeChat) return
    const q = query(
      collection(db, 'chats', activeChat.chatId, 'messages'),
      orderBy('timestamp', 'asc')
    )
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [activeChat])

  // ── Scroll to bottom on new messages ──────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Create or find chat between two users ─────────────────────────────────
  async function getOrCreateChat(otherUid) {
    // look for existing chat
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    )
    const snap = await getDocs(q)
    const existing = snap.docs.find((d) =>
      d.data().participants.includes(otherUid)
    )
    if (existing) return existing.id

    // create new
    const newChat = await addDoc(collection(db, 'chats'), {
      participants: [user.uid, otherUid],
      createdAt: serverTimestamp(),
    })
    return newChat.id
  }

  async function openChat(otherUser) {
    const chatId = await getOrCreateChat(otherUser.id)
    setActiveChat({ chatId, otherUser })
    setMobileView('conversation')
    setShowNewChat(false)
    setNewChatSearch('')
  }

  async function sendMessage() {
    const text = inputText.trim()
    if (!text || !activeChat) return
    setInputText('')
    await addDoc(collection(db, 'chats', activeChat.chatId, 'messages'), {
      text,
      senderId: user.uid,
      timestamp: serverTimestamp(),
    })
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // ── Filtered lists ─────────────────────────────────────────────────────────
  const filteredChats = chats.filter((c) =>
    (c.otherUser?.name || c.otherUser?.email || '')
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  )

  const filteredUsers = users.filter(
    (u) =>
      (u.name || u.email || '')
        .toLowerCase()
        .includes(newChatSearch.toLowerCase())
  )

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: '#0a0e1a', color: '#e2e8f0' }}
    >
      {/* ── Contacts sidebar ── */}
      <aside
        className={`flex flex-col w-full md:w-80 lg:w-96 flex-shrink-0 border-r min-w-0 ${
          mobileView === 'conversation' ? 'hidden md:flex' : 'flex'
        }`}
        style={{ background: '#0f1425', borderColor: '#1c2440' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-4 border-b"
          style={{ borderColor: '#1c2440' }}
        >
          <div className="flex items-center gap-2">
            <MessageCircle size={20} style={{ color: '#3380ff' }} />
            <span className="font-semibold text-lg text-white">Chat</span>
          </div>
          <button
            onClick={() => setShowNewChat(true)}
            className="p-2 rounded-lg transition-colors hover:bg-white/10"
            title="Nova conversa"
          >
            <Plus size={18} style={{ color: '#3380ff' }} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: '#151b30', border: '1px solid #1c2440' }}
          >
            <Search size={16} className="text-slate-400" />
            <input
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
              placeholder="Buscar conversas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto">
          {filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-500 text-sm gap-2">
              <MessageCircle size={28} />
              <span>Nenhuma conversa ainda</span>
            </div>
          ) : (
            filteredChats.map((chat) => (
              <button
                key={chat.chatId}
                onClick={() => {
                  setActiveChat({ chatId: chat.chatId, otherUser: chat.otherUser })
                  setMobileView('conversation')
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5 ${
                  activeChat?.chatId === chat.chatId ? 'bg-white/10' : ''
                }`}
              >
                <Avatar
                  name={chat.otherUser?.name || chat.otherUser?.email}
                  online={chat.otherUser?.online}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-medium text-white truncate">
                      {chat.otherUser?.name || chat.otherUser?.email || 'Usuário'}
                    </span>
                    <span className="text-xs text-slate-500 ml-2 flex-shrink-0">
                      {formatTimestamp(chat.lastTimestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {chat.lastMessage || 'Iniciar conversa'}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* ── Conversation panel ── */}
      <main
        className={`flex-1 flex flex-col min-w-0 ${
          mobileView === 'contacts' ? 'hidden md:flex' : 'flex'
        }`}
        style={{ background: '#0a0e1a' }}
      >
        {activeChat ? (
          <>
            {/* Conversation header */}
            <div
              className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
              style={{ background: '#0f1425', borderColor: '#1c2440' }}
            >
              {/* Back button (mobile) */}
              <button
                className="md:hidden p-1 rounded hover:bg-white/10"
                onClick={() => setMobileView('contacts')}
              >
                <ArrowLeft size={20} className="text-slate-300" />
              </button>

              <Avatar
                name={
                  activeChat.otherUser?.name ||
                  activeChat.otherUser?.email
                }
                online={activeChat.otherUser?.online}
              />

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm truncate">
                  {activeChat.otherUser?.name ||
                    activeChat.otherUser?.email ||
                    'Usuário'}
                </p>
                <p className="text-xs" style={{ color: '#22c55e' }}>
                  {activeChat.otherUser?.online ? 'Online' : 'Offline'}
                </p>
              </div>

              <button className="p-2 rounded-lg hover:bg-white/10">
                <MoreVertical size={18} className="text-slate-400" />
              </button>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-3">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm gap-2">
                  <MessageCircle size={32} />
                  <span>Nenhuma mensagem. Diga olá!</span>
                </div>
              )}
              {messages.map((msg) => {
                const isSent = msg.senderId === user.uid
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isSent && (
                      <div className="mr-2 flex-shrink-0 self-end">
                        <Avatar
                          name={
                            activeChat.otherUser?.name ||
                            activeChat.otherUser?.email
                          }
                          size={7}
                        />
                      </div>
                    )}
                    <div
                      className="max-w-[75%] sm:max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm leading-relaxed"
                      style={{
                        background: isSent ? '#3380ff' : '#1c2440',
                        color: '#fff',
                        borderBottomRightRadius: isSent ? 4 : undefined,
                        borderBottomLeftRadius: !isSent ? 4 : undefined,
                      }}
                    >
                      <p>{msg.text}</p>
                      <p
                        className="text-right mt-1"
                        style={{ fontSize: 10, opacity: 0.65 }}
                      >
                        {formatTimestamp(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div
              className="flex items-end gap-3 px-4 py-3 border-t flex-shrink-0"
              style={{ background: '#0f1425', borderColor: '#1c2440' }}
            >
              <textarea
                rows={1}
                className="flex-1 resize-none rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:ring-2"
                style={{
                  background: '#151b30',
                  border: '1px solid #1c2440',
                  maxHeight: 120,
                  lineHeight: '1.5',
                }}
                placeholder="Escreva uma mensagem..."
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = e.target.scrollHeight + 'px'
                }}
                onKeyDown={handleKeyDown}
              />
              <button
                onClick={sendMessage}
                disabled={!inputText.trim()}
                className="flex-shrink-0 p-2.5 rounded-xl transition-colors disabled:opacity-40"
                style={{ background: '#3380ff' }}
                title="Enviar"
              >
                <Send size={18} className="text-white" />
              </button>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4">
            <div
              className="p-6 rounded-full"
              style={{ background: '#0f1425' }}
            >
              <MessageCircle size={48} style={{ color: '#3380ff', opacity: 0.6 }} />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-slate-300">
                Selecione uma conversa
              </p>
              <p className="text-sm mt-1">
                Ou inicie uma nova conversa clicando em &quot;+&quot;
              </p>
            </div>
          </div>
        )}
      </main>

      {/* ── New Chat Modal ── */}
      {showNewChat && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setShowNewChat(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: '#0f1425', border: '1px solid #1c2440' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: '#1c2440' }}
            >
              <span className="font-semibold text-white">Nova conversa</span>
              <button
                onClick={() => setShowNewChat(false)}
                className="text-slate-400 hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Search inside modal */}
            <div className="px-4 py-3">
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ background: '#151b30', border: '1px solid #1c2440' }}
              >
                <Search size={15} className="text-slate-400" />
                <input
                  className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
                  placeholder="Buscar usuários..."
                  value={newChatSearch}
                  onChange={(e) => setNewChatSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {/* User list */}
            <div className="max-h-72 overflow-y-auto pb-2">
              {filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-slate-500 text-sm gap-2">
                  <User size={24} />
                  <span>Nenhum usuário encontrado</span>
                </div>
              ) : (
                filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => openChat(u)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
                  >
                    <Avatar
                      name={u.name || u.email}
                      online={u.online}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {u.name || 'Sem nome'}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{u.email}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
