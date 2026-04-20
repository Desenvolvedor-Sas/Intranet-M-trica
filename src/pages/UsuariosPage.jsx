import { useState, useEffect } from 'react'
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth, db } from '../lib/firebase'
import { Plus, Search, Edit, Trash2, UserPlus, Shield, X, Loader2, Mail, Key } from 'lucide-react'

const ROLES = ['Desenvolvedor', 'Gestor', 'Colaborador']

const ROLE_COLORS = {
  Desenvolvedor: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  Gestor: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  Colaborador: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
}

const STATUS_COLORS = {
  ativo: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  inativo: 'bg-red-500/20 text-red-300 border border-red-500/30',
}

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

function Avatar({ name }) {
  const initials = getInitials(name)
  return (
    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
      style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
      {initials || '?'}
    </div>
  )
}

// ---------- Modal de Cadastro ----------
function CadastrarModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Colaborador', department: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError('Preencha todos os campos obrigatórios.')
      return
    }
    if (form.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    setLoading(true)
    try {
      const credential = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password)
      const uid = credential.user.uid
      await setDoc(doc(db, 'users', uid), {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        department: form.department.trim(),
        status: 'ativo',
        createdAt: new Date().toISOString(),
      })
      onSuccess()
      onClose()
    } catch (err) {
      const msgs = {
        'auth/email-already-in-use': 'Este e-mail já está em uso.',
        'auth/invalid-email': 'E-mail inválido.',
        'auth/weak-password': 'Senha muito fraca.',
      }
      setError(msgs[err.code] || `Erro: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl" style={{ background: '#151b30', border: '1px solid #1c2440' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <UserPlus className="text-indigo-400" size={20} />
            <h2 className="text-lg font-semibold text-white">Cadastrar Usuário</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Nome completo *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Ex: João Silva"
              className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-indigo-500 transition"
              style={{ background: '#0f1525', border: '1px solid #1c2440' }}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              <span className="flex items-center gap-1"><Mail size={12} /> E-mail *</span>
            </label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="usuario@empresa.com"
              className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-indigo-500 transition"
              style={{ background: '#0f1525', border: '1px solid #1c2440' }}
            />
          </div>

          {/* Senha */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              <span className="flex items-center gap-1"><Key size={12} /> Senha *</span>
            </label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Mínimo 6 caracteres"
              className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-indigo-500 transition"
              style={{ background: '#0f1525', border: '1px solid #1c2440' }}
            />
          </div>

          {/* Cargo */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              <span className="flex items-center gap-1"><Shield size={12} /> Cargo *</span>
            </label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 transition"
              style={{ background: '#0f1525', border: '1px solid #1c2440' }}
            >
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Departamento */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Departamento</label>
            <input
              name="department"
              value={form.department}
              onChange={handleChange}
              placeholder="Ex: Tecnologia"
              className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-indigo-500 transition"
              style={{ background: '#0f1525', border: '1px solid #1c2440' }}
            />
          </div>

          {/* Aviso */}
          <p className="text-xs text-yellow-400/80 px-3 py-2 rounded-lg" style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.15)' }}>
            Ao cadastrar, você será desconectado momentaneamente pelo Firebase. Faça login novamente após o cadastro.
          </p>

          {error && (
            <p className="text-xs text-red-400 px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white transition"
              style={{ background: '#1c2440' }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              {loading ? 'Cadastrando...' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------- Modal de Edição ----------
function EditarModal({ user, onClose, onSuccess }) {
  const [form, setForm] = useState({
    role: user.role || 'Colaborador',
    department: user.department || '',
    status: user.status || 'ativo',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await updateDoc(doc(db, 'users', user.id), {
        role: form.role,
        department: form.department.trim(),
        status: form.status,
      })
      onSuccess()
      onClose()
    } catch (err) {
      setError(`Erro ao atualizar: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl" style={{ background: '#151b30', border: '1px solid #1c2440' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Edit className="text-indigo-400" size={20} />
            <h2 className="text-lg font-semibold text-white">Editar Usuário</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        {/* User info (read-only) */}
        <div className="flex items-center gap-3 mb-5 p-3 rounded-xl" style={{ background: '#0f1525', border: '1px solid #1c2440' }}>
          <Avatar name={user.name} />
          <div>
            <p className="text-sm font-medium text-white">{user.name}</p>
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cargo */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              <span className="flex items-center gap-1"><Shield size={12} /> Cargo</span>
            </label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 transition"
              style={{ background: '#0f1525', border: '1px solid #1c2440' }}
            >
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Departamento */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Departamento</label>
            <input
              name="department"
              value={form.department}
              onChange={handleChange}
              placeholder="Ex: Tecnologia"
              className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-indigo-500 transition"
              style={{ background: '#0f1525', border: '1px solid #1c2440' }}
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Status</label>
            <div className="flex gap-3">
              {['ativo', 'inativo'].map((s) => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value={s}
                    checked={form.status === s}
                    onChange={handleChange}
                    className="accent-indigo-500"
                  />
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[s]}`}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white transition"
              style={{ background: '#1c2440' }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Edit size={16} />}
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------- Modal de Confirmação de Exclusão ----------
function ConfirmarDeleteModal({ user, onClose, onConfirm, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ background: '#151b30', border: '1px solid #1c2440' }}>
        <div className="flex items-center gap-2 mb-4">
          <Trash2 className="text-red-400" size={20} />
          <h2 className="text-lg font-semibold text-white">Excluir Usuário</h2>
        </div>
        <p className="text-sm text-gray-300 mb-2">
          Tem certeza que deseja excluir o usuário <span className="font-semibold text-white">{user.name}</span>?
        </p>
        <p className="text-xs text-gray-500 mb-6">
          O documento do Firestore será removido. A conta de autenticação precisará ser excluída manualmente no Firebase Console.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white transition"
            style={{ background: '#1c2440' }}>
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            {loading ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------- Página Principal ----------
export default function UsuariosPage() {
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [search, setSearch] = useState('')
  const [showCadastrar, setShowCadastrar] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [deletingUser, setDeletingUser] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Realtime listener
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'))
      setUsers(list)
      setLoadingUsers(false)
    }, () => {
      setLoadingUsers(false)
    })
    return () => unsub()
  }, [])

  const filtered = users.filter((u) =>
    (u.name || '').toLowerCase().includes(search.toLowerCase())
  )

  async function handleDelete() {
    if (!deletingUser) return
    setDeleteLoading(true)
    try {
      await deleteDoc(doc(db, 'users', deletingUser.id))
      setDeletingUser(null)
    } catch (err) {
      console.error('Erro ao excluir:', err)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="p-6 md:p-8 min-h-screen" style={{ color: '#e2e8f0' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="text-indigo-400" size={24} />
            Gerenciamento de Usuários
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            {loadingUsers ? 'Carregando...' : `${users.length} usuário${users.length !== 1 ? 's' : ''} cadastrado${users.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => setShowCadastrar(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition hover:opacity-90 active:scale-95 w-fit"
          style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
          <Plus size={16} />
          Cadastrar Usuário
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-indigo-500 transition"
          style={{ background: '#151b30', border: '1px solid #1c2440' }}
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden shadow-xl" style={{ background: '#151b30', border: '1px solid #1c2440' }}>
        {loadingUsers ? (
          <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
            <Loader2 size={22} className="animate-spin text-indigo-400" />
            <span className="text-sm">Carregando usuários...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
            <UserPlus size={36} className="text-gray-600" />
            <p className="text-sm">{search ? 'Nenhum usuário encontrado.' : 'Nenhum usuário cadastrado.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #1c2440' }}>
                  {['Usuário', 'E-mail', 'Cargo', 'Departamento', 'Status', 'Ações'].map((h) => (
                    <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((user, idx) => (
                  <tr
                    key={user.id}
                    className="transition-colors hover:bg-white/[0.03]"
                    style={{ borderBottom: idx < filtered.length - 1 ? '1px solid #1c2440' : 'none' }}>
                    {/* Usuário */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.name} />
                        <span className="font-medium text-white whitespace-nowrap">{user.name || '—'}</span>
                      </div>
                    </td>
                    {/* Email */}
                    <td className="px-5 py-4">
                      <span className="text-gray-300 flex items-center gap-1.5">
                        <Mail size={13} className="text-gray-500 flex-shrink-0" />
                        {user.email || '—'}
                      </span>
                    </td>
                    {/* Cargo */}
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${ROLE_COLORS[user.role] || 'bg-gray-500/20 text-gray-300 border border-gray-500/30'}`}>
                        {user.role || '—'}
                      </span>
                    </td>
                    {/* Departamento */}
                    <td className="px-5 py-4 text-gray-400 whitespace-nowrap">
                      {user.department || <span className="text-gray-600 italic">Não definido</span>}
                    </td>
                    {/* Status */}
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[user.status] || 'bg-gray-500/20 text-gray-300 border border-gray-500/30'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'ativo' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                        {user.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : '—'}
                      </span>
                    </td>
                    {/* Ações */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingUser(user)}
                          title="Editar usuário"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors">
                          <Edit size={15} />
                        </button>
                        <button
                          onClick={() => setDeletingUser(user)}
                          title="Excluir usuário"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modais */}
      {showCadastrar && (
        <CadastrarModal
          onClose={() => setShowCadastrar(false)}
          onSuccess={() => {}}
        />
      )}
      {editingUser && (
        <EditarModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={() => setEditingUser(null)}
        />
      )}
      {deletingUser && (
        <ConfirmarDeleteModal
          user={deletingUser}
          onClose={() => setDeletingUser(null)}
          onConfirm={handleDelete}
          loading={deleteLoading}
        />
      )}
    </div>
  )
}
