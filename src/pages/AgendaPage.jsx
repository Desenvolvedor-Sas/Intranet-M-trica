import { useState, useEffect, useCallback } from 'react'
import {
  Calendar,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  X,
  Link2,
  Trash2,
  ExternalLink,
} from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  parseISO,
} from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_CONFIG = {
  Reunião: { color: '#3380ff', bg: 'rgba(51,128,255,0.15)', label: 'Reunião' },
  Tarefa: { color: '#22c55e', bg: 'rgba(34,197,94,0.15)', label: 'Tarefa' },
  Lembrete: { color: '#f97316', bg: 'rgba(249,115,22,0.15)', label: 'Lembrete' },
  Pessoal: { color: '#a855f7', bg: 'rgba(168,85,247,0.15)', label: 'Pessoal' },
}

const COMPARE_COLORS = ['#3380ff', '#f97316', '#a855f7', '#22c55e', '#ec4899']

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

function Avatar({ name, size = 24, colorIndex = 0 }) {
  const colors = ['#3380ff', '#22c55e', '#f97316', '#a855f7', '#ec4899', '#14b8a6']
  const bg = colors[colorIndex % colors.length]
  return (
    <span
      title={name}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: bg,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.38,
        fontWeight: 700,
        color: '#fff',
        flexShrink: 0,
        marginLeft: -4,
        border: '2px solid #151b30',
      }}
    >
      {getInitials(name)}
    </span>
  )
}

// ─── EventCard ───────────────────────────────────────────────────────────────

