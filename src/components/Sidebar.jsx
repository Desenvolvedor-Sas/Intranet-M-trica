import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Calendar,
  Kanban,
  MessageCircle,
  Bot,
  Users,
  LogOut,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

// ── Brand mark: Métrica chat-bubble logo ──────────────────────────────────────
function LogoMark() {
  return (
    <svg width="44" height="44" viewBox="0 0 40 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 4C10 1.8 11.8 0 14 0H30C32.2 0 34 1.8 34 4V24C34 26.2 32.2 28 30 28H22L16 34V28H14C11.8 28 10 26.2 10 24V4Z" fill="#E8A817" />
      <path d="M15 9C15 7.9 15.9 7 17 7H27C28.1 7 29 7.9 29 9V19C29 20.1 28.1 21 27 21H22L18 25V21H17C15.9 21 15 20.1 15 19V9Z" fill="#0f1425" />
      <path d="M4 16C4 14.3 5.3 13 7 13H12V19H7C5.3 19 4 17.7 4 16Z" fill="#E8A817" />
      <path d="M0 22C0 20.3 1.3 19 3 19H8V25H3C1.3 25 0 23.7 0 22Z" fill="#E8A817" />
      <rect x="5" y="15" width="5" height="2" rx="1" fill="#0f1425" />
      <rect x="2" y="21" width="4" height="2" rx="1" fill="#0f1425" />
    </svg>
  )
}

// ── Single navigation item ─────────────────────────────────────────────────────
function NavItem({ to, icon: Icon, label, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
          'transition-all duration-150 relative',
          isActive
            ? 'text-white'
            : 'text-slate-400 hover:text-slate-100 hover:bg-white/5',
        ].join(' ')
      }
      style={({ isActive }) =>
        isActive
          ? {
              background:
                'linear-gradient(135deg, rgba(51,128,255,0.18) 0%, rgba(51,128,255,0.08) 100%)',
              boxShadow: 'inset 2px 0 0 var(--brand-500)',
            }
          : {}
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            size={18}
            strokeWidth={isActive ? 2.2 : 1.8}
            style={{ color: isActive ? 'var(--brand-500)' : 'inherit', flexShrink: 0 }}
          />
          <span className="truncate">{label}</span>
          {isActive && (
            <ChevronRight
              size={13}
              className="ml-auto opacity-60"
              style={{ color: 'var(--brand-500)' }}
            />
          )}
        </>
      )}
    </NavLink>
  )
}

// ── Section divider ────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <span
      className="px-3 text-[10px] font-semibold uppercase tracking-widest"
      style={{ color: 'var(--surface-500)' }}
    >
      {children}
    </span>
  )
}

// ── Sidebar ────────────────────────────────────────────────────────────────────
export default function Sidebar({ isOpen, onClose }) {
  const { userData, isDev, logout } = useAuth()

  const initials = userData?.name
    ? userData.name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    : '?'

  return (
    <>
      {/* ── Mobile backdrop overlay ── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar panel ── */}
      <aside
        className={[
          'fixed top-0 left-0 z-30 h-screen flex flex-col',
          'transition-transform duration-300 ease-in-out',
          'md:relative md:translate-x-0 md:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        style={{
          width: '256px',
          background: 'var(--surface-50)',
          borderRight: '1px solid var(--surface-200)',
        }}
      >
        {/* ── Brand header ── */}
        <div
          className="flex items-center gap-3 px-4 py-6 shrink-0"
          style={{ borderBottom: '1px solid var(--surface-200)' }}
        >
          <LogoMark />
          <div className="flex flex-col leading-tight">
            <span className="text-[17px] font-bold tracking-tight text-white">
              Métrica
            </span>
            <span
              className="text-[10px] font-medium leading-tight"
              style={{ color: 'var(--surface-500)' }}
            >
              Consultoria, Assessoria e Gestão
            </span>
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
          <SectionLabel>Principal</SectionLabel>

          <div className="mt-1 mb-3 flex flex-col gap-0.5">
            <NavItem to="/" icon={LayoutDashboard} label="Dashboard" end />
            <NavItem to="/agenda" icon={Calendar} label="Agenda" />
            <NavItem to="/projetos" icon={Kanban} label="Projetos" />
            <NavItem to="/chat" icon={MessageCircle} label="Chat" />
          </div>

          <SectionLabel>Ferramentas</SectionLabel>

          <div className="mt-1 mb-3 flex flex-col gap-0.5">
            <NavItem to="/metrica-ia" icon={Bot} label="Métrica IA" />
          </div>

          {/* Admin-only section */}
          {isDev && (
            <>
              <SectionLabel>Administração</SectionLabel>
              <div className="mt-1 flex flex-col gap-0.5">
                <NavItem to="/usuarios" icon={Users} label="Usuários" />
              </div>
            </>
          )}
        </nav>

        {/* ── User info + logout ── */}
        <div
          className="shrink-0 px-3 py-3"
          style={{ borderTop: '1px solid var(--surface-200)' }}
        >
          <div
            className="flex items-center gap-3 px-2 py-2.5 rounded-lg mb-1"
            style={{ background: 'var(--surface-100)' }}
          >
            {/* Avatar */}
            {userData?.avatar ? (
              <img
                src={userData.avatar}
                alt={userData.name}
                className="w-8 h-8 rounded-full object-cover shrink-0"
                style={{ border: '2px solid var(--surface-300)' }}
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 select-none"
                style={{
                  background:
                    'linear-gradient(135deg, var(--brand-500), var(--brand-600))',
                  color: '#fff',
                }}
              >
                {initials}
              </div>
            )}

            {/* Name + role */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white leading-tight truncate">
                {userData?.name ?? 'Usuário'}
              </p>
              <p
                className="text-[11px] leading-tight truncate"
                style={{ color: 'var(--surface-500)' }}
              >
                {userData?.role ?? 'Colaborador'}
              </p>
            </div>
          </div>

          {/* Logout button */}
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer"
            style={{ color: 'var(--surface-500)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,80,80,0.08)'
              e.currentTarget.style.color = '#ff6b6b'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--surface-500)'
            }}
          >
            <LogOut size={15} strokeWidth={2} />
            <span>Sair da conta</span>
          </button>
        </div>
      </aside>
    </>
  )
}
