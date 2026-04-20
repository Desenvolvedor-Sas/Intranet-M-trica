import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'

// Pages
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AgendaPage from './pages/AgendaPage'
import ProjetosPage from './pages/ProjetosPage'
import ChatPage from './pages/ChatPage'
import MetricaIAPage from './pages/MetricaIAPage'
import UsuariosPage from './pages/UsuariosPage'

// Full-screen loading spinner shown while auth state is being resolved
function LoadingScreen() {
  return (
    <div
      className="flex items-center justify-center min-h-screen"
      style={{ background: 'var(--surface-0)' }}
    >
      <div className="flex flex-col items-center gap-4">
        {/* Animated brand ring */}
        <div
          className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--surface-300)', borderTopColor: 'var(--brand-500)' }}
        />
        <span
          className="text-sm font-medium tracking-widest uppercase"
          style={{ color: 'var(--surface-500)' }}
        >
          Carregando…
        </span>
      </div>
    </div>
  )
}

// Guards a route: redirects to /login if not authenticated
function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  return user ? children : <Navigate to="/login" replace />
}

// Guards the /usuarios route: only accessible to Desenvolvedor role
function DevRoute({ children }) {
  const { isDev, loading } = useAuth()
  if (loading) return <LoadingScreen />
  return isDev ? children : <Navigate to="/" replace />
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return <LoadingScreen />

  // Unauthenticated: only the login route is reachable
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  // Authenticated: wrap all pages in the Layout (Sidebar + content area)
  return (
    <Routes>
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="agenda" element={<AgendaPage />} />
        <Route path="projetos" element={<ProjetosPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="metrica-ia" element={<MetricaIAPage />} />
        <Route
          path="usuarios"
          element={
            <DevRoute>
              <UsuariosPage />
            </DevRoute>
          }
        />
      </Route>

      {/* Redirect authenticated users away from /login */}
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