function EventCard({ event, users, compareColor, onCancel }) {
  const cfg = CATEGORY_CONFIG[event.category] || CATEGORY_CONFIG['Reunião']
  const dotColor = compareColor || cfg.color

  const participantNames = (event.participants || [])
    .map((uid) => users.find((u) => u.id === uid)?.displayName || uid)
    .filter(Boolean)

  return (
    <div
      style={{
        backgroundColor: '#151b30',
        border: `1px solid #1c2440`,
        borderLeft: `4px solid ${dotColor}`,
        borderRadius: 10,
        padding: '12px 14px',
        marginBottom: 10,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{event.title}</p>
          {event.description && (
            <p className="text-xs mt-0.5 truncate" style={{ color: '#8a9cc5' }}>
              {event.description}
            </p>
          )}
        </div>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
          style={{ backgroundColor: cfg.bg, color: cfg.color }}
        >
          {cfg.label}
        </span>
      </div>

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1" style={{ color: '#8a9cc5' }}>
          <Clock size={12} />
          <span className="text-xs">
            {event.timeStart}
            {event.timeEnd ? ` – ${event.timeEnd}` : ''}
          </span>
        </div>

        {participantNames.length > 0 && (
          <div className="flex items-center">
            <div style={{ display: 'flex', paddingLeft: 4 }}>
              {participantNames.slice(0, 4).map((name, i) => (
                <Avatar key={i} name={name} size={22} colorIndex={i} />
              ))}
              {participantNames.length > 4 && (
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    backgroundColor: '#1c2440',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 9,
                    fontWeight: 700,
                    color: '#8a9cc5',
                    marginLeft: -4,
                    border: '2px solid #151b30',
                  }}
                >
                  +{participantNames.length - 4}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Meeting link */}
      {event.meetingLink && (
        <div style={{ marginTop: 8 }}>
          <a
            href={event.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
            style={{
              backgroundColor: 'rgba(51,128,255,0.1)',
              border: '1px solid rgba(51,128,255,0.25)',
              color: '#3380ff',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(51,128,255,0.2)' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(51,128,255,0.1)' }}
          >
            <ExternalLink size={11} />
            Entrar na reunião
          </a>
        </div>
      )}

      {/* Cancel button */}
      {onCancel && (
        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={(e) => { e.stopPropagation(); onCancel(event.id) }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all"
            style={{
              backgroundColor: 'transparent',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#6b7280',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'
              e.currentTarget.style.color = '#ef4444'
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = '#6b7280'
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'
            }}
          >
            <Trash2 size={11} />
            Cancelar evento
          </button>
        </div>
      )}
    </div>
  )
}

// ─── AddEventModal ────────────────────────────────────────────────────────────

function AddEventModal({ onClose, selectedDate, users, currentUser }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    date: format(selectedDate, 'yyyy-MM-dd'),
    timeStart: '09:00',
    timeEnd: '10:00',
    category: 'Reunião',
    meetingLink: '',
    participants: currentUser?.uid ? [currentUser.uid] : [],
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const toggleParticipant = (uid) => {
    setForm((f) => ({
      ...f,
      participants: f.participants.includes(uid)
        ? f.participants.filter((id) => id !== uid)
        : [...f.participants, uid],
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('O título é obrigatório.'); return }
    setSaving(true)
    try {
      const dateObj = parseISO(form.date)
      await addDoc(collection(db, 'events'), {
        title: form.title.trim(),
        description: form.description.trim(),
        date: Timestamp.fromDate(dateObj),
        dateStr: form.date,
        timeStart: form.timeStart,
        timeEnd: form.timeEnd,
        category: form.category,
        meetingLink: form.meetingLink.trim(),
        participants: form.participants,
        createdBy: currentUser?.uid || null,
        createdAt: Timestamp.now(),
      })
      onClose()
    } catch (err) {
      console.error(err)
      setError('Erro ao salvar evento. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          backgroundColor: '#151b30',
          border: '1px solid #1c2440',
          borderRadius: 16,
          width: '100%',
          maxWidth: 520,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid #1c2440' }}
        >
          <div className="flex items-center gap-2">
            <Calendar size={18} color="#3380ff" />
            <span className="font-semibold text-white">Novo Evento</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 transition-colors"
            style={{ color: '#8a9cc5' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#8a9cc5')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          {error && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#f87171' }}>
              {error}
            </p>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#8a9cc5' }}>Título *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Ex: Reunião de sprint"
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none transition-colors"
              style={{ backgroundColor: '#0e1323', border: '1px solid #1c2440' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#3380ff')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#1c2440')}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#8a9cc5' }}>Descrição</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Detalhes do evento..."
              rows={2}
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none resize-none transition-colors"
              style={{ backgroundColor: '#0e1323', border: '1px solid #1c2440' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#3380ff')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#1c2440')}
            />
          </div>

          {/* Date + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#8a9cc5' }}>Data</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none transition-colors"
                style={{ backgroundColor: '#0e1323', border: '1px solid #1c2440', colorScheme: 'dark' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#3380ff')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#1c2440')}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#8a9cc5' }}>Categoria</label>
              <select
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none transition-colors"
                style={{ backgroundColor: '#0e1323', border: '1px solid #1c2440' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#3380ff')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#1c2440')}
              >
                {Object.keys(CATEGORY_CONFIG).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#8a9cc5' }}>Início</label>
              <input
                type="time"
                value={form.timeStart}
                onChange={(e) => set('timeStart', e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none transition-colors"
                style={{ backgroundColor: '#0e1323', border: '1px solid #1c2440', colorScheme: 'dark' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#3380ff')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#1c2440')}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#8a9cc5' }}>Fim</label>
              <input
                type="time"
                value={form.timeEnd}
                onChange={(e) => set('timeEnd', e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none transition-colors"
                style={{ backgroundColor: '#0e1323', border: '1px solid #1c2440', colorScheme: 'dark' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#3380ff')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#1c2440')}
              />
            </div>
          </div>

          {/* Meeting Link */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#8a9cc5' }}>
              <Link2 size={12} className="inline mr-1" />
              Link da reunião
            </label>
            <input
              type="url"
              value={form.meetingLink}
              onChange={(e) => set('meetingLink', e.target.value)}
              placeholder="https://meet.google.com/... ou https://zoom.us/..."
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none transition-colors"
              style={{ backgroundColor: '#0e1323', border: '1px solid #1c2440' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#3380ff')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#1c2440')}
            />
          </div>

          {/* Participants */}
          {users.length > 0 && (
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#8a9cc5' }}>
                <Users size={12} className="inline mr-1" />
                Participantes
              </label>
              <div
                className="flex flex-wrap gap-2 p-3 rounded-lg"
                style={{ backgroundColor: '#0e1323', border: '1px solid #1c2440', maxHeight: 140, overflowY: 'auto' }}
              >
                {users.map((u, i) => {
                  const selected = form.participants.includes(u.id)
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleParticipant(u.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                      style={{
                        backgroundColor: selected ? 'rgba(51,128,255,0.2)' : '#151b30',
                        border: `1px solid ${selected ? '#3380ff' : '#1c2440'}`,
                        color: selected ? '#3380ff' : '#8a9cc5',
                      }}
                    >
                      <Avatar name={u.displayName} size={16} colorIndex={i} />
                      {u.displayName}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: '#1c2440', color: '#8a9cc5' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#8a9cc5')}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-opacity"
              style={{ backgroundColor: '#3380ff', color: '#fff', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Salvando…' : 'Criar Evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AgendaPage() {
  const { user: currentUser, userData } = useAuth()

  // Navigation
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(new Date())

  // Data
  const [events, setEvents] = useState([])
  const [users, setUsers] = useState([])

  // Filters
  const [filterMode, setFilterMode] = useState('geral') // 'mine' | 'compare' | 'geral'
  const [compareUserId, setCompareUserId] = useState('')

  // UI
  const [showModal, setShowModal] = useState(false)
  const [loadingEvents, setLoadingEvents] = useState(true)

  // ── Fetch users ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'))
    const list = snap.docs.map((d) => ({ id: d.id, displayName: d.data().name, ...d.data() }))
        setUsers(list)
      } catch (err) {
        console.error('Error fetching users:', err)
      }
    }
    fetchUsers()
  }, [])

  // ── Fetch events (real-time) ─────────────────────────────────────────────────
  useEffect(() => {
    setLoadingEvents(true)
    const ref = collection(db, 'events')
    const unsubscribe = onSnapshot(ref, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      setEvents(list)
      setLoadingEvents(false)
    }, (err) => {
      console.error('Error fetching events:', err)
      setLoadingEvents(false)
    })
    return () => unsubscribe()
  }, [])

  // ── Calendar grid ────────────────────────────────────────────────────────────
  const calendarDays = (() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  })()

  // ── Filter events ────────────────────────────────────────────────────────────
  const filteredEvents = useCallback(() => {
    if (filterMode === 'mine') {
      return events.filter(
        (e) => e.createdBy === currentUser?.uid ||
               (e.participants || []).includes(currentUser?.uid)
      )
    }
    if (filterMode === 'compare' && compareUserId) {
      return events.filter(
        (e) =>
          e.createdBy === currentUser?.uid ||
          (e.participants || []).includes(currentUser?.uid) ||
          e.createdBy === compareUserId ||
          (e.participants || []).includes(compareUserId)
      )
    }
    return events // geral
  }, [events, filterMode, compareUserId, currentUser])()

  // ── Events for a specific day ────────────────────────────────────────────────
  const eventsForDay = (day) => {
    const dateStr = format(day, 'yyyy-MM-dd')
    return filteredEvents
      .filter((e) => {
        const eStr = e.dateStr || (e.date?.toDate ? format(e.date.toDate(), 'yyyy-MM-dd') : null)
        return eStr === dateStr
      })
      .sort((a, b) => (a.timeStart || '').localeCompare(b.timeStart || ''))
  }

  const selectedDayEvents = eventsForDay(selectedDay)

  // ── Dot colors for calendar ───────────────────────────────────────────────────
  const dotsForDay = (day) => {
    const evs = eventsForDay(day)
    if (evs.length === 0) return []
    const colors = [...new Set(evs.map((e) => (CATEGORY_CONFIG[e.category] || CATEGORY_CONFIG['Reunião']).color))]
    return colors.slice(0, 3)
  }

  // ── Compare color helper ─────────────────────────────────────────────────────
  const getCompareColor = (event) => {
    if (filterMode !== 'compare' || !compareUserId) return null
    const isMine =
      event.createdBy === currentUser?.uid ||
      (event.participants || []).includes(currentUser?.uid)
    const isTheirs =
      event.createdBy === compareUserId ||
      (event.participants || []).includes(compareUserId)
    if (isMine && isTheirs) return '#22c55e'
    if (isTheirs) return COMPARE_COLORS[1]
    return COMPARE_COLORS[0]
  }

  const compareUser = users.find((u) => u.id === compareUserId)

  // ── Cancel event ──────────────────────────────────────────────────────────
  const handleCancelEvent = async (eventId) => {
    if (!window.confirm('Tem certeza que deseja cancelar este evento?')) return
    try {
      await deleteDoc(doc(db, 'events', eventId))
    } catch (err) {
      console.error('Erro ao cancelar evento:', err)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 lg:p-8 min-h-screen" style={{ color: '#fff' }}>

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-xl"
            style={{ backgroundColor: 'rgba(51,128,255,0.12)', border: '1px solid rgba(51,128,255,0.25)' }}
          >
            <Calendar size={22} color="#3380ff" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Agenda</h1>
            <p className="text-xs" style={{ color: '#8a9cc5' }}>Gerencie eventos e compromissos</p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#3380ff', color: '#fff' }}
        >
          <Plus size={16} />
          Novo Evento
        </button>
      </div>

      {/* ── Filters ── */}
      <div
        className="flex flex-wrap items-center gap-3 mb-6 p-4 rounded-xl"
        style={{ backgroundColor: '#151b30', border: '1px solid #1c2440' }}
      >
        <Filter size={15} color="#8a9cc5" />
        <span className="text-xs font-medium mr-1" style={{ color: '#8a9cc5' }}>Visualizar:</span>

        {/* Minha Agenda */}
        <button
          onClick={() => setFilterMode(filterMode === 'mine' ? 'geral' : 'mine')}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{
            backgroundColor: filterMode === 'mine' ? 'rgba(51,128,255,0.2)' : '#1c2440',
            border: `1px solid ${filterMode === 'mine' ? '#3380ff' : '#2a3350'}`,
            color: filterMode === 'mine' ? '#3380ff' : '#8a9cc5',
          }}
        >
          Minha Agenda
        </button>

        {/* Ver Geral */}
        <button
          onClick={() => setFilterMode('geral')}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{
            backgroundColor: filterMode === 'geral' ? 'rgba(34,197,94,0.15)' : '#1c2440',
            border: `1px solid ${filterMode === 'geral' ? '#22c55e' : '#2a3350'}`,
            color: filterMode === 'geral' ? '#22c55e' : '#8a9cc5',
          }}
        >
          Ver Geral
        </button>

        {/* Comparar com colega */}
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: '#8a9cc5' }}>Comparar com colega:</span>
          <select
            value={compareUserId}
            onChange={(e) => {
              setCompareUserId(e.target.value)
              if (e.target.value) setFilterMode('compare')
              else if (filterMode === 'compare') setFilterMode('geral')
            }}
            className="rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
            style={{
              backgroundColor: '#0e1323',
              border: `1px solid ${filterMode === 'compare' ? '#f97316' : '#2a3350'}`,
              color: compareUserId ? '#fff' : '#8a9cc5',
            }}
          >
            <option value="">Selecionar...</option>
            {users
              .filter((u) => u.id !== currentUser?.uid)
              .map((u) => (
                <option key={u.id} value={u.id}>{u.displayName || u.email}</option>
              ))}
          </select>
        </div>

        {/* Compare legend */}
        {filterMode === 'compare' && compareUser && (
          <div className="flex items-center gap-3 ml-2">
            <div className="flex items-center gap-1.5">
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: COMPARE_COLORS[0], display: 'inline-block' }} />
              <span className="text-xs" style={{ color: '#8a9cc5' }}>Eu</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: COMPARE_COLORS[1], display: 'inline-block' }} />
              <span className="text-xs" style={{ color: '#8a9cc5' }}>{compareUser.displayName || compareUser.email}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
              <span className="text-xs" style={{ color: '#8a9cc5' }}>Ambos</span>
            </div>
          </div>
        )}

        {/* Category legend */}
        {filterMode !== 'compare' && (
          <div className="flex items-center gap-3 ml-auto flex-wrap">
            {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: cfg.color, display: 'inline-block' }} />
                <span className="text-xs" style={{ color: '#8a9cc5' }}>{key}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Main layout ── */}
      <div className="flex flex-col lg:flex-row gap-5">

        {/* ── Calendar ── */}
        <div
          className="flex-1 rounded-2xl p-4 sm:p-5"
          style={{ backgroundColor: '#151b30', border: '1px solid #1c2440', minWidth: 0 }}
        >
          {/* Month nav */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: '#8a9cc5', backgroundColor: '#1c2440' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#8a9cc5')}
            >
              <ChevronLeft size={16} />
            </button>

            <h2 className="text-base font-bold text-white capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h2>

            <button
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: '#8a9cc5', backgroundColor: '#1c2440' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#8a9cc5')}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-xs font-semibold py-1" style={{ color: '#8a9cc5' }}>
                <span className="hidden sm:inline">{d}</span>
                <span className="sm:hidden">{d.charAt(0)}</span>
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-0.5">
            {calendarDays.map((day) => {
              const dots = dotsForDay(day)
              const inMonth = isSameMonth(day, currentMonth)
              const isSelected = isSameDay(day, selectedDay)
              const todayDay = isToday(day)

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(day)}
                  className="relative flex flex-col items-center rounded-xl py-1 sm:py-2 transition-all"
                  style={{
                    backgroundColor: isSelected
                      ? '#3380ff'
                      : todayDay
                      ? 'rgba(51,128,255,0.1)'
                      : 'transparent',
                    border: todayDay && !isSelected ? '1px solid rgba(51,128,255,0.35)' : '1px solid transparent',
                    opacity: inMonth ? 1 : 0.3,
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(51,128,255,0.08)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected)
                      e.currentTarget.style.backgroundColor = todayDay
                        ? 'rgba(51,128,255,0.1)'
                        : 'transparent'
                  }}
                >
                  <span
                    className="text-xs sm:text-sm font-semibold leading-none"
                    style={{ color: isSelected ? '#fff' : todayDay ? '#3380ff' : inMonth ? '#d0daf5' : '#4a5577' }}
                  >
                    {format(day, 'd')}
                  </span>
                  {/* Event dots */}
                  <div className="flex gap-0.5 mt-1 h-1.5">
                    {dots.map((color, i) => (
                      <span
                        key={i}
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          backgroundColor: isSelected ? 'rgba(255,255,255,0.8)' : color,
                          display: 'inline-block',
                        }}
                      />
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Day Events Panel ── */}
        <div
          className="w-full lg:w-80 xl:w-96 rounded-2xl p-4 sm:p-5 flex flex-col"
          style={{ backgroundColor: '#151b30', border: '1px solid #1c2440', minWidth: 0 }}
        >
          {/* Panel header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-bold text-white capitalize">
                {format(selectedDay, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#8a9cc5' }}>
                {selectedDayEvents.length === 0
                  ? 'Nenhum evento'
                  : `${selectedDayEvents.length} evento${selectedDayEvents.length > 1 ? 's' : ''}`}
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="p-2 rounded-lg transition-colors"
              style={{ backgroundColor: 'rgba(51,128,255,0.12)', color: '#3380ff', border: '1px solid rgba(51,128,255,0.25)' }}
              title="Adicionar evento neste dia"
            >
              <Plus size={15} />
            </button>
          </div>

          {/* Events list */}
          <div className="flex-1 overflow-y-auto pr-1" style={{ maxHeight: 480 }}>
            {loadingEvents ? (
              <div className="flex flex-col gap-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="rounded-xl h-16 animate-pulse"
                    style={{ backgroundColor: '#1c2440' }}
                  />
                ))}
              </div>
            ) : selectedDayEvents.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-12 rounded-xl"
                style={{ border: '1px dashed #1c2440' }}
              >
                <Calendar size={32} color="#2a3350" />
                <p className="text-sm mt-3 font-medium" style={{ color: '#4a5577' }}>
                  Sem eventos neste dia
                </p>
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-3 text-xs font-semibold transition-opacity hover:opacity-80"
                  style={{ color: '#3380ff' }}
                >
                  + Adicionar evento
                </button>
              </div>
            ) : (
              selectedDayEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  users={users}
                  compareColor={getCompareColor(event)}
                  onCancel={handleCancelEvent}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <AddEventModal
          onClose={() => setShowModal(false)}
          selectedDate={selectedDay}
          users={users}
          currentUser={currentUser}
        />
      )}
    </div>
  )
}
