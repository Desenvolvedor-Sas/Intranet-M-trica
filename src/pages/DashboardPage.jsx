import { useMemo, useState, useEffect, useRef } from 'react'
import {
  FolderKanban,
  Calendar,
  MessageCircle,
  CheckSquare,
  TrendingUp,
  Clock,
  ArrowRight,
  Bot,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuth } from '../contexts/AuthContext'

// ─── helpers ────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

// ─── mock data ───────────────────────────────────────────────────────────────

const STATS = [
  {
    label: 'Projetos Ativos',
    value: 0,
    icon: FolderKanban,
    color: '#3380ff',
    glow: 'rgba(51,128,255,0.35)',
    bg: 'rgba(51,128,255,0.12)',
    border: 'rgba(51,128,255,0.25)',
    delta: 'Nenhum projeto',
    deltaUp: false,
  },
  {
    label: 'Eventos Hoje',
    value: 0,
    icon: Calendar,
    color: '#22c55e',
    glow: 'rgba(34,197,94,0.35)',
    bg: 'rgba(34,197,94,0.12)',
    border: 'rgba(34,197,94,0.25)',
    delta: 'Sem eventos',
    deltaUp: false,
  },
  {
    label: 'Mensagens',
    value: 0,
    icon: MessageCircle,
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.35)',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.25)',
    delta: 'Nenhuma nova',
    deltaUp: false,
  },
  {
    label: 'Tarefas Pendentes',
    value: 0,
    icon: CheckSquare,
    color: '#a855f7',
    glow: 'rgba(168,85,247,0.35)',
    bg: 'rgba(168,85,247,0.12)',
    border: 'rgba(168,85,247,0.25)',
    delta: 'Tudo em dia',
    deltaUp: false,
  },
]

const ACTIVITY = []

