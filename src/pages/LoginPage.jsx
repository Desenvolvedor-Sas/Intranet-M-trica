import { useState, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Lock, Mail, ArrowRight, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60)
    return () => clearTimeout(t)
  }, [])

  if (user) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email.trim(), password)
      navigate('/')
    } catch (err) {
      const msgs = {
        'auth/invalid-credential': 'Email ou senha incorretos.',
        'auth/user-not-found': 'Usuário não encontrado.',
        'auth/wrong-password': 'Senha incorreta.',
        'auth/too-many-requests': 'Muitas tentativas. Aguarde um momento.',
      }
      setError(msgs[err.code] || `Erro: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: '#0a0e1a', fontFamily: "'Outfit', sans-serif" }}
    >
      {/* ── Geometric background ── */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none select-none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          {/* Larger, more dramatic blue glows */}
          <radialGradient id="glow1" cx="20%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#3380ff" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#0a0e1a" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="glow2" cx="80%" cy="70%" r="55%">
            <stop offset="0%" stopColor="#1a5ff5" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#0a0e1a" stopOpacity="0" />
          </radialGradient>
          {/* Center gold accent glow */}
          <radialGradient id="glow3" cx="50%" cy="38%" r="35%">
            <stop offset="0%" stopColor="#E8A817" stopOpacity="0.07" />
            <stop offset="100%" stopColor="#0a0e1a" stopOpacity="0" />
          </radialGradient>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#1c2440" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <rect width="100%" height="100%" fill="url(#glow1)" />
        <rect width="100%" height="100%" fill="url(#glow2)" />
        <rect width="100%" height="100%" fill="url(#glow3)" />

        {/* Decorative geometric lines */}
        <line x1="0" y1="100%" x2="38%" y2="0" stroke="#3380ff" strokeOpacity="0.06" strokeWidth="1" />
        <line x1="100%" y1="0" x2="62%" y2="100%" stroke="#1a5ff5" strokeOpacity="0.06" strokeWidth="1" />
        <polygon
          points="900,50 970,180 830,180"
          fill="none"
          stroke="#3380ff"
          strokeOpacity="0.12"
          strokeWidth="1"
        />
        <polygon
          points="50,800 110,920 -10,920"
          fill="none"
          stroke="#1a5ff5"
          strokeOpacity="0.10"
          strokeWidth="1"
        />
        <circle cx="15%" cy="12%" r="80" fill="none" stroke="#3380ff" strokeOpacity="0.05" strokeWidth="1" />
        <circle cx="85%" cy="88%" r="110" fill="none" stroke="#1a5ff5" strokeOpacity="0.05" strokeWidth="1" />
      </svg>

      {/* ── Card ── */}
      <div
        className="relative z-10 w-full max-w-lg mx-4"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 0.55s cubic-bezier(.4,0,.2,1), transform 0.55s cubic-bezier(.4,0,.2,1)',
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">

          {/* "Intranet Corporativa" badge */}
          <div
            className="mb-6 px-4 py-1 rounded-full text-xs font-semibold tracking-widest uppercase"
            style={{
              backgroundColor: 'rgba(232,168,23,0.10)',
              border: '1px solid rgba(232,168,23,0.30)',
              color: '#E8A817',
              letterSpacing: '0.18em',
            }}
          >
            Intranet Corporativa
          </div>

          {/* Company Logo Icon — gold glow backdrop + animated pulse */}
          <div className="mb-5 relative flex items-center justify-center">
            {/* Outer pulse ring */}
            <span className="logo-pulse-outer absolute rounded-full" />
            {/* Inner glow blob */}
            <span className="logo-glow absolute rounded-full" />
            <svg
              className="relative z-10 sm:w-20 sm:h-20 w-16 h-16"
              viewBox="0 0 40 44"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M10 4C10 1.8 11.8 0 14 0H30C32.2 0 34 1.8 34 4V24C34 26.2 32.2 28 30 28H22L16 34V28H14C11.8 28 10 26.2 10 24V4Z" fill="#E8A817" />
              <path d="M15 9C15 7.9 15.9 7 17 7H27C28.1 7 29 7.9 29 9V19C29 20.1 28.1 21 27 21H22L18 25V21H17C15.9 21 15 20.1 15 19V9Z" fill="#0a0e1a" />
              <path d="M4 16C4 14.3 5.3 13 7 13H12V19H7C5.3 19 4 17.7 4 16Z" fill="#E8A817" />
              <path d="M0 22C0 20.3 1.3 19 3 19H8V25H3C1.3 25 0 23.7 0 22Z" fill="#E8A817" />
              <rect x="5" y="15" width="5" height="2" rx="1" fill="#0a0e1a" />
              <rect x="2" y="21" width="4" height="2" rx="1" fill="#0a0e1a" />
            </svg>
          </div>

          <h1
            className="text-4xl sm:text-5xl font-bold tracking-widest"
            style={{
              background: 'linear-gradient(135deg, #ffffff 40%, #E8A817 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '0.25em',
            }}
          >
            MÉTRICA
          </h1>
          <p className="mt-1 text-xs tracking-wider" style={{ color: '#4a5578' }}>
            Consultoria, Assessoria e Gestão Ltda.
          </p>
          <p className="mt-3 text-sm tracking-wider" style={{ color: '#4a5578' }}>
            Acesse sua conta corporativa
          </p>
        </div>

        {/* Form card */}
        <div
          className="rounded-2xl p-8"
          style={{
            backgroundColor: 'rgba(21,27,48,0.85)',
            border: '1px solid #1c2440',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email field */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold tracking-widest mb-2 uppercase"
                style={{ color: '#4a5578' }}
              >
                E-mail
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: '#3380ff' }}
                />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full rounded-xl pl-11 pr-4 py-3.5 text-sm outline-none transition-all duration-200"
                  style={{
                    backgroundColor: '#151b30',
                    border: '1px solid #1c2440',
                    color: '#e2e8f0',
                    caretColor: '#3380ff',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#3380ff')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#1c2440')}
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold tracking-widest mb-2 uppercase"
                style={{ color: '#4a5578' }}
              >
                Senha
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: '#3380ff' }}
                />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl pl-11 pr-4 py-3.5 text-sm outline-none transition-all duration-200"
                  style={{
                    backgroundColor: '#151b30',
                    border: '1px solid #1c2440',
                    color: '#e2e8f0',
                    caretColor: '#3380ff',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#3380ff')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#1c2440')}
                />
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div
                className="rounded-xl px-4 py-3 text-sm flex items-start gap-2"
                style={{
                  backgroundColor: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  color: '#f87171',
                }}
              >
                <span className="mt-0.5 shrink-0">&#9888;</span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-3.5 text-base font-semibold flex items-center justify-center gap-2 tracking-wide transition-all duration-200"
              style={{
                background: loading
                  ? 'linear-gradient(135deg, #2560cc, #1448c0)'
                  : 'linear-gradient(135deg, #3380ff, #1a5ff5)',
                color: '#ffffff',
                boxShadow: loading ? 'none' : '0 4px 24px rgba(51,128,255,0.35)',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.75 : 1,
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #4d96ff, #2d70ff)'
                  e.currentTarget.style.boxShadow = '0 6px 32px rgba(51,128,255,0.50)'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #3380ff, #1a5ff5)'
                  e.currentTarget.style.boxShadow = '0 4px 24px rgba(51,128,255,0.35)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Entrando…
                </>
              ) : (
                <>
                  Entrar
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* ── Footer ── */}
      <p
        className="absolute bottom-6 text-xs tracking-widest"
        style={{
          color: '#2a3050',
          opacity: mounted ? 1 : 0,
          transition: 'opacity 0.8s ease 0.4s',
        }}
      >
        Intranet Métrica &copy; 2026
      </p>

      {/* Outfit font + logo animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap');
        input::placeholder { color: #2a3050; }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* Gold glow blob behind logo */
        .logo-glow {
          width: 96px;
          height: 96px;
          background: radial-gradient(circle, rgba(232,168,23,0.45) 0%, rgba(232,168,23,0) 70%);
          filter: blur(12px);
        }

        /* Animated outer pulse ring */
        .logo-pulse-outer {
          width: 110px;
          height: 110px;
          border: 1.5px solid rgba(232,168,23,0.35);
          animation: logoPulse 2.6s ease-in-out infinite;
        }

        @keyframes logoPulse {
          0%   { transform: scale(0.92); opacity: 0.7; }
          50%  { transform: scale(1.10); opacity: 0.25; }
          100% { transform: scale(0.92); opacity: 0.7; }
        }

        @media (max-width: 640px) {
          .logo-glow   { width: 76px; height: 76px; }
          .logo-pulse-outer { width: 88px; height: 88px; }
        }
      `}</style>
    </div>
  )
}
