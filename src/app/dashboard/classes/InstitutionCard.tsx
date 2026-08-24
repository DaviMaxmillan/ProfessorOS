'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Building2, ChevronRight, Edit, Trash2, Check, X } from 'lucide-react'
import { deleteInstitutionAction, updateInstitutionAction } from '@/app/actions/classes'

type Institution = {
  id: string
  name: string
  _count: { classes: number }
}

export default function InstitutionCard({ institution }: { institution: Institution }) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editName, setEditName] = useState(institution.name)

  const handleDelete = async () => {
    const confirmation = prompt(
      `Tem certeza que deseja excluir a instituição "${institution.name}"?\nAs turmas vinculadas ficarão sem instituição.\n\nDigite o nome para confirmar:`
    )
    if (confirmation === institution.name) {
      setIsDeleting(true)
      const res = await deleteInstitutionAction(institution.id)
      if (!res.success) {
        alert(res.message)
        setIsDeleting(false)
      }
    } else if (confirmation !== null) {
      alert('Nome não confere. Exclusão cancelada.')
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData()
    formData.set('name', editName)
    const res = await updateInstitutionAction(institution.id, formData)
    if (res.success) {
      setIsEditing(false)
      router.refresh()
    } else {
      alert(res.message)
    }
  }

  if (isEditing) {
    return (
      <div className="glass-panel" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Building2 size={20} color="var(--accent)" style={{ flexShrink: 0 }} />
        <form onSubmit={handleUpdate} style={{ display: 'flex', gap: '8px', flex: 1, alignItems: 'center' }}>
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            autoFocus
            required
            style={{
              flex: 1, padding: '8px 12px', borderRadius: '6px',
              background: 'rgba(0,0,0,0.3)', border: '1px solid var(--accent)',
              color: '#fff', fontFamily: 'inherit', fontSize: '1rem'
            }}
          />
          <button type="submit" style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80', borderRadius: '6px', padding: '8px', cursor: 'pointer' }}>
            <Check size={16} />
          </button>
          <button type="button" onClick={() => { setIsEditing(false); setEditName(institution.name) }}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)', borderRadius: '6px', padding: '8px', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
      <Link href={`/dashboard/classes/inst/${institution.id}`} style={{ textDecoration: 'none', flex: 1 }}>
        <div className="class-card" style={{
          padding: '22px 28px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}>
          <div style={{
            width: '46px', height: '46px', borderRadius: '12px',
            background: 'rgba(165, 180, 252, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent)', flexShrink: 0
          }}>
            <Building2 size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '2px' }}>
              {institution.name}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              {institution._count.classes} {institution._count.classes === 1 ? 'turma' : 'turmas'} cadastradas
            </p>
          </div>
          <ChevronRight size={22} color="var(--text-secondary)" />
        </div>
      </Link>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '4px', paddingRight: '16px', flexShrink: 0 }}>
        <button
          onClick={() => setIsEditing(true)}
          title="Editar instituição"
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px', borderRadius: '6px', transition: 'all 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
        >
          <Edit size={16} />
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          title="Excluir instituição"
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px', borderRadius: '6px', transition: 'all 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}
