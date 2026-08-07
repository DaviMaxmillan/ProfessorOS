'use client'

import { useState, useMemo } from 'react'
import { Plus, Pin, Trash2, Edit2, Check, X, Search, ALargeSmall } from 'lucide-react'
import { createNoteAction, updateNoteAction, deleteNoteAction } from '@/app/actions/notes'

const LABELS = [
  { value: 'recado',   emoji: '📣', label: 'Recado',   color: '#60a5fa' },
  { value: 'palestra', emoji: '🎤', label: 'Palestra', color: '#a78bfa' },
  { value: 'ideia',    emoji: '💡', label: 'Ideia',    color: '#fbbf24' },
  { value: 'urgente',  emoji: '⚠️', label: 'Urgente',  color: '#f87171' },
]

const NOTE_COLORS = [
  { name: 'Padrão',   value: '' },
  { name: 'Violeta',  value: 'rgba(124,58,237,0.15)' },
  { name: 'Azul',     value: 'rgba(59,130,246,0.15)' },
  { name: 'Verde',    value: 'rgba(16,185,129,0.15)' },
  { name: 'Amarelo',  value: 'rgba(245,158,11,0.15)' },
  { name: 'Rosa',     value: 'rgba(236,72,153,0.15)' },
  { name: 'Vermelho', value: 'rgba(239,68,68,0.15)'  },
]

// Very simple markdown: **bold**, `code`, bullet lists
function renderMarkdown(text: string) {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    // Bullet list
    if (line.match(/^[-*]\s/)) {
      const content = line.replace(/^[-*]\s/, '')
      return <li key={i} style={{ marginLeft: '16px' }} dangerouslySetInnerHTML={{ __html: parseInline(content) }} />
    }
    if (line === '') return <br key={i} />
    return <p key={i} style={{ margin: 0 }} dangerouslySetInnerHTML={{ __html: parseInline(line) }} />
  })
}

