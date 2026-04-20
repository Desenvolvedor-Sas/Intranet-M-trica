import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import Sidebar from './Sidebar'

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
          className="md:hidden flex items-center gap-3 px-4 py-3 shrink-0 sticky top-0 z-10"
          style={{
            background: 'var(--surface-50)',
            borderBottom: '1px solid var(--surface-200)',
          }}
        >
          <button
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="p-2 rounded-lg transition-colors duration-150"
            style={{ color: '#e2e8f0' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-100)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            aria-label={sidebarOpen ? 'Fechar menu' : 'Abrir menu'}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Inline brand name for mobile */}
          <span className="font-semibold text-sm text-white tracking-tight">
            Intranet{' '}
            <span style={{ color: 'var(--brand-500)' }}>Métrica</span>
          </span>
        </header>

        {/* ── Page content ── */}
        <main className="flex-1 overflow-y-auto animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
