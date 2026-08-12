'use client'

import { useState, useTransition, useMemo } from 'react'
import { HeartHandshake, Plus, Trash2, Users, Filter, FileSpreadsheet, Printer, ChevronDown, ChevronUp, X, Check, UserPlus } from 'lucide-react'
import {
  createSpecialNeedAction, deleteSpecialNeedAction,
  addStudentNeedAction, removeStudentNeedAction,
  toggleStudentNeedActiveAction
} from '@/app/actions/specialNeeds'
import * as XLSX from 'xlsx'

const PRESET_COLORS = ['#6366f1', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4']

type Props = {
  initialCategories: any[]
  initialNeeds: any[]
  initialStudentNeeds: any[]
  allClasses: any[]
}

export default function NeedsManager({ initialCategories, initialNeeds, initialStudentNeeds, allClasses }: Props) {
  const [categories, setCategories] = useState(initialCategories)
  const [needs, setNeeds] = useState(initialNeeds)
  const [studentNeeds, setStudentNeeds] = useState(initialStudentNeeds)
  const [isPending, startTransition] = useTransition()

  const getCategoryInfo = (catId: string) => categories.find(c => c.id === catId) ?? { name: 'Geral', color: '#9ca3af', icon: '' }

  // UI state
  const [selectedNeedId, setSelectedNeedId] = useState<string | null>(null)
  const [showCreateNeed, setShowCreateNeed] = useState(false)
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [filterCategory, setFilterCategory] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null)

  // Create need form
  const [newNeed, setNewNeed] = useState({ name: '', description: '', categoryId: initialCategories[0]?.id || '', color: '#6366f1', actions: '' })
  
  // Category manager form
  const [newCat, setNewCat] = useState({ name: '', color: '#ef4444', icon: '' })

  // Add student form
  const [addForm, setAddForm] = useState({ enrollmentId: '', notes: '', startDate: '', endDate: '' })
  const [enrollmentSearch, setEnrollmentSearch] = useState('')

  // ---- Derived data ----
  const selectedNeed = needs.find(n => n.id === selectedNeedId)

  const filteredStudentNeeds = useMemo(() => {
    return studentNeeds.filter(sn => {
      if (selectedNeedId && sn.specialNeedId !== selectedNeedId) return false
      if (filterCategory && sn.specialNeed.categoryId !== filterCategory) return false
      if (filterClass && sn.enrollment.classId !== filterClass) return false
      return true
    })
  }, [studentNeeds, selectedNeedId, filterCategory, filterClass])

  const sortedStudentNeeds = useMemo(() => {
    const list = [...filteredStudentNeeds]
    if (sortConfig) {
      list.sort((a, b) => {
        let valA = ''
        let valB = ''
        if (sortConfig.key === 'Aluno') {
          valA = a.student.name.toLowerCase()
          valB = b.student.name.toLowerCase()
        } else if (sortConfig.key === 'Turma') {
          valA = `${a.enrollment.class.subject.name} ${a.enrollment.class.turmaName || ''}`.toLowerCase()
          valB = `${b.enrollment.class.subject.name} ${b.enrollment.class.turmaName || ''}`.toLowerCase()
        } else if (sortConfig.key === 'Necessidade') {
          valA = a.specialNeed.name.toLowerCase()
          valB = b.specialNeed.name.toLowerCase()
        }
        
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return list
  }, [filteredStudentNeeds, sortConfig])

  // Enrollment search (client-side from allClasses)
  const enrollmentResults = useMemo(() => {
    if (!enrollmentSearch.trim() || enrollmentSearch.length < 2) return []
    const q = enrollmentSearch.toLowerCase()
    const results: any[] = []
    allClasses.forEach(cls => {
      cls.enrollments.forEach((enr: any) => {
        if (enr.student.name.toLowerCase().includes(q) || (enr.student.rgm && enr.student.rgm.includes(q))) {
          results.push({ ...enr, class: cls })
        }
      })
    })
    return results.slice(0, 8)
  }, [enrollmentSearch, allClasses])

  // ---- Actions ----
  const handleCreateNeed = () => {
    if (!newNeed.name.trim()) return
    startTransition(async () => {
      const res = await createSpecialNeedAction(newNeed)
      if (res.success) {
        setShowCreateNeed(false)
        setNewNeed({ name: '', description: '', categoryId: categories[0]?.id || '', color: '#6366f1', actions: '' })
        window.location.reload()
      }
    })
  }

  const handleCreateCategory = async () => {
    if (!newCat.name.trim()) return
    startTransition(async () => {
      const { createSpecialNeedCategoryAction } = await import('@/app/actions/specialNeedCategories')
      const res = await createSpecialNeedCategoryAction(newCat)
      if (res.success) {
        setCategories(prev => [...prev, res.category])
        setNewCat({ name: '', color: '#ef4444', icon: '' })
      } else {
        alert(res.message)
      }
    })
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Excluir esta categoria? Necessidades associadas ficarão "Gerais".')) return
    startTransition(async () => {
      const { deleteSpecialNeedCategoryAction } = await import('@/app/actions/specialNeedCategories')
      const res = await deleteSpecialNeedCategoryAction(id)
      if (res.success) {
        setCategories(prev => prev.filter(c => c.id !== id))
      } else {
        alert(res.message)
      }
    })
  }

  const handleDeleteNeed = (id: string) => {
    if (!confirm('Excluir esta necessidade e todas as associações de alunos?')) return
    startTransition(async () => {
      await deleteSpecialNeedAction(id)
      setNeeds(prev => prev.filter(n => n.id !== id))
      setStudentNeeds(prev => prev.filter(sn => sn.specialNeedId !== id))
      if (selectedNeedId === id) setSelectedNeedId(null)
    })
  }

  const handleAddStudent = () => {
    if (!addForm.enrollmentId || !selectedNeedId) return
    const enr = allClasses.flatMap(c => c.enrollments.map((e: any) => ({ ...e, class: c }))).find((e: any) => e.id === addForm.enrollmentId)
    if (!enr) return
    startTransition(async () => {
      const res = await addStudentNeedAction({
        studentId: enr.student.id,
        specialNeedId: selectedNeedId,
        enrollmentId: enr.id,
        notes: addForm.notes,
        startDate: addForm.startDate,
        endDate: addForm.endDate,
      })
      if (res.success) {
        setShowAddStudent(false)
        setAddForm({ enrollmentId: '', notes: '', startDate: '', endDate: '' })
        setEnrollmentSearch('')
        window.location.reload()
      } else {
        alert(res.message)
      }
    })
  }

  const handleRemoveStudent = (id: string) => {
    startTransition(async () => {
      await removeStudentNeedAction(id)
      setStudentNeeds(prev => prev.filter(sn => sn.id !== id))
    })
  }

  const handleToggleActive = (id: string, current: boolean) => {
    startTransition(async () => {
      await toggleStudentNeedActiveAction(id, !current)
      setStudentNeeds(prev => prev.map(sn => sn.id === id ? { ...sn, active: !current } : sn))
    })
  }

  const handleSort = (key: string) => {
    if (!['Aluno', 'Turma', 'Necessidade'].includes(key)) return
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  // ---- XLSX Export ----
  const exportXLSX = () => {
    const rows = sortedStudentNeeds.map(sn => ({
      'Aluno': sn.student.name,
      'RGM': sn.student.rgm || '',
      'Necessidade': sn.specialNeed.name,
      'Categoria': getCategoryInfo(sn.specialNeed.categoryId)?.name || 'Geral',
      'Turma': `${sn.enrollment.class.subject.name}${sn.enrollment.class.turmaName ? ` — ${sn.enrollment.class.turmaName}` : ''}`,
      'Semestre': sn.enrollment.class.semester.name,
      'Observações': sn.notes || '',
      'Início': sn.startDate ? new Date(sn.startDate).toLocaleDateString('pt-BR') : '',
      'Fim': sn.endDate ? new Date(sn.endDate).toLocaleDateString('pt-BR') : 'Indeterminado',
      'Ativo': sn.active ? 'Sim' : 'Não',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Atenção Especial')
    XLSX.writeFile(wb, 'Atencao_Especial.xlsx')
  }

  const handlePrint = () => window.print()

  return (
    <div>
      <div className="page-header no-print">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <HeartHandshake size={28} color="var(--accent)" />
            Atenção Especial
          </h1>
          <p className="page-description">Gerencie alunos com necessidades especiais por turma.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={exportXLSX} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
            <FileSpreadsheet size={16} /> XLSX
          </button>
          <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'rgba(255,255,255,0.08)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
            <Printer size={16} /> PDF
          </button>
          <button onClick={() => setShowCategoryManager(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'rgba(255,255,255,0.08)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
            <Filter size={16} /> Categorias
          </button>
          <button onClick={() => setShowCreateNeed(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> Nova Necessidade
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px' }}>

        {/* Left: Needs List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, padding: '0 4px' }}>Necessidades cadastradas</p>
          <button
            onClick={() => setSelectedNeedId(null)}
            style={{
              padding: '12px 14px', borderRadius: '10px', border: `1px solid ${!selectedNeedId ? 'var(--accent)' : 'var(--surface-border)'}`,
              background: !selectedNeedId ? 'rgba(99,102,241,0.1)' : 'transparent',
              color: !selectedNeedId ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer', textAlign: 'left', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            <Users size={16} /> Todos os alunos ({studentNeeds.length})
          </button>

          {needs.map(need => {
            const cat = getCategoryInfo(need.categoryId)
            const isSelected = selectedNeedId === need.id
            return (
              <div key={need.id} style={{ position: 'relative' }}>
                <button
                  onClick={() => setSelectedNeedId(isSelected ? null : need.id)}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: '10px',
                    border: `1px solid ${isSelected ? need.color : 'var(--surface-border)'}`,
                    background: isSelected ? `${need.color}18` : 'transparent',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: need.color, flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>{need.name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: cat.color }}>{cat.icon} {cat.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{need._count.studentNeeds} alunos</span>
                  </div>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteNeed(need.id); }}
                  style={{ 
                    position: 'absolute', top: '8px', right: '8px', 
                    background: 'none', border: 'none', 
                    color: '#ef4444', cursor: 'pointer', padding: '4px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                  title="Excluir necessidade"
                >
                  <X size={16} />
                </button>
              </div>
            )
          })}

          {needs.length === 0 && (
            <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <HeartHandshake size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
              <p>Nenhuma necessidade cadastrada.</p>
              <p>Clique em "Nova Necessidade" para começar.</p>
            </div>
          )}
        </div>

        {/* Right: Students table */}
        <div>
          {/* Filters */}
          <div className="glass-panel no-print" style={{ padding: '16px 20px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Filter size={16} color="var(--text-secondary)" />
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)', borderRadius: '8px', padding: '6px 10px', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              <option value="">Todas as categorias</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
            <select
              value={filterClass}
              onChange={e => setFilterClass(e.target.value)}
              style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)', borderRadius: '8px', padding: '6px 10px', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              <option value="">Todas as turmas</option>
              {allClasses.map(c => (
                <option key={c.id} value={c.id}>{c.subject.name}{c.turmaName ? ` — ${c.turmaName}` : ''} | {c.semester.name}</option>
              ))}
            </select>
            <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              {sortedStudentNeeds.length} registro(s)
            </span>
            {selectedNeed && (
              <button
                onClick={() => setShowAddStudent(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: 'var(--accent)', border: 'none', color: '#fff', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
              >
                <UserPlus size={15} /> Adicionar aluno
              </button>
            )}
          </div>

          <div className="glass-panel" style={{ overflow: 'hidden' }}>
            {sortedStudentNeeds.length === 0 ? (
              <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Users size={40} style={{ opacity: 0.2, marginBottom: '12px' }} />
                <p style={{ marginBottom: '8px' }}>{selectedNeed ? `Nenhum aluno associado a "${selectedNeed.name}"` : 'Nenhum registro encontrado.'}</p>
                {selectedNeed && (
                  <button onClick={() => setShowAddStudent(true)} className="btn-primary" style={{ marginTop: '12px', fontSize: '0.9rem', padding: '8px 18px' }}>
                    <UserPlus size={15} style={{ display: 'inline', marginRight: '6px' }} /> Adicionar aluno
                  </button>
                )}
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.2)', textAlign: 'left' }}>
                    {['Aluno', 'Turma', 'Necessidade', 'Observações', 'Período', 'Status', ''].map(h => {
                      const sortable = ['Aluno', 'Turma', 'Necessidade'].includes(h)
                      return (
                        <th 
                          key={h} 
                          onClick={() => sortable && handleSort(h)}
                          style={{ 
                            padding: '14px 16px', color: 'var(--text-secondary)', fontWeight: 500, 
                            borderBottom: '1px solid var(--surface-border)', fontSize: '0.85rem',
                            cursor: sortable ? 'pointer' : 'default',
                            userSelect: 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {h}
                            {sortable && (
                              <span style={{ opacity: sortConfig?.key === h ? 1 : 0.3 }}>
                                {sortConfig?.key === h && sortConfig.direction === 'desc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </span>
                            )}
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {sortedStudentNeeds.map((sn, i) => {
                    const cat = getCategoryInfo(sn.specialNeed.categoryId)
                    return (
                      <tr key={sn.id} style={{ borderBottom: '1px solid var(--surface-border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)', opacity: sn.active ? 1 : 0.5 }}>
                        <td style={{ padding: '14px 16px' }}>
                          <p style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.92rem' }}>{sn.student.name}</p>
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{sn.student.rgm ? `RGM: ${sn.student.rgm}` : ''}</p>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          <p>{sn.enrollment.class.subject.name}{sn.enrollment.class.turmaName ? ` — ${sn.enrollment.class.turmaName}` : ''}</p>
                          <p style={{ fontSize: '0.78rem' }}>{sn.enrollment.class.semester.name}</p>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: `${sn.specialNeed.color}20`, border: `1px solid ${sn.specialNeed.color}40`, borderRadius: '8px', padding: '3px 8px', fontSize: '0.8rem', color: sn.specialNeed.color, fontWeight: 600 }}>
                            {sn.specialNeed.name}
                          </span>
                          <p style={{ fontSize: '0.72rem', color: cat.color, marginTop: '3px' }}>{cat.icon} {cat.name}</p>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '180px' }}>
                          {sn.notes || <span style={{ opacity: 0.4 }}>—</span>}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {sn.startDate ? new Date(sn.startDate).toLocaleDateString('pt-BR') : '—'}
                          {sn.endDate ? ` até ${new Date(sn.endDate).toLocaleDateString('pt-BR')}` : sn.startDate ? ' • Indeterminado' : ''}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <button
                            onClick={() => handleToggleActive(sn.id, sn.active)}
                            style={{ padding: '4px 10px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem', background: sn.active ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: sn.active ? '#10b981' : '#ef4444' }}
                          >
                            {sn.active ? 'Ativo' : 'Inativo'}
                          </button>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <button onClick={() => handleRemoveStudent(sn.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }} title="Remover associação">
                            <X size={16} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Create Need */}
      {showCreateNeed && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '32px', animation: 'slideDown 0.2s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Nova Necessidade Especial</h2>
              <button onClick={() => setShowCreateNeed(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Nome *</label>
                <input className="glass-input" value={newNeed.name} onChange={e => setNewNeed(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Saída Antecipada, Afastamento Médico..." />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Categoria</label>
                <select className="glass-input" value={newNeed.categoryId} onChange={e => setNewNeed(p => ({ ...p, categoryId: e.target.value }))}>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Descrição</label>
                <textarea className="glass-input" value={newNeed.description} onChange={e => setNewNeed(p => ({ ...p, description: e.target.value }))} placeholder="Descreva a necessidade..." rows={2} style={{ resize: 'vertical' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Ações necessárias</label>
                <textarea className="glass-input" value={newNeed.actions} onChange={e => setNewNeed(p => ({ ...p, actions: e.target.value }))} placeholder="Ex: Permitir saída 15min antes, enviar atividades por e-mail..." rows={2} style={{ resize: 'vertical' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Cor de identificação</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {PRESET_COLORS.map(c => (
                    <button key={c} onClick={() => setNewNeed(p => ({ ...p, color: c }))} style={{ width: '28px', height: '28px', borderRadius: '50%', background: c, border: newNeed.color === c ? '3px solid #fff' : '2px solid transparent', cursor: 'pointer', outline: newNeed.color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }} />
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCreateNeed(false)} style={{ padding: '10px 18px', background: 'transparent', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleCreateNeed} disabled={isPending || !newNeed.name.trim()} className="btn-primary">
                {isPending ? 'Salvando...' : 'Criar Necessidade'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Student */}
      {showAddStudent && selectedNeed && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '560px', padding: '32px', animation: 'slideDown 0.2s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Adicionar Aluno</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Necessidade: <strong style={{ color: selectedNeed.color }}>{selectedNeed.name}</strong></p>
              </div>
              <button onClick={() => { setShowAddStudent(false); setEnrollmentSearch(''); setAddForm({ enrollmentId: '', notes: '', startDate: '', endDate: '' }) }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Buscar aluno (nome ou RGM)</label>
                <input
                  className="glass-input"
                  value={enrollmentSearch}
                  onChange={e => { setEnrollmentSearch(e.target.value); setAddForm(p => ({ ...p, enrollmentId: '' })) }}
                  placeholder="Digite nome ou RGM..."
                />
                {enrollmentResults.length > 0 && !addForm.enrollmentId && (
                  <div style={{ border: '1px solid var(--surface-border)', borderRadius: '8px', marginTop: '6px', overflow: 'hidden', maxHeight: '200px', overflowY: 'auto' }}>
                    {enrollmentResults.map((enr: any) => (
                      <button key={enr.id} onClick={() => { setAddForm(p => ({ ...p, enrollmentId: enr.id })); setEnrollmentSearch(`${enr.student.name} — ${enr.class.subject.name}${enr.class.turmaName ? ` ${enr.class.turmaName}` : ''}`) }} style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--surface-border)', cursor: 'pointer', textAlign: 'left', color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>
                          <strong style={{ fontSize: '0.9rem' }}>{enr.student.name}</strong>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginLeft: '8px' }}>{enr.student.rgm ? `RGM: ${enr.student.rgm}` : ''}</span>
                        </span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{enr.class.subject.name}{enr.class.turmaName ? ` — ${enr.class.turmaName}` : ''}</span>
                      </button>
                    ))}
                  </div>
                )}
                {addForm.enrollmentId && <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '0.85rem' }}><Check size={14} /> Aluno selecionado</div>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Observação individual</label>
                <textarea className="glass-input" value={addForm.notes} onChange={e => setAddForm(p => ({ ...p, notes: e.target.value }))} placeholder="Ex: Afastado desde 01/06, retorno previsto em 15/07..." rows={2} style={{ resize: 'vertical' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Data de início</label>
                  <input type="date" className="glass-input" value={addForm.startDate} onChange={e => setAddForm(p => ({ ...p, startDate: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Data de fim (opcional)</label>
                  <input type="date" className="glass-input" value={addForm.endDate} onChange={e => setAddForm(p => ({ ...p, endDate: e.target.value }))} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowAddStudent(false); setEnrollmentSearch(''); }} style={{ padding: '10px 18px', background: 'transparent', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleAddStudent} disabled={isPending || !addForm.enrollmentId} className="btn-primary">
                {isPending ? 'Adicionando...' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Category Manager */}
      {showCategoryManager && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '32px', animation: 'slideDown 0.2s ease', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Gerenciar Categorias</h2>
              <button onClick={() => setShowCategoryManager(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px', marginBottom: '16px' }}>
              {categories.length === 0 ? <p style={{color: 'var(--text-secondary)'}}>Sem categorias cadastradas.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {categories.map(c => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: `1px solid ${c.color}30` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.2rem' }}>{c.icon}</span>
                        <span style={{ fontWeight: 500, color: c.color }}>{c.name}</span>
                      </div>
                      <button onClick={() => handleDeleteCategory(c.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
              <h3 style={{ fontSize: '0.95rem', marginBottom: '12px', fontWeight: 600 }}>Nova Categoria</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 40px', gap: '8px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Ícone</label>
                  <input className="glass-input" style={{ textAlign: 'center', padding: '8px 4px' }} value={newCat.icon} onChange={e => setNewCat(p => ({ ...p, icon: e.target.value }))} placeholder="🚌" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Nome da categoria</label>
                  <input className="glass-input" style={{ padding: '8px 12px' }} value={newCat.name} onChange={e => setNewCat(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Psicológica" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', textAlign: 'center' }}>Cor</label>
                  <input type="color" value={newCat.color} onChange={e => setNewCat(p => ({ ...p, color: e.target.value }))} style={{ width: '40px', height: '36px', padding: '0', border: 'none', cursor: 'pointer', background: 'transparent' }} />
                </div>
              </div>
              <button onClick={handleCreateCategory} disabled={isPending || !newCat.name.trim()} className="btn-primary" style={{ width: '100%', marginTop: '12px', padding: '10px' }}>
                {isPending ? 'Salvando...' : 'Adicionar Categoria'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown { from { opacity: 0; transform: translateY(-12px) } to { opacity: 1; transform: translateY(0) } }
        .delete-need-btn { opacity: 0; transition: opacity 0.15s; }
        div:hover > .delete-need-btn { opacity: 1; }
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; color: #000 !important; }
          .sidebar, .dashboard-layout { display: block !important; }
          .sidebar { display: none !important; }
        }
      `}</style>
    </div>
  )
}