const SHORTCUTS = [
  { label: 'Agenda', icon: Calendar, color: '#22c55e', bg: 'rgba(34,197,94,0.12)', glow: 'rgba(34,197,94,0.3)', href: '/agenda' },
  { label: 'Projetos', icon: FolderKanban, color: '#3380ff', bg: 'rgba(51,128,255,0.12)', glow: 'rgba(51,128,255,0.3)', href: '/projetos' },
  { label: 'Chat', icon: MessageCircle, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', glow: 'rgba(245,158,11,0.3)', href: '/chat' },
  { label: 'Métrica IA', icon: Bot, color: '#a855f7', bg: 'rgba(168,85,247,0.12)', glow: 'rgba(168,85,247,0.3)', href: '/metrica-ia' },
]

const BAR_DATA = [
  { day: 'Seg', value: 0 },
  { day: 'Ter', value: 0 },
  { day: 'Qua', value: 0 },
  { day: 'Qui', value: 0 },
  { day: 'Sex', value: 0 },
  { day: 'Sáb', value: 0 },
  { day: 'Dom', value: 0 },
]
const BAR_MAX = 10
const Y_TICKS = [0, 3, 6, 9]

// Days with mock events for the calendar
const EVENT_DAYS = new Set([])

const TEAM_MEMBERS = []

const COMPLETION_PCT = 0

// ─── sub-components ──────────────────────────────────────────────────────────

function StatCard({ stat }) {
  const Icon = stat.icon
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: '#151b30',
        border: `1px solid ${hovered ? stat.border : '#1c2440'}`,
        borderRadius: '16px',
        padding: '20px',
        cursor: 'default',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered
          ? `0 8px 32px ${stat.glow}, 0 0 0 1px ${stat.border}`
          : '0 1px 4px rgba(0,0,0,0.3)',
        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle gradient top-line accent */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: `linear-gradient(90deg, transparent, ${stat.color}, transparent)`,
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.25s ease',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '12px',
            backgroundColor: stat.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: hovered ? `0 0 16px ${stat.glow}` : 'none',
            transition: 'box-shadow 0.25s ease',
          }}
        >
          <Icon size={22} style={{ color: stat.color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: '#6b7280', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {stat.label}
          </p>
          <p style={{ color: '#fff', fontSize: '28px', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em' }}>
            {stat.value}
          </p>
          <p style={{ color: stat.deltaUp ? '#22c55e' : '#6b7280', fontSize: '11px', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {stat.delta}
          </p>
        </div>
      </div>
    </div>
  )
}

function ActivityFeed() {
  return (
    <div style={{ backgroundColor: '#151b30', border: '1px solid #1c2440', borderRadius: '16px', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ color: '#fff', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <Clock size={14} style={{ color: '#3380ff' }} />
          Atividade Recente
        </h2>
        <button
          style={{
            background: 'none',
            border: 'none',
            color: '#3380ff',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            opacity: 0.8,
            padding: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.8)}
        >
          Ver tudo <ArrowRight size={12} />
        </button>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {ACTIVITY.length === 0 ? (
          <li style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', color: '#374151' }}>
            <Clock size={28} style={{ marginBottom: '12px', opacity: 0.4 }} />
            <p style={{ fontSize: '13px', fontWeight: 500, margin: 0 }}>Nenhuma atividade recente</p>
            <p style={{ fontSize: '11px', marginTop: '4px', margin: '4px 0 0 0' }}>As atividades aparecerão aqui conforme você usar o sistema</p>
          </li>
        ) : (
        ACTIVITY.map((item) => {
          const Icon = item.icon
          return (
            <li
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '10px 10px 10px 12px',
                borderRadius: '10px',
                borderLeft: `3px solid ${item.borderColor}`,
                backgroundColor: 'rgba(255,255,255,0.02)',
                marginBottom: '6px',
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '8px',
                  backgroundColor: `${item.color}18`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon size={13} style={{ color: item.color }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: '#d1d5db', fontSize: '12px', lineHeight: '1.5', margin: 0 }}>{item.text}</p>
                <p style={{ color: '#4b5563', fontSize: '11px', marginTop: '3px', margin: '3px 0 0 0' }}>{item.time}</p>
              </div>
            </li>
          )
        })
        )}
      </ul>
    </div>
  )
}

function QuickAccess() {
  return (
    <div style={{ backgroundColor: '#151b30', border: '1px solid #1c2440', borderRadius: '16px', padding: '20px' }}>
      <h2 style={{ color: '#fff', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', margin: '0 0 16px 0' }}>
        <Sparkles size={14} style={{ color: '#f59e0b' }} />
        Acesso Rápido
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {SHORTCUTS.map((s) => {
          const Icon = s.icon
          return (
            <ShortcutCard key={s.label} shortcut={s} Icon={Icon} />
          )
        })}
      </div>
    </div>
  )
}

function ShortcutCard({ shortcut: s, Icon }) {
  const [hovered, setHovered] = useState(false)
  return (
    <a
      href={s.href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        padding: '18px 8px',
        borderRadius: '12px',
        border: `1px solid ${hovered ? s.color + '44' : '#1c2440'}`,
        backgroundColor: hovered ? s.bg : 'rgba(255,255,255,0.02)',
        textDecoration: 'none',
        cursor: 'pointer',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered ? `0 4px 20px ${s.glow}` : 'none',
        transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '10px',
          backgroundColor: s.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: hovered ? `0 0 18px ${s.glow}` : 'none',
          transition: 'box-shadow 0.2s ease',
        }}
      >
        <Icon size={19} style={{ color: s.color }} />
      </div>
      <span style={{ fontSize: '11px', color: hovered ? '#e5e7eb' : '#9ca3af', fontWeight: 500, transition: 'color 0.2s ease' }}>
        {s.label}
      </span>
    </a>
  )
}

function MiniCalendar() {
  const today = new Date()
  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startDow = getDay(monthStart)
  const leadingBlanks = startDow === 0 ? 6 : startDow - 1
  const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

  return (
    <div style={{ backgroundColor: '#151b30', border: '1px solid #1c2440', borderRadius: '16px', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ color: '#fff', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <Calendar size={14} style={{ color: '#3380ff' }} />
          {format(today, 'MMMM yyyy', { locale: ptBR }).replace(/^\w/, (c) => c.toUpperCase())}
        </h2>
      </div>

      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '6px' }}>
        {weekDays.map((d) => (
          <div key={d} style={{ textAlign: 'center', color: '#4b5563', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', padding: '4px 0' }}>
            {d.charAt(0)}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`b-${i}`} />
        ))}
        {days.map((day) => {
          const dayNum = parseInt(format(day, 'd'), 10)
          const todayDay = isToday(day)
          const hasEvent = EVENT_DAYS.has(dayNum)
          return (
            <div
              key={day.toISOString()}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '30px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: todayDay ? 700 : 400,
                cursor: 'default',
                backgroundColor: todayDay ? '#3380ff' : 'transparent',
                color: todayDay ? '#fff' : '#6b7280',
                boxShadow: todayDay ? '0 0 12px rgba(51,128,255,0.5)' : 'none',
                position: 'relative',
                gap: '1px',
              }}
            >
              {format(day, 'd')}
              {hasEvent && !todayDay && (
                <div style={{ width: 3, height: 3, borderRadius: '50%', backgroundColor: '#3380ff', position: 'absolute', bottom: 3 }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BarChart() {
  const [animated, setAnimated] = useState(false)
  const [tooltip, setTooltip] = useState(null)
  const todayIndex = new Date().getDay()
  // 0=Sun,1=Mon…6=Sat → map to our array index Mon=0…Sun=6
  const currentBarIndex = todayIndex === 0 ? 6 : todayIndex - 1

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{ backgroundColor: '#151b30', border: '1px solid #1c2440', borderRadius: '16px', padding: '20px', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ color: '#fff', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <TrendingUp size={14} style={{ color: '#3380ff' }} />
          Tarefas Concluídas
        </h2>
        <span style={{ fontSize: '11px', color: '#3380ff', backgroundColor: 'rgba(51,128,255,0.12)', padding: '3px 10px', borderRadius: '20px', border: '1px solid rgba(51,128,255,0.2)' }}>
          Esta semana
        </span>
      </div>

      <div style={{ display: 'flex', gap: '16px' }}>
        {/* Y-axis labels */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '120px', paddingBottom: '20px' }}>
          {[...Y_TICKS].reverse().map((t) => (
            <span key={t} style={{ color: '#374151', fontSize: '10px', lineHeight: 1 }}>{t}</span>
          ))}
        </div>

        {/* Chart area */}
        <div style={{ flex: 1, position: 'relative' }}>
          {/* Grid lines */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100px', pointerEvents: 'none' }}>
            {Y_TICKS.map((t) => (
              <div
                key={t}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: `${(t / BAR_MAX) * 100}%`,
                  borderTop: '1px solid rgba(255,255,255,0.04)',
                }}
              />
            ))}
          </div>

          {/* Bars + labels */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '100px' }}>
            {BAR_DATA.map((bar, i) => {
              const isActive = i === currentBarIndex
              const heightPct = animated ? Math.round((bar.value / BAR_MAX) * 100) : 0
              return (
                <div
                  key={bar.day}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0', height: '100%', justifyContent: 'flex-end', position: 'relative' }}
                  onMouseEnter={() => setTooltip(i)}
                  onMouseLeave={() => setTooltip(null)}
                >
                  {/* Tooltip */}
                  {tooltip === i && (
                    <div style={{
                      position: 'absolute',
                      bottom: `calc(${heightPct}% + 10px)`,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: '#0a0e1a',
                      border: '1px solid #1c2440',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      color: '#fff',
                      whiteSpace: 'nowrap',
                      zIndex: 10,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                      pointerEvents: 'none',
                    }}>
                      <span style={{ color: '#3380ff', fontWeight: 700 }}>{bar.value}</span>
                      <span style={{ color: '#6b7280' }}> tarefas</span>
                    </div>
                  )}
                  <div
                    style={{
                      width: '100%',
                      height: `${heightPct}%`,
                      borderRadius: '6px 6px 3px 3px',
                      background: isActive
                        ? 'linear-gradient(180deg, #60a5fa 0%, #3380ff 100%)'
                        : 'linear-gradient(180deg, rgba(51,128,255,0.5) 0%, rgba(51,128,255,0.2) 100%)',
                      boxShadow: isActive ? '0 0 16px rgba(51,128,255,0.4)' : 'none',
                      transition: 'height 0.7s cubic-bezier(0.4,0,0.2,1)',
                      cursor: 'pointer',
                    }}
                  />
                </div>
              )
            })}
          </div>

          {/* Day labels */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
            {BAR_DATA.map((bar, i) => (
              <div key={bar.day} style={{ flex: 1, textAlign: 'center', color: i === currentBarIndex ? '#3380ff' : '#4b5563', fontSize: '10px', fontWeight: i === currentBarIndex ? 600 : 400 }}>
                {bar.day}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function DonutChart() {
  const pct = COMPLETION_PCT
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 200)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{ backgroundColor: '#151b30', border: '1px solid #1c2440', borderRadius: '16px', padding: '20px' }}>
      <h2 style={{ color: '#fff', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', margin: '0 0 20px 0' }}>
        <Zap size={14} style={{ color: '#22c55e' }} />
        Conclusão de Projetos
      </h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        {/* Ring */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg width={104} height={104} style={{ transform: 'rotate(-90deg)' }}>
            {/* Track */}
            <circle cx={52} cy={52} r={radius} fill="none" stroke="#1c2440" strokeWidth={10} />
            {/* Progress */}
            <circle
              cx={52}
              cy={52}
              r={radius}
              fill="none"
              stroke="url(#donutGrad)"
              strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={animated ? offset : circumference}
              style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
            />
            <defs>
              <linearGradient id="donutGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#3380ff" />
              </linearGradient>
            </defs>
          </svg>
          {/* Center label */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: '20px', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1 }}>{pct}%</span>
            <span style={{ color: '#6b7280', fontSize: '9px', marginTop: '2px' }}>completo</span>
          </div>
        </div>

        {/* Legend */}
        <div style={{ flex: 1 }}>
          <p style={{ color: '#d1d5db', fontSize: '12px', lineHeight: 1.5, margin: '0 0 12px 0' }}>
            Acompanhe a taxa de conclusão dos seus projetos em tempo real.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <LegendDot color="#22c55e" label="No prazo" />
            <LegendDot color="#f59e0b" label="Em atenção" />
            <LegendDot color="#ef4444" label="Atrasados" />
          </div>
        </div>
      </div>
    </div>
  )
}

function LegendDot({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
      <span style={{ color: '#6b7280', fontSize: '11px' }}>{label}</span>
    </div>
  )
}

function TeamPerformance() {
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 300)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{ backgroundColor: '#151b30', border: '1px solid #1c2440', borderRadius: '16px', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ color: '#fff', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <Users size={14} style={{ color: '#a855f7' }} />
          Desempenho da Equipe
        </h2>
        <span style={{ fontSize: '11px', color: '#6b7280' }}>Tarefas concluídas</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {TEAM_MEMBERS.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', color: '#374151' }}>
            <Users size={24} style={{ marginBottom: '10px', opacity: 0.4 }} />
            <p style={{ fontSize: '12px', fontWeight: 500, margin: 0 }}>Sem dados de desempenho</p>
            <p style={{ fontSize: '11px', marginTop: '4px', margin: '4px 0 0 0' }}>Cadastre membros para acompanhar</p>
          </div>
        ) : (
        TEAM_MEMBERS.map((member) => (
          <div key={member.name}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div>
                <span style={{ color: '#e5e7eb', fontSize: '12px', fontWeight: 500 }}>{member.name}</span>
                <span style={{ color: '#4b5563', fontSize: '11px', marginLeft: '8px' }}>{member.role}</span>
              </div>
              <span style={{ color: member.color, fontSize: '12px', fontWeight: 700 }}>{member.progress}%</span>
            </div>
            {/* Track */}
            <div style={{ height: '6px', backgroundColor: '#1c2440', borderRadius: '999px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: animated ? `${member.progress}%` : '0%',
                  borderRadius: '999px',
                  background: `linear-gradient(90deg, ${member.color}99, ${member.color})`,
                  boxShadow: `0 0 8px ${member.color}55`,
                  transition: 'width 1s cubic-bezier(0.4,0,0.2,1)',
                }}
              />
            </div>
          </div>
        ))
        )}
      </div>
    </div>
  )
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { userData } = useAuth()
  const greeting = useMemo(() => getGreeting(), [])
  const userName = userData?.name?.split(' ')[0] ?? 'Usuário'
  const todayStr = useMemo(
    () => format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR }),
    []
  )

  return (
    <div style={{ minHeight: '100%', padding: '32px', backgroundColor: '#0a0e1a' }}>
      {/* Page header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <h1 style={{ color: '#fff', fontSize: '26px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
            {greeting}, {userName}
            <span style={{ color: '#3380ff' }}>.</span>
          </h1>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            backgroundColor: 'rgba(51,128,255,0.1)', border: '1px solid rgba(51,128,255,0.2)',
            borderRadius: '20px', padding: '3px 10px',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
            <span style={{ color: '#22c55e', fontSize: '11px', fontWeight: 500 }}>Online</span>
          </div>
        </div>
        <p style={{ color: '#4b5563', fontSize: '13px', margin: 0, textTransform: 'capitalize' }}>{todayStr}</p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {STATS.map((s) => (
          <StatCard key={s.label} stat={s} />
        ))}
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
        {/* Left column — activity + bar chart */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <ActivityFeed />
          <BarChart />
          {/* Donut + Team side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <DonutChart />
            <TeamPerformance />
          </div>
        </div>

        {/* Right column — quick access + calendar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <QuickAccess />
          <MiniCalendar />
        </div>
      </div>
    </div>
  )
}
