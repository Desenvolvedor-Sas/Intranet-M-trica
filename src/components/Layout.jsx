import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import Sidebar from './Sidebar'

// ── Small logo SVG for mobile top bar ─────────────────────────────────────────
function MobileLogoMark() {
  return (
    <svg width="24" height="24" viewBox="0 0 40 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 4C10 1.8 11.8 0 14 0H30C32.2 0 34 1.8 34 4V24C34 26.2 32.2 28 30 28H22L16 34V28H14C11.8 28 10 26.2 10 24V4Z" fill="#E8A817" />
      <path d="M15 9C15 7.9 15.9 7 17 7H27C28.1 7 29 7.9 29 9V19C29 20.1 28.1 21 27 21H22L18 25V21H17C15.9 21 15 20.1 15 19V9Z" fill="#0f1425" />
      <path d="M4 16C4 14.3 5.3 13 7 13H12V19H7C5.3 19 4 17.7 4 16Z" fill="#E8A817" />
      <path d="M0 22C0 20.3 1.3 19 3 19H8V25H3C1.3 25 0 23.7 0 22Z" fill="#E8A817" />
      <rect x="5" y="15" width="5" height="2" rx="1" fill="#0f1425" />
      <rect x="2" y="21" width="4" height="2" rx="1" fill="#0f1425" />
    </svg>
  )
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div
      className="flex min-h-screen"
      style={{ background: 'var(--surface-0)' }}
    >
      {/* ── Sidebar ── */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-0">
        {/* ── Mobile top bar (hamburger) ── */}
        <header
          className="md:hidden flex items-center gap-3 px-4 shrink-0 sticky top-0 z-10"
          style={{
            background: 'var(--surface-50)',
            borderBottom: '1px solid var(--surface-200)',
            paddingTop: 'calc(env(safe-area-inset-top) + 12px)',
            paddingBottom: '12px',
          }}
        >
          <button
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="p-2.5 rounded-lg transition-colors duration-150"
            style={{ color: '#e2e8f0' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-100)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            aria-label={sidebarOpen ? 'Fechar menu' : 'Abrir menu'}
          >
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          {/* Logo + brand name for mobile */}
          <div className="flex items-center gap-2">
            <MobileLogoMark />
            <span className="font-semibold text-sm text-white tracking-tight">
              Intranet{' '}
              <span style={{ color: 'var(--brand-500)' }}>Métrica</span>
            </span>
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="flex-1 overflow-y-auto animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
