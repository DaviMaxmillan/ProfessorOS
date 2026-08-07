'use client'

import { useState } from 'react'
import { DownloadCloud, Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { deleteClassAction, updateClassAction } from '@/app/actions/classes'

export default function ClassHeader({ classData }: { classData: any }) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    const confirmation = prompt(`Tem certeza que deseja excluir esta turma e TODOS os dados (alunos, notas, frequências) vinculados a ela?\nEssa ação não pode ser desfeita.\n\nPara confirmar, digite o nome exato da disciplina:\n${classData.subject.name}`)
    
    if (confirmation === classData.subject.name) {
      setIsDeleting(true)
      const res = await deleteClassAction(classData.id)
      if (res.success) {
        router.push('/dashboard/classes')
      } else {
        alert(res.message)
        setIsDeleting(false)
      }
    } else if (confirmation !== null) {
      alert('O nome digitado não confere. Exclusão cancelada.')
    }
  }

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const res = await updateClassAction(classData.id, formData)
    if (res.success) {
      setIsEditing(false)
    } else {
      alert(res.message)
    }
  }

  if (isEditing) {
    return (
      <div className="page-header" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h1 className="page-title">Editar Turma</h1>
        <form onSubmit={handleUpdate} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            name="subjectName" 
            defaultValue={classData.subject.name} 
            required 
            placeholder="Nome da Disciplina"
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.3)', color: '#fff' }}
          />
          <input 
            type="text" 
            name="turmaName" 
            defaultValue={classData.turmaName || ''} 
            placeholder="Turma (Ex: N1A)"
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.3)', color: '#fff', width: '120px' }}
          />
          <input 
            type="text" 
            name="schedule" 
            defaultValue={classData.schedule || ''} 
            placeholder="Dia/Período (Ex: Quinta manhã)"
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.3)', color: '#fff', width: '200px' }}
          />
          <input 
            type="text" 
            name="institutionName" 
            defaultValue={classData.institution?.name || ''} 
            required 
            placeholder="Instituição"
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.3)', color: '#fff', width: '180px' }}
          />
          <input 
            type="text" 
            name="semesterName" 
            defaultValue={classData.semester.name} 
            required 
            placeholder="Semestre"
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.3)', color: '#fff', width: '200px' }}
          />
          <button type="submit" className="btn-primary" style={{ padding: '8px 16px' }}>Salvar</button>
          <button type="button" onClick={() => setIsEditing(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancelar</button>
        </form>
      </div>
    )
  }

  return (
    <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
      <div>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {classData.subject.name}{classData.turmaName ? ` — ${classData.turmaName}` : ''}
          <button onClick={() => setIsEditing(true)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }} title="Editar Turma">
            <Edit size={18} />
          </button>
        </h1>
        <p className="page-description">
          {classData.institution?.name ? `${classData.institution.name} • ` : ''}
          {classData.semester.name} • {classData.professor}
          {classData.schedule ? ` • ${classData.schedule}` : ''}
        </p>
      </div>
      <div style={{ display: 'flex', gap: '12px' }}>
        <button onClick={handleDelete} disabled={isDeleting} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s' }}>
          <Trash2 size={20} />
          {isDeleting ? 'Excluindo...' : 'Excluir Turma'}
        </button>
        <Link href="/dashboard/import" className="btn-primary" style={{ background: 'rgba(255,255,255,0.1)', textDecoration: 'none', color: '#fff' }}>
          <DownloadCloud size={20} />
          Sincronizar Planilha
        </Link>
      </div>
    </div>
  )
}
