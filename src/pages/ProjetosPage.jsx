import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  closestCorners,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus,
  Calendar,
  Flag,
  FolderKanban,
  Loader2,
  X,
  GripVertical,
  CheckSquare,
  Trash2,
  Edit3,
  ChevronDown,
} from 'lucide-react'
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMNS = [
  { id: 'todo',        label: 'A Fazer',      color: '#3b82f6' },
  { id: 'inprogress',  label: 'Em Progresso', color: '#f97316' },
  { id: 'review',      label: 'Em Revisão',   color: '#a855f7' },
  { id: 'done',        label: 'Concluído',    color: '#22c55e' },
]

const PRIORITY_META = {
  Alta:   { color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  Média:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  Baixa:  { color: '#22c55e', bg: 'rgba(34,197,94,0.15)'  },
}

// ─── Helper: Avatar initials ───────────────────────────────────────────────

function Avatar({ name, size = 28 }) {
  const initials = name
    ? name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
    : '?'
  const colors = ['#3b82f6','#a855f7','#f97316','#22c55e','#ef4444','#f59e0b']
  const hue = (name || '').charCodeAt(0) % colors.length
  return (
    <div
      title={name}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: colors[hue],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.38,
        fontWeight: 700,
        color: '#fff',
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {initials}
    </div>
  )
}

// ─── CardDetailModal ──────────────────────────────────────────────────────────

function CardDetailModal({ task, users, projectId, onClose, onDeleted }) {
  const [title, setTitle] = useState(task.title || '')
  const [editingTitle, setEditingTitle] = useState(false)
  const [description, setDescription] = useState(task.description || '')
  const [priority, setPriority] = useState(task.priority || 'Média')
  const [assigneeId, setAssigneeId] = useState(task.assigneeId || '')
  const [dueDate, setDueDate] = useState(task.dueDate || '')
  const [column, setColumn] = useState(task.column || 'todo')
  const [checklist, setChecklist] = useState(task.checklist || [])
  const [newItemText, setNewItemText] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saveError, setSaveError] = useState('')

  const doneCount = checklist.filter(i => i.done).length
  const totalCount = checklist.length
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  const handleAddChecklistItem = () => {
    const text = newItemText.trim()
    if (!text) return
    const item = { id: `ci_${Date.now()}_${Math.random().toString(36).slice(2)}`, text, done: false }
    setChecklist(prev => [...prev, item])
    setNewItemText('')
  }

  const handleToggleItem = (id) => {
    setChecklist(prev => prev.map(i => i.id === id ? { ...i, done: !i.done } : i))
  }

  const handleDeleteItem = (id) => {
    setChecklist(prev => prev.filter(i => i.id !== id))
  }

  const handleSave = async () => {
    if (!title.trim()) { setSaveError('Título é obrigatório.'); return }
    setSaving(true)
    setSaveError('')
    try {
      const taskRef = doc(db, 'projects', projectId, 'tasks', task.id)
      const assignee = users.find(u => u.id === assigneeId)
      await updateDoc(taskRef, {
        title: title.trim(),
        description,
        priority,
        assigneeId: assigneeId || null,
        assigneeName: assignee?.name || null,
        dueDate: dueDate || null,
        column,
        checklist,
      })
      onClose()
    } catch (e) {
      console.error('Erro ao salvar card:', e)
      setSaveError('Erro ao salvar. Tente novamente.')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    try {
      const taskRef = doc(db, 'projects', projectId, 'tasks', task.id)
      await deleteDoc(taskRef)
      onDeleted()
    } catch (e) {
      console.error('Erro ao deletar card:', e)
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: '#0f1629',
          border: '1px solid #1c2440',
          borderRadius: 14,
          width: '100%',
          maxWidth: 600,
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid #1c2440',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div style={{ flex: 1 }}>
            {editingTitle ? (
              <input
                autoFocus
                value={title}
                onChange={e => setTitle(e.target.value)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={e => e.key === 'Enter' && setEditingTitle(false)}
                style={{
                  ...inputStyle,
                  fontSize: 18,
                  fontWeight: 700,
                  padding: '4px 8px',
                  width: '100%',
                }}
              />
            ) : (
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                onClick={() => setEditingTitle(true)}
                title="Clique para editar"
              >
                <h2 style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 18, margin: 0, flex: 1 }}>
                  {title || 'Sem título'}
                </h2>
                <Edit3 size={14} style={{ color: '#3a4a6b', flexShrink: 0 }} />
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', flexShrink: 0, padding: 2 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>

          {/* Description */}
          <label style={labelStyle}>Descrição</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Adicionar uma descrição..."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />

          {/* Row: Priority + Assignee */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Prioridade</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                style={inputStyle}
              >
                <option>Alta</option>
                <option>Média</option>
                <option>Baixa</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Responsável</label>
              <select
                value={assigneeId}
                onChange={e => setAssigneeId(e.target.value)}
                style={inputStyle}
              >
                <option value="">Sem responsável</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row: Due date + Column */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Data de entrega</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Status / Coluna</label>
              <select
                value={column}
                onChange={e => setColumn(e.target.value)}
                style={inputStyle}
              >
                {COLUMNS.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Checklist section ── */}
          <div style={{ marginTop: 24, borderTop: '1px solid #1c2440', paddingTop: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <CheckSquare size={16} style={{ color: '#3b82f6' }} />
              <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 14 }}>Checklist</span>
              {totalCount > 0 && (
                <span style={{ color: '#64748b', fontSize: 12, marginLeft: 4 }}>
                  {doneCount}/{totalCount} concluídos
                </span>
              )}
            </div>

            {/* Progress bar */}
            {totalCount > 0 && (
              <div
                style={{
                  height: 6,
                  background: '#1c2440',
                  borderRadius: 4,
                  marginBottom: 14,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${progressPct}%`,
                    background: progressPct === 100 ? '#22c55e' : '#3b82f6',
                    borderRadius: 4,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            )}

            {/* Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              {checklist.map(item => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 10px',
                    background: '#0a0e1a',
                    borderRadius: 7,
                    border: '1px solid #1c2440',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => handleToggleItem(item.id)}
                    style={{ cursor: 'pointer', accentColor: '#3b82f6', width: 15, height: 15, flexShrink: 0 }}
                  />
                  <span
                    style={{
                      flex: 1,
                      fontSize: 13,
                      color: item.done ? '#475569' : '#cbd5e1',
                      textDecoration: item.done ? 'line-through' : 'none',
                      lineHeight: 1.4,
                    }}
                  >
                    {item.text}
                  </span>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    title="Remover item"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#3a4a6b',
                      padding: 2,
                      display: 'flex',
                      alignItems: 'center',
                      flexShrink: 0,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#3a4a6b')}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new item */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={newItemText}
                onChange={e => setNewItemText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddChecklistItem()}
                placeholder="Adicionar item..."
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={handleAddChecklistItem}
                style={{
                  ...primaryBtnStyle,
                  padding: '8px 14px',
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                Adicionar
              </button>
            </div>
          </div>

          {/* Error */}
          {saveError && (
            <p style={{ color: '#ef4444', fontSize: 13, marginTop: 10 }}>{saveError}</p>
          )}
        </div>

        {/* Footer actions */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #1c2440',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          {/* Delete button */}
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: confirmDelete ? '#ef4444' : 'transparent',
              border: `1px solid ${confirmDelete ? '#ef4444' : '#3a4a6b'}`,
              borderRadius: 8,
              padding: '7px 14px',
              color: confirmDelete ? '#fff' : '#ef4444',
              fontSize: 13,
              fontWeight: 600,
              cursor: deleting ? 'not-allowed' : 'pointer',
              opacity: deleting ? 0.7 : 1,
              transition: 'all 0.15s',
            }}
          >
            {deleting
              ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
              : <Trash2 size={13} />
            }
            {confirmDelete ? 'Confirmar exclusão' : 'Excluir card'}
          </button>

          {/* Save / Cancel */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={secondaryBtnStyle}>
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                ...primaryBtnStyle,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                opacity: saving ? 0.7 : 1,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving && <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />}
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── SortableCard ─────────────────────────────────────────────────────────────

function SortableCard({ task, users, onOpenCard }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <CardView
        task={task}
        users={users}
        dragHandleProps={{ ...attributes, ...listeners }}
        onOpenCard={onOpenCard}
      />
    </div>
  )
}

// ─── CardView ─────────────────────────────────────────────────────────────────

function CardView({ task, users, dragHandleProps = {}, overlay = false, onOpenCard }) {
  const assignee = users.find(u => u.id === task.assigneeId)
  const priority = PRIORITY_META[task.priority] || PRIORITY_META['Baixa']
  const checklist = task.checklist || []
  const totalItems = checklist.length
  const doneItems = checklist.filter(i => i.done).length
  const checklistPct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0

  return (
    <div
      onClick={() => { if (!overlay && onOpenCard) onOpenCard(task) }}
      style={{
        background: '#151b30',
        border: '1px solid #1c2440',
        borderRadius: 10,
        padding: '12px 14px',
        marginBottom: 10,
        cursor: overlay ? 'grabbing' : 'pointer',
        boxShadow: overlay
          ? '0 16px 40px rgba(0,0,0,0.6)'
          : '0 2px 8px rgba(0,0,0,0.3)',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => {
        if (!overlay) {
          e.currentTarget.style.transform = 'translateY(-3px)'
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)'
        }
      }}
      onMouseLeave={e => {
        if (!overlay) {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)'
        }
      }}
    >
      {/* Top row: grip + title */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <button
          {...dragHandleProps}
          onClick={e => e.stopPropagation()}
          style={{
            background: 'none',
            border: 'none',
            padding: '2px 0',
            cursor: 'grab',
            color: '#3a4a6b',
            flexShrink: 0,
            marginTop: 1,
          }}
        >
          <GripVertical size={15} />
        </button>
        <p
          style={{
            color: '#e2e8f0',
            fontWeight: 600,
            fontSize: 14,
            flex: 1,
            lineHeight: 1.4,
            margin: 0,
          }}
        >
          {task.title}
        </p>
      </div>

      {/* Description */}
      {task.description && (
        <p
          style={{
            color: '#64748b',
            fontSize: 12,
            marginTop: 6,
            marginBottom: 0,
            lineHeight: 1.5,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {task.description}
        </p>
      )}

      {/* Checklist preview */}
      {totalItems > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <CheckSquare size={11} style={{ color: doneItems === totalItems ? '#22c55e' : '#3b82f6', flexShrink: 0 }} />
            <span style={{ color: '#64748b', fontSize: 11, fontWeight: 600 }}>
              {doneItems}/{totalItems}
            </span>
            {/* Mini progress bar */}
            <div
              style={{
                flex: 1,
                height: 4,
                background: '#1c2440',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${checklistPct}%`,
                  background: checklistPct === 100 ? '#22c55e' : '#3b82f6',
                  borderRadius: 3,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Footer: priority + date + avatar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginTop: 10,
          flexWrap: 'wrap',
        }}
      >
        {/* Priority badge */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 700,
            color: priority.color,
            background: priority.bg,
            border: `1px solid ${priority.color}40`,
          }}
        >
          <Flag size={10} />
          {task.priority || 'Baixa'}
        </span>

        {/* Due date */}
        {task.dueDate && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              color: '#475569',
              fontSize: 11,
            }}
          >
            <Calendar size={11} />
            {task.dueDate}
          </span>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Assignee avatar */}
        {assignee && <Avatar name={assignee.name} size={24} />}
        {!assignee && task.assigneeName && <Avatar name={task.assigneeName} size={24} />}
      </div>
    </div>
  )
}

// ─── KanbanColumn ─────────────────────────────────────────────────────────────

function KanbanColumn({ column, tasks, users, onAddCard, onOpenCard }) {
  return (
    <div
      style={{
        minWidth: 280,
        maxWidth: 320,
        flex: '1 1 280px',
        display: 'flex',
        flexDirection: 'column',
        background: '#0d1120',
        borderRadius: 12,
        border: '1px solid #1c2440',
        overflow: 'hidden',
      }}
    >
      {/* Colored header strip */}
      <div
        style={{
          height: 5,
          background: column.color,
          flexShrink: 0,
        }}
      />

      {/* Column header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px 8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: column.color,
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 14 }}>
            {column.label}
          </span>
          <span
            style={{
              background: '#1c2440',
              color: '#64748b',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
              padding: '1px 8px',
            }}
          >
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddCard(column.id)}
          title="Adicionar card"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#3a4a6b',
            padding: 2,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = column.color)}
          onMouseLeave={e => (e.currentTarget.style.color = '#3a4a6b')}
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Cards drop zone */}
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div
          style={{
            padding: '4px 10px 10px',
            flex: 1,
            overflowY: 'auto',
            minHeight: 80,
          }}
        >
          {tasks.map(task => (
            <SortableCard key={task.id} task={task} users={users} onOpenCard={onOpenCard} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}

// ─── AddCardModal ─────────────────────────────────────────────────────────────

function AddCardModal({ defaultColumn, columns, users, onClose, onSave }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    assigneeId: '',
    priority: 'Média',
    dueDate: '',
    column: defaultColumn || columns[0]?.id || 'todo',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Título é obrigatório.'); return }
    setSaving(true)
    setError('')
    try {
      await onSave(form)
      onClose()
    } catch (e) {
      setError('Erro ao salvar. Tente novamente.')
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: '#0f1629',
          border: '1px solid #1c2440',
          borderRadius: 14,
          width: '100%',
          maxWidth: 480,
          padding: 28,
          position: 'relative',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#475569',
          }}
        >
          <X size={18} />
        </button>

        <h2 style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 18, margin: '0 0 20px' }}>
          Novo Card
        </h2>

        {/* Title */}
        <label style={labelStyle}>Título *</label>
        <input
          value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder="Título do card"
          style={inputStyle}
        />

        {/* Description */}
        <label style={labelStyle}>Descrição</label>
        <textarea
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Descrição opcional"
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
        />

        {/* Row: Assignee + Priority */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Responsável</label>
            <select
              value={form.assigneeId}
              onChange={e => set('assigneeId', e.target.value)}
              style={inputStyle}
            >
              <option value="">Sem responsável</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Prioridade</label>
            <select
              value={form.priority}
              onChange={e => set('priority', e.target.value)}
              style={inputStyle}
            >
              <option>Alta</option>
              <option>Média</option>
              <option>Baixa</option>
            </select>
          </div>
        </div>

        {/* Row: Due date + Column */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Data de entrega</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={e => set('dueDate', e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Coluna</label>
            <select
              value={form.column}
              onChange={e => set('column', e.target.value)}
              style={inputStyle}
            >
              {columns.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p style={{ color: '#ef4444', fontSize: 13, marginTop: 4 }}>{error}</p>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={secondaryBtnStyle}>
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              ...primaryBtnStyle,
              opacity: saving ? 0.7 : 1,
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {saving && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
            Salvar Card
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── AddProjectModal ──────────────────────────────────────────────────────────

function AddProjectModal({ onClose, onSave }) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!name.trim()) { setError('Nome é obrigatório.'); return }
    setSaving(true)
    setError('')
    try {
      await onSave(name.trim())
      onClose()
    } catch {
      setError('Erro ao criar projeto.')
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: '#0f1629',
          border: '1px solid #1c2440',
          borderRadius: 14,
          width: '100%',
          maxWidth: 380,
          padding: 28,
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 14,
            background: 'none', border: 'none', cursor: 'pointer', color: '#475569',
          }}
        >
          <X size={18} />
        </button>

        <h2 style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 18, margin: '0 0 20px' }}>
          Novo Projeto
        </h2>

        <label style={labelStyle}>Nome do projeto *</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ex: Redesign do Site"
          style={inputStyle}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
        />

        {error && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 4 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={secondaryBtnStyle}>Cancelar</button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              ...primaryBtnStyle,
              opacity: saving ? 0.7 : 1,
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {saving && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
            Criar Projeto
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const labelStyle = {
  display: 'block',
  color: '#94a3b8',
  fontSize: 12,
  fontWeight: 600,
  marginBottom: 4,
  marginTop: 14,
}

const inputStyle = {
  width: '100%',
  background: '#0a0e1a',
  border: '1px solid #1c2440',
  borderRadius: 8,
  padding: '8px 10px',
  color: '#e2e8f0',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
}

const primaryBtnStyle = {
  background: '#3b82f6',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '8px 18px',
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
}

const secondaryBtnStyle = {
  background: '#1c2440',
  color: '#94a3b8',
  border: '1px solid #2a3558',
  borderRadius: 8,
  padding: '8px 18px',
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProjetosPage() {
  const { user: currentUser } = useAuth()

  // Projects
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [loadingProjects, setLoadingProjects] = useState(true)

  // Tasks keyed by column
  const [tasksByColumn, setTasksByColumn] = useState(
    Object.fromEntries(COLUMNS.map(c => [c.id, []]))
  )
  const [loadingTasks, setLoadingTasks] = useState(false)

  // Users for assignee dropdown
  const [users, setUsers] = useState([])

  // UI state
  const [activeTask, setActiveTask] = useState(null)
  const [showAddCard, setShowAddCard] = useState(false)
  const [addCardColumn, setAddCardColumn] = useState('todo')
  const [showAddProject, setShowAddProject] = useState(false)
  const [viewingTask, setViewingTask] = useState(null) // task being viewed in detail modal

  // ── Load projects ──
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'projects'), orderBy('name')))
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        setProjects(list)
        if (list.length > 0) setSelectedProjectId(list[0].id)
      } catch (e) {
        console.error('Erro ao carregar projetos:', e)
      } finally {
        setLoadingProjects(false)
      }
    }
    fetchProjects()
  }, [])

  // ── Load users ──
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'))
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      } catch (e) {
        console.error('Erro ao carregar usuários:', e)
      }
    }
    fetchUsers()
  }, [])

  // ── Subscribe to tasks for selected project ──
  useEffect(() => {
    if (!selectedProjectId) return

    setLoadingTasks(true)
    const tasksRef = collection(db, 'projects', selectedProjectId, 'tasks')
    const q = query(tasksRef, orderBy('order'))

    const unsub = onSnapshot(q, snap => {
      const grouped = Object.fromEntries(COLUMNS.map(c => [c.id, []]))
      snap.docs.forEach(d => {
        const task = { id: d.id, ...d.data() }
        const col = task.column || 'todo'
        if (grouped[col]) grouped[col].push(task)
        else grouped['todo'].push(task)
      })
      setTasksByColumn(grouped)
      setLoadingTasks(false)
    }, e => {
      console.error('Erro ao carregar tasks:', e)
      setLoadingTasks(false)
    })

    return () => unsub()
  }, [selectedProjectId])

  // ── DnD sensors ──
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const findTaskColumn = useCallback((taskId) => {
    for (const [colId, tasks] of Object.entries(tasksByColumn)) {
      if (tasks.find(t => t.id === taskId)) return colId
    }
    return null
  }, [tasksByColumn])

  const handleDragStart = useCallback(({ active }) => {
    const colId = findTaskColumn(active.id)
    if (colId) {
      const task = tasksByColumn[colId].find(t => t.id === active.id)
      setActiveTask(task || null)
    }
  }, [tasksByColumn, findTaskColumn])

  const handleDragOver = useCallback(({ active, over }) => {
    if (!over || active.id === over.id) return

    const activeCol = findTaskColumn(active.id)
    const overCol = findTaskColumn(over.id) || over.id

    if (!activeCol || activeCol === overCol) return

    setTasksByColumn(prev => {
      const activeTask = prev[activeCol].find(t => t.id === active.id)
      if (!activeTask) return prev

      const newActive = prev[activeCol].filter(t => t.id !== active.id)
      const overIdx = prev[overCol].findIndex(t => t.id === over.id)
      const newOver = [...prev[overCol]]
      if (overIdx === -1) newOver.push(activeTask)
      else newOver.splice(overIdx, 0, activeTask)

      return { ...prev, [activeCol]: newActive, [overCol]: newOver }
    })
  }, [findTaskColumn])

  const handleDragEnd = useCallback(async ({ active, over }) => {
    setActiveTask(null)
    if (!over || !selectedProjectId) return

    const newCol = findTaskColumn(active.id)
    if (!newCol) return

    // Persist new column to Firestore
    try {
      const taskRef = doc(db, 'projects', selectedProjectId, 'tasks', active.id)
      const colTasks = tasksByColumn[newCol]
      const newOrder = colTasks.findIndex(t => t.id === active.id)
      await updateDoc(taskRef, { column: newCol, order: newOrder })
    } catch (e) {
      console.error('Erro ao mover task:', e)
    }
  }, [selectedProjectId, findTaskColumn, tasksByColumn])

  // ── Add card ──
  const handleAddCard = (colId) => {
    setAddCardColumn(colId)
    setShowAddCard(true)
  }

  const handleSaveCard = async (form) => {
    if (!selectedProjectId) return
    const assignee = users.find(u => u.id === form.assigneeId)
    const colTasks = tasksByColumn[form.column] || []
    await addDoc(collection(db, 'projects', selectedProjectId, 'tasks'), {
      title: form.title,
      description: form.description,
      assigneeId: form.assigneeId || null,
      assigneeName: assignee?.name || null,
      priority: form.priority,
      dueDate: form.dueDate || null,
      column: form.column,
      order: colTasks.length,
      checklist: [],
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.uid || null,
    })
  }

  // ── Add project ──
  const handleSaveProject = async (name) => {
    const docRef = await addDoc(collection(db, 'projects'), {
      name,
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.uid || null,
    })
    setProjects(prev => [...prev, { id: docRef.id, name }])
    setSelectedProjectId(docRef.id)
  }

  // ── Open card detail ──
  const handleOpenCard = useCallback((task) => {
    setViewingTask(task)
  }, [])

  // ── ── Render ──
  return (
    <div style={{ background: '#0a0e1a', minHeight: '100vh', padding: '28px 24px' }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0a0e1a; }
        ::-webkit-scrollbar-thumb { background: #1c2440; border-radius: 3px; }
      `}</style>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <FolderKanban size={24} style={{ color: '#3b82f6' }} />
        <h1 style={{ color: '#e2e8f0', fontWeight: 800, fontSize: 22, margin: 0 }}>
          Projetos
        </h1>
      </div>

      {/* Project selector bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 28,
          flexWrap: 'wrap',
        }}
      >
        {loadingProjects ? (
          <Loader2 size={18} style={{ color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
        ) : (
          <>
            <select
              value={selectedProjectId || ''}
              onChange={e => setSelectedProjectId(e.target.value)}
              style={{
                ...inputStyle,
                width: 'auto',
                minWidth: 220,
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              {projects.length === 0 && (
                <option value="">Nenhum projeto</option>
              )}
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <button
              onClick={() => setShowAddProject(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#1c2440',
                border: '1px dashed #2a3558',
                borderRadius: 8,
                padding: '7px 14px',
                color: '#64748b',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = '#3b82f6'
                e.currentTarget.style.borderColor = '#3b82f6'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = '#64748b'
                e.currentTarget.style.borderColor = '#2a3558'
              }}
            >
              <Plus size={14} />
              Novo Projeto
            </button>
          </>
        )}

        {selectedProjectId && (
          <button
            onClick={() => handleAddCard('todo')}
            style={{
              ...primaryBtnStyle,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              marginLeft: 'auto',
            }}
          >
            <Plus size={14} />
            Adicionar Card
          </button>
        )}
      </div>

      {/* Loading tasks */}
      {loadingTasks && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#475569' }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 14 }}>Carregando tarefas...</span>
        </div>
      )}

      {/* Empty state */}
      {!loadingProjects && projects.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '64px 24px',
            color: '#475569',
          }}
        >
          <FolderKanban size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Nenhum projeto ainda</p>
          <p style={{ fontSize: 14 }}>Clique em "Novo Projeto" para começar.</p>
        </div>
      )}

      {/* Kanban board */}
      {selectedProjectId && !loadingTasks && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div
            style={{
              display: 'flex',
              gap: 16,
              alignItems: 'flex-start',
              overflowX: 'auto',
              paddingBottom: 16,
            }}
          >
            {COLUMNS.map(col => (
              <KanbanColumn
                key={col.id}
                column={col}
                tasks={tasksByColumn[col.id] || []}
                users={users}
                onAddCard={handleAddCard}
                onOpenCard={handleOpenCard}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask && (
              <CardView task={activeTask} users={users} overlay />
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Modals */}
      {showAddCard && (
        <AddCardModal
          defaultColumn={addCardColumn}
          columns={COLUMNS}
          users={users}
          onClose={() => setShowAddCard(false)}
          onSave={handleSaveCard}
        />
      )}

      {showAddProject && (
        <AddProjectModal
          onClose={() => setShowAddProject(false)}
          onSave={handleSaveProject}
        />
      )}

      {viewingTask && (
        <CardDetailModal
          task={viewingTask}
          users={users}
          projectId={selectedProjectId}
          onClose={() => setViewingTask(null)}
          onDeleted={() => setViewingTask(null)}
        />
      )}
    </div>
  )
}