function parseInline(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.*?)`/g, '<code style="background:rgba(255,255,255,0.1);padding:1px 4px;border-radius:3px;font-size:0.85em">$1</code>')
}

function NoteCard({ note, onSave, onDelete, onTogglePin }: {
  note: any
  onSave: (id: string, data: any) => void
  onDelete: (id: string) => void
  onTogglePin: (id: string, pinned: boolean) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(note.title || '')
  const [editContent, setEditContent] = useState(note.content || '')
  const [editColor, setEditColor] = useState(note.color || '')
  const [editLabel, setEditLabel] = useState(note.label || '')
  const [fontSize, setFontSize] = useState(note.fontSize || 14)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const labelInfo = LABELS.find(l => l.value === note.label)

  const handleSave = () => {
    onSave(note.id, {
      title: editTitle,
      content: editContent,
      color: editColor,
      label: editLabel,
      fontSize,
    })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditTitle(note.title || '')
    setEditContent(note.content || '')
    setEditColor(note.color || '')
    setEditLabel(note.label || '')
    setFontSize(note.fontSize || 14)
    setIsEditing(false)
  }

  const bg = note.color || 'rgba(255,255,255,0.03)'
  const border = note.pinned ? '1px solid rgba(255,215,0,0.3)' : '1px solid var(--surface-border)'

  return (
    <div style={{
      background: bg,
      border,
      borderRadius: '12px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      position: 'relative',
      transition: 'box-shadow 0.2s',
      boxShadow: note.pinned ? '0 0 0 1px rgba(255,215,0,0.2)' : 'none',
    }}>

      {/* Pinned badge */}
      {note.pinned && (
        <div style={{ position: 'absolute', top: '-10px', right: '12px', fontSize: '18px' }}>📌</div>
      )}

      {!isEditing ? (
        <>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              {labelInfo && (
                <span style={{ fontSize: '0.7rem', background: `${labelInfo.color}25`, color: labelInfo.color, border: `1px solid ${labelInfo.color}40`, padding: '2px 8px', borderRadius: '12px', fontWeight: 600, display: 'inline-block', marginBottom: '6px' }}>
                  {labelInfo.emoji} {labelInfo.label}
                </span>
              )}
              {note.title && <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{note.title}</h3>}
            </div>
          </div>

          {/* Content */}
          <div style={{ fontSize: `${note.fontSize || 14}px`, color: 'var(--text-secondary)', lineHeight: '1.6', flex: 1 }}>
            <ul style={{ listStyle: 'disc', padding: 0, margin: 0 }}>
              {renderMarkdown(note.content)}
            </ul>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
            <button onClick={() => onTogglePin(note.id, !note.pinned)} title={note.pinned ? 'Desafixar' : 'Fixar no topo'} style={{ background: 'none', border: 'none', color: note.pinned ? '#fbbf24' : 'var(--text-secondary)', cursor: 'pointer', padding: '4px', borderRadius: '4px', fontSize: '14px' }}>
              📌
            </button>
            <button onClick={() => setIsEditing(true)} title="Editar" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}>
              <Edit2 size={14} />
            </button>
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} title="Excluir" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}>
                <Trash2 size={14} />
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: '#f87171' }}>Excluir?</span>
                <button onClick={() => onDelete(note.id)} style={{ background: '#ef4444', border: 'none', color: '#fff', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>Sim</button>
                <button onClick={() => setConfirmDelete(false)} style={{ background: 'transparent', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>Não</button>
              </div>
            )}
          </div>

          {/* Date */}
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)' }}>
            {new Date(note.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </>
      ) : (
        /* Edit mode */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            placeholder="Título (opcional)..."
            style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--surface-border)', color: '#fff', fontSize: '1rem', fontWeight: 600 }}
          />
          <textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            placeholder="Conteúdo da nota... (suporte a **negrito**, `código` e - listas)"
            style={{ padding: '10px', borderRadius: '6px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--accent)', color: '#fff', fontSize: `${fontSize}px`, minHeight: '120px', resize: 'vertical', lineHeight: '1.6', fontFamily: 'inherit' }}
            autoFocus
          />

          {/* Font size */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ALargeSmall size={14} color="var(--text-secondary)" />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tamanho:</span>
            <button onClick={() => setFontSize(f => Math.max(10, f - 2))} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontWeight: 'bold' }}>A-</button>
            <span style={{ color: '#fff', fontSize: '0.85rem', minWidth: '28px', textAlign: 'center' }}>{fontSize}px</span>
            <button onClick={() => setFontSize(f => Math.min(28, f + 2))} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontWeight: 'bold' }}>A+</button>
          </div>

          {/* Label */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button onClick={() => setEditLabel('')} style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '12px', border: `1px solid ${!editLabel ? 'var(--accent)' : 'var(--surface-border)'}`, background: !editLabel ? 'rgba(99,102,241,0.2)' : 'transparent', color: !editLabel ? 'var(--accent)' : 'var(--text-secondary)', cursor: 'pointer' }}>
              Sem Etiqueta
            </button>
            {LABELS.map(l => (
              <button key={l.value} onClick={() => setEditLabel(l.value)} style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '12px', border: `1px solid ${editLabel === l.value ? l.color : 'var(--surface-border)'}`, background: editLabel === l.value ? `${l.color}20` : 'transparent', color: editLabel === l.value ? l.color : 'var(--text-secondary)', cursor: 'pointer' }}>
                {l.emoji} {l.label}
              </button>
            ))}
          </div>

          {/* Color */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Cor:</span>
            {NOTE_COLORS.map(c => (
              <button key={c.value} onClick={() => setEditColor(c.value)} title={c.name} style={{ width: '20px', height: '20px', borderRadius: '50%', background: c.value || 'rgba(255,255,255,0.1)', border: editColor === c.value ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer', flexShrink: 0 }} />
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={handleCancel} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
            <button onClick={handleSave} style={{ padding: '6px 16px', background: 'var(--accent)', border: 'none', color: '#000', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Check size={14} /> Salvar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function NotesTab({ classData }: { classData: any }) {
  const [notes, setNotes] = useState<any[]>(classData.classNotes || [])
  const [isCreating, setIsCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterLabel, setFilterLabel] = useState('')

  // New note form state
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newColor, setNewColor] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newFontSize, setNewFontSize] = useState(14)

  const handleCreate = async () => {
    if (!newContent.trim()) return
    const res = await createNoteAction(classData.id, {
      title: newTitle,
      content: newContent,
      color: newColor,
      label: newLabel,
      fontSize: newFontSize,
    })
    if (res.success) {
      // Optimistic update
      setNotes(prev => [{
        id: `temp-${Date.now()}`,
        title: newTitle,
        content: newContent,
        color: newColor,
        label: newLabel,
        fontSize: newFontSize,
        pinned: false,
        createdAt: new Date().toISOString(),
      }, ...prev])
      setIsCreating(false)
      setNewTitle(''); setNewContent(''); setNewColor(''); setNewLabel(''); setNewFontSize(14)
    }
  }

  const handleSave = async (id: string, data: any) => {
    await updateNoteAction(id, data)
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...data } : n))
  }

  const handleDelete = async (id: string) => {
    await deleteNoteAction(id)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  const handleTogglePin = async (id: string, pinned: boolean) => {
    await updateNoteAction(id, { pinned })
    setNotes(prev => prev.map(n => n.id === id ? { ...n, pinned } : n))
  }

  const filtered = useMemo(() => {
    return notes.filter(n => {
      const matchSearch = !searchQuery || 
        n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (n.title && n.title.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchLabel = !filterLabel || n.label === filterLabel
      return matchSearch && matchLabel
    })
  }, [notes, searchQuery, filterLabel])

  const pinnedNotes = filtered.filter(n => n.pinned)
  const unpinnedNotes = filtered.filter(n => !n.pinned)

  return (
    <div>
      {/* Toolbar */}
      <div className="glass-panel" style={{ padding: '16px 24px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar notas..."
            style={{ width: '100%', paddingLeft: '32px', padding: '8px 12px 8px 32px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--surface-border)', color: '#fff', fontSize: '0.9rem' }}
          />
        </div>

        {/* Label filter */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button onClick={() => setFilterLabel('')} style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '12px', border: `1px solid ${!filterLabel ? 'var(--accent)' : 'var(--surface-border)'}`, background: !filterLabel ? 'rgba(99,102,241,0.2)' : 'transparent', color: !filterLabel ? 'var(--accent)' : 'var(--text-secondary)', cursor: 'pointer' }}>
            Todas
          </button>
          {LABELS.map(l => (
            <button key={l.value} onClick={() => setFilterLabel(l.value === filterLabel ? '' : l.value)} style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '12px', border: `1px solid ${filterLabel === l.value ? l.color : 'var(--surface-border)'}`, background: filterLabel === l.value ? `${l.color}20` : 'transparent', color: filterLabel === l.value ? l.color : 'var(--text-secondary)', cursor: 'pointer' }}>
              {l.emoji} {l.label}
            </button>
          ))}
        </div>

        <button onClick={() => setIsCreating(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', flexShrink: 0 }}>
          <Plus size={16} /> Nova Nota
        </button>
      </div>

      {/* New Note Form */}
      {isCreating && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', border: '1px solid var(--accent)', borderRadius: '12px' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '16px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} /> Nova Nota
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Título (opcional)..."
              style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--surface-border)', color: '#fff', fontSize: '1rem', fontWeight: 600 }}
            />
            <textarea
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              placeholder="Escreva sua nota... (suporte a **negrito**, `código` e - listas)"
              autoFocus
              style={{ padding: '10px', borderRadius: '6px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--surface-border)', color: '#fff', fontSize: `${newFontSize}px`, minHeight: '100px', resize: 'vertical', lineHeight: '1.6', fontFamily: 'inherit' }}
            />

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Font size */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Fonte:</span>
                <button onClick={() => setNewFontSize(f => Math.max(10, f - 2))} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}>A-</button>
                <span style={{ color: '#fff', fontSize: '0.85rem', minWidth: '28px', textAlign: 'center' }}>{newFontSize}px</span>
                <button onClick={() => setNewFontSize(f => Math.min(28, f + 2))} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}>A+</button>
              </div>

              {/* Labels */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {LABELS.map(l => (
                  <button key={l.value} onClick={() => setNewLabel(l.value === newLabel ? '' : l.value)} style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '12px', border: `1px solid ${newLabel === l.value ? l.color : 'var(--surface-border)'}`, background: newLabel === l.value ? `${l.color}20` : 'transparent', color: newLabel === l.value ? l.color : 'var(--text-secondary)', cursor: 'pointer' }}>
                    {l.emoji} {l.label}
                  </button>
                ))}
              </div>

              {/* Colors */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Cor:</span>
                {NOTE_COLORS.map(c => (
                  <button key={c.value} onClick={() => setNewColor(c.value)} title={c.name} style={{ width: '20px', height: '20px', borderRadius: '50%', background: c.value || 'rgba(255,255,255,0.1)', border: newColor === c.value ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer' }} />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setIsCreating(false)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleCreate} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Check size={14} /> Criar Nota
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && !isCreating && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📝</div>
          <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Nenhuma nota encontrada.</p>
          <p style={{ fontSize: '0.9rem' }}>{searchQuery || filterLabel ? 'Tente mudar os filtros.' : 'Clique em "Nova Nota" para começar.'}</p>
        </div>
      )}

      {/* Pinned Notes */}
      {pinnedNotes.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,215,0,0.6)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>📌 Fixadas</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {pinnedNotes.map(note => (
              <NoteCard key={note.id} note={note} onSave={handleSave} onDelete={handleDelete} onTogglePin={handleTogglePin} />
            ))}
          </div>
        </div>
      )}

      {/* Unpinned Notes */}
      {unpinnedNotes.length > 0 && (
        <div>
          {pinnedNotes.length > 0 && <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>Outras notas</p>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {unpinnedNotes.map(note => (
              <NoteCard key={note.id} note={note} onSave={handleSave} onDelete={handleDelete} onTogglePin={handleTogglePin} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
