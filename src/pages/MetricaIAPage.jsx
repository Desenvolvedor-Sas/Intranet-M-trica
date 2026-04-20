import { useState, useRef, useEffect } from 'react'
import { Send, Bot, Sparkles, User, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { format } from 'date-fns'

const SUGGESTED_PROMPTS = [
  'Resuma o status dos projetos',
  'Quais eventos tenho hoje?',
  'Mostre as tarefas pendentes',
  'Quem são os membros da equipe?',
]

// ---------------------------------------------------------------------------
// Response generation — operates on real Firestore data
// ---------------------------------------------------------------------------
function generateResponse(message, { projects, allTasks, events, allUsers, userData }) {
  const lower = message.toLowerCase()

  // --- PROJETOS / STATUS ---
  if (['projeto', 'projetos', 'status'].some((kw) => lower.includes(kw))) {
    if (!projects || projects.length === 0) {
      return 'Não encontrei nenhum projeto cadastrado no momento.'
    }

    const columnLabels = {
      todo: 'A Fazer',
      inprogress: 'Em Progresso',
      review: 'Em Revisão',
      done: 'Concluído',
    }

    const lines = projects.map((project) => {
      const projectTasks = allTasks.filter((t) => t.projectId === project.id)
      const total = projectTasks.length
      const done = projectTasks.filter((t) => t.column === 'done').length
      const pct = total > 0 ? Math.round((done / total) * 100) : 0

      // column breakdown
      const breakdown = Object.entries(columnLabels)
        .map(([col, label]) => {
          const count = projectTasks.filter((t) => t.column === col).length
          return count > 0 ? `${label}: ${count}` : null
        })
        .filter(Boolean)
        .join(', ')

      return `📁 **${project.name ?? project.title ?? project.id}** — ${done}/${total} tarefas concluídas (${pct}%)${breakdown ? `\n   (${breakdown})` : ''}`
    })

    return `Aqui está o resumo dos projetos:\n\n${lines.join('\n\n')}`
  }

  // --- EVENTOS / REUNIÕES / HOJE / AGENDA ---
  if (
    ['reunião', 'reuniões', 'hoje', 'agenda', 'evento', 'eventos'].some((kw) =>
      lower.includes(kw)
    )
  ) {
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const todayEvents = (events ?? []).filter((e) => {
      // Support dateStr field or date field
      const d = e.dateStr ?? e.date ?? ''
      return typeof d === 'string' ? d.startsWith(todayStr) : false
    })

    if (todayEvents.length === 0) {
      return 'Você não tem eventos agendados para hoje.'
    }

    const lines = todayEvents.map((e) => {
      const time = e.timeStart ?? e.time ?? e.hora ?? '—'
      const title = e.title ?? e.nome ?? e.name ?? '(sem título)'
      return `📅 ${time} — ${title}`
    })

    return `Você tem **${todayEvents.length} evento${todayEvents.length !== 1 ? 's' : ''}** agendado${todayEvents.length !== 1 ? 's' : ''} para hoje:\n\n${lines.join('\n')}`
  }

  // --- TAREFAS / PENDENTES ---
  if (['tarefa', 'tarefas', 'pendente', 'pendentes'].some((kw) => lower.includes(kw))) {
    const pending = (allTasks ?? []).filter(
      (t) => t.column === 'todo' || t.column === 'inprogress'
    )

    if (pending.length === 0) {
      return 'Não há tarefas pendentes no momento. Tudo em dia! ✅'
    }

    const priorityGroups = {
      Alta: pending.filter((t) => t.priority === 'Alta' || t.priority === 'high'),
      Média: pending.filter(
        (t) => t.priority === 'Média' || t.priority === 'Media' || t.priority === 'medium'
      ),
      Baixa: pending.filter((t) => t.priority === 'Baixa' || t.priority === 'low'),
      'Sem prioridade': pending.filter(
        (t) =>
          !t.priority ||
          !['Alta', 'high', 'Média', 'Media', 'medium', 'Baixa', 'low'].includes(t.priority)
      ),
    }

    const priorityIcons = { Alta: '🔴', Média: '🟡', Baixa: '🟢', 'Sem prioridade': '⚪' }

    const sections = Object.entries(priorityGroups)
      .filter(([, tasks]) => tasks.length > 0)
      .map(([priority, tasks]) => {
        const icon = priorityIcons[priority]
        const taskLines = tasks
          .slice(0, 5)
          .map((t) => {
            const assignee =
              allUsers?.find((u) => u.id === t.assigneeId)?.name ??
              t.assigneeName ??
              null
            const title = t.title ?? t.nome ?? '(sem título)'
            return `• ${title}${assignee ? ` — ${assignee}` : ''}`
          })
          .join('\n')
        const extra = tasks.length > 5 ? `\n  ...e mais ${tasks.length - 5}` : ''
        return `${icon} **${priority} (${tasks.length})**\n${taskLines}${extra}`
      })

    return `Tarefas pendentes:\n\n${sections.join('\n\n')}`
  }

  // --- EQUIPE / TIME / RELATÓRIO / USUÁRIOS / MEMBROS ---
  if (
    ['equipe', 'time', 'relatório', 'relatorio', 'usuário', 'usuario', 'usuarios', 'membros'].some(
      (kw) => lower.includes(kw)
    )
  ) {
    if (!allUsers || allUsers.length === 0) {
      return 'Não encontrei usuários cadastrados no momento.'
    }

    const lines = allUsers.map((u) => {
      const name = u.name ?? u.displayName ?? u.email ?? u.id
      const role = u.role ?? u.cargo ?? '—'
      const dept = u.department ?? u.departamento ?? null
      const taskCount = (allTasks ?? []).filter((t) => t.assigneeId === u.id).length
      return `👤 **${name}** (${role}${dept ? ` · ${dept}` : ''}) — ${taskCount} tarefa${taskCount !== 1 ? 's' : ''} atribuída${taskCount !== 1 ? 's' : ''}`
    })

    return `Membros da equipe:\n\n${lines.join('\n')}`
  }

  // --- CHECKLIST / PROGRESSO ---
  if (['checklist', 'progresso'].some((kw) => lower.includes(kw))) {
    let totalItems = 0
    let doneItems = 0

    ;(allTasks ?? []).forEach((t) => {
      const items = t.checklist ?? t.checklistItems ?? []
      if (Array.isArray(items)) {
        totalItems += items.length
        doneItems += items.filter((item) => item.done ?? item.checked ?? false).length
      }
    })

    if (totalItems === 0) {
      return 'Não foram encontrados itens de checklist nas tarefas cadastradas.'
    }

    const pct = Math.round((doneItems / totalItems) * 100)
    return `Progresso dos checklists:\n\n✅ **${doneItems} de ${totalItems}** itens concluídos (${pct}%)`
  }

  // --- DEFAULT ---
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const todayCount = (events ?? []).filter((e) => {
    const d = e.dateStr ?? e.date ?? ''
    return typeof d === 'string' && d.startsWith(todayStr)
  }).length
  const pendingCount = (allTasks ?? []).filter(
    (t) => t.column === 'todo' || t.column === 'inprogress'
  ).length

  return (
    `Entendi! Aqui está um resumo rápido:\n\n` +
    `• **${(projects ?? []).length}** projeto${(projects ?? []).length !== 1 ? 's' : ''} cadastrado${(projects ?? []).length !== 1 ? 's' : ''}\n` +
    `• **${todayCount}** evento${todayCount !== 1 ? 's' : ''} agendado${todayCount !== 1 ? 's' : ''} para hoje\n` +
    `• **${pendingCount}** tarefa${pendingCount !== 1 ? 's' : ''} pendente${pendingCount !== 1 ? 's' : ''}\n` +
    `• **${(allUsers ?? []).length}** usuário${(allUsers ?? []).length !== 1 ? 's' : ''} cadastrado${(allUsers ?? []).length !== 1 ? 's' : ''}\n\n` +
    `Você pode me perguntar sobre:\n` +
    `— **projetos** e seu status\n` +
    `— **eventos** de hoje\n` +
    `— **tarefas** pendentes\n` +
    `— **equipe** e membros`
  )
}

// ---------------------------------------------------------------------------
// UI Components (unchanged)
// ---------------------------------------------------------------------------
function TypingIndicator() {
  return (
    <div className="flex items-end gap-3">
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #3380ff 0%, #7c3aed 100%)' }}>
        <Bot size={16} className="text-white" />
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-bl-sm" style={{ backgroundColor: '#151b30' }}>
        <div className="flex items-center gap-1.5 h-5">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}

function formatMessageText(text) {
  // Bold via **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'

  return (
    <div className={`flex items-end gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      {isUser ? (
        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-blue-600">
          <User size={16} className="text-white" />
        </div>
      ) : (
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #3380ff 0%, #7c3aed 100%)' }}
        >
          <Bot size={16} className="text-white" />
        </div>
      )}

      {/* Bubble */}
      <div
        className={`max-w-[85%] sm:max-w-[75%] md:max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
          isUser
            ? 'rounded-br-sm text-white'
            : 'rounded-bl-sm text-gray-200'
        }`}
        style={{ backgroundColor: isUser ? '#3380ff' : '#151b30' }}
      >
        {formatMessageText(msg.text)}
        <p className={`text-xs mt-1.5 ${isUser ? 'text-blue-200 text-right' : 'text-gray-500'}`}>
          {msg.time}
        </p>
      </div>
    </div>
  )
}

function WelcomeScreen({ onPrompt }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-8 py-12">
      {/* Bot Icon */}
      <div className="relative">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #3380ff 0%, #7c3aed 100%)' }}
        >
          <Bot size={40} className="text-white" />
        </div>
        <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center">
          <Sparkles size={12} className="text-yellow-900" />
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Olá! Sou a Métrica IA 🤖</h2>
        <p className="text-gray-400 text-sm max-w-sm">
          Posso ajudar com informações sobre projetos, agenda, equipe e muito mais. Como posso te ajudar hoje?
        </p>
      </div>

      {/* Suggested prompts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg px-4">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onPrompt(prompt)}
            className="text-left px-4 py-3 rounded-xl text-sm text-gray-300 border border-white/10 hover:border-blue-500/50 hover:text-white transition-all duration-200 hover:bg-blue-500/10"
            style={{ backgroundColor: '#151b30' }}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function MetricaIAPage() {
  const { userData } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // Firestore data stored in a ref so responses are instant after load
  const firestoreData = useRef({ projects: [], allTasks: [], events: [], allUsers: [] })

  // Load all data once on mount
  useEffect(() => {
    async function loadData() {
      try {
        // Fetch projects, events, users in parallel
        const [projectsSnap, eventsSnap, usersSnap] = await Promise.all([
          getDocs(collection(db, 'projects')),
          getDocs(collection(db, 'events')),
          getDocs(collection(db, 'users')),
        ])

        const projects = projectsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
        const events = eventsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
        const allUsers = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

        // Fetch tasks for every project in parallel
        const tasksByProject = await Promise.all(
          projects.map(async (project) => {
            const tasksSnap = await getDocs(collection(db, 'projects', project.id, 'tasks'))
            return tasksSnap.docs.map((d) => ({ id: d.id, projectId: project.id, ...d.data() }))
          })
        )
        const allTasks = tasksByProject.flat()

        firestoreData.current = { projects, allTasks, events, allUsers }
      } catch (err) {
        console.error('MetricaIA: erro ao carregar dados do Firestore', err)
      }
    }

    loadData()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  function getTime() {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  function sendMessage(text) {
    const trimmed = (text ?? input).trim()
    if (!trimmed || isTyping) return

    const userMsg = { id: Date.now(), role: 'user', text: trimmed, time: getTime() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    const delay = 800 + Math.random() * 700 // 800–1500 ms

    setTimeout(() => {
      const aiText = generateResponse(trimmed, {
        ...firestoreData.current,
        userData,
      })
      const aiMsg = { id: Date.now() + 1, role: 'ai', text: aiText, time: getTime() }
      setMessages((prev) => [...prev, aiMsg])
      setIsTyping(false)
    }, delay)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#0a0e1a' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-white/10 flex-shrink-0"
        style={{ backgroundColor: '#0d1120' }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #3380ff 0%, #7c3aed 100%)' }}
        >
          <Bot size={18} className="text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-white font-semibold text-base">Métrica IA</h1>
            <Sparkles size={14} className="text-yellow-400" />
          </div>
          <p className="text-xs text-gray-500">Assistente inteligente da Métrica</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-gray-500">Online</span>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-6 space-y-5">
        {messages.length === 0 ? (
          <WelcomeScreen onPrompt={(p) => sendMessage(p)} />
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            {isTyping && <TypingIndicator />}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div
        className="flex-shrink-0 px-3 sm:px-4 py-4 border-t border-white/10"
        style={{ backgroundColor: '#0d1120' }}
      >
        <div
          className="flex items-end gap-3 rounded-2xl border border-white/10 px-4 py-3 focus-within:border-blue-500/60 transition-colors"
          style={{ backgroundColor: '#151b30' }}
        >
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte algo à Métrica IA..."
            className="flex-1 resize-none bg-transparent text-sm text-white placeholder-gray-500 outline-none leading-relaxed max-h-32"
            style={{ scrollbarWidth: 'none' }}
            disabled={isTyping}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isTyping}
            className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
            style={{ backgroundColor: '#3380ff' }}
          >
            {isTyping ? (
              <Loader2 size={16} className="text-white animate-spin" />
            ) : (
              <Send size={16} className="text-white" />
            )}
          </button>
        </div>
        <p className="text-center text-xs text-gray-600 mt-2">
          Métrica IA pode cometer erros. Verifique informações importantes.
        </p>
      </div>
    </div>
  )
}
