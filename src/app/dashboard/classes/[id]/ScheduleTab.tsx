'use client'

import { useState } from 'react'
import { Calendar, Plus, Trash2, CalendarDays, Palette, ExternalLink, Filter, Copy, RefreshCw } from 'lucide-react'
import { generateScheduleAction, updateScheduleEntryAction, deleteScheduleEntryAction, addSingleScheduleEntryAction, copyScheduleEntryAction, mirrorSchedulePlanAction } from '@/app/actions/schedule'

export default function ScheduleTab({ classData, allClasses }: { classData: any; allClasses: any[] }) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [startDate, setStartDate] = useState(classData.startDate ? new Date(classData.startDate).toISOString().split('T')[0] : '')
  const [endDate, setEndDate] = useState(classData.endDate ? new Date(classData.endDate).toISOString().split('T')[0] : '')
  const [selectedDays, setSelectedDays] = useState<number[]>(classData.daysOfWeek ? JSON.parse(classData.daysOfWeek) : [])
  
  const [newDate, setNewDate] = useState('')
  const [filterColor, setFilterColor] = useState('ALL')

  // Copy single entry state
  const [copyingEntryId, setCopyingEntryId] = useState<string | null>(null)
  const [copyTargetClassId, setCopyTargetClassId] = useState('')
  const [copyTargetEntryId, setCopyTargetEntryId] = useState('')
  const [isCopying, setIsCopying] = useState(false)

  // Mirror modal state
  const [showMirrorModal, setShowMirrorModal] = useState(false)
  const [mirrorTargetClassId, setMirrorTargetClassId] = useState('')
  const [mirrorOverwrite, setMirrorOverwrite] = useState(false)
  const [isMirroring, setIsMirroring] = useState(false)
  
  // State for inline editing
  const [editingEntry, setEditingEntry] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editDriveLink, setEditDriveLink] = useState('')

  const daysOptions = [
    { value: 1, label: 'Seg' },
    { value: 2, label: 'Ter' },
    { value: 3, label: 'Qua' },
    { value: 4, label: 'Qui' },
    { value: 5, label: 'Sex' },
    { value: 6, label: 'Sáb' },
    { value: 0, label: 'Dom' }
  ]

  const handleToggleDay = (day: number) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  const [showConfirmGenerate, setShowConfirmGenerate] = useState(false)

  const handleGenerate = async (force: boolean = false) => {
    if (!startDate || !endDate || selectedDays.length === 0) {
      alert('Preencha data de início, fim e selecione pelo menos um dia da semana.')
      return
    }
    
    if (classData.scheduleEntries?.length > 0 && !force) {
      setShowConfirmGenerate(true)
      return
    }

    setIsGenerating(true)
    setShowConfirmGenerate(false)
    const result = await generateScheduleAction(classData.id, startDate, endDate, JSON.stringify(selectedDays))
    setIsGenerating(false)
    
    if (!result.success) {
      alert(result.message)
    }
  }

  const handleAddSingleDate = async () => {
    if (!newDate) return
    const res = await addSingleScheduleEntryAction(classData.id, newDate)
    if (res.success) {
      setNewDate('')
    } else {
      alert(res.message)
    }
  }

  const handleStartEdit = (entry: any) => {
    setEditingEntry(entry.id)
    setEditContent(entry.content || '')
    setEditNotes(entry.notes || '')
    setEditColor(entry.rowColor || '')
    setEditDriveLink(entry.driveLink || '')
  }

  const handleSaveEdit = async (entryId: string) => {
    const res = await updateScheduleEntryAction(entryId, {
      content: editContent,
      notes: editNotes,
      rowColor: editColor || null,
      driveLink: editDriveLink || null
    })
    
    if (res.success) {
      setEditingEntry(null)
    } else {
      alert(res.message)
    }
  }

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const handleDelete = async (entryId: string) => {
    if (confirmDeleteId === entryId) {
      const res = await deleteScheduleEntryAction(entryId)
      if (!res?.success) alert(res?.message || 'Erro ao excluir.')
      setConfirmDeleteId(null)
    } else {
      setConfirmDeleteId(entryId)
      // reset after 5 seconds
      setTimeout(() => setConfirmDeleteId(null), 5000)
    }
  }

  const otherClasses = allClasses.filter(c => c.id !== classData.id)

  const handleCopyEntry = async () => {
    if (!copyTargetClassId || !copyTargetEntryId) return
    setIsCopying(true)
    const res = await copyScheduleEntryAction(copyingEntryId!, copyTargetEntryId)
    setIsCopying(false)
    if (res.success) {
      setCopyingEntryId(null)
      setCopyTargetClassId('')
      setCopyTargetEntryId('')
      alert('✅ Aula copiada com sucesso!')
    } else {
      alert(res.message)
    }
  }

  const handleMirror = async () => {
    if (!mirrorTargetClassId) return
    setIsMirroring(true)
    const res = await mirrorSchedulePlanAction(classData.id, mirrorTargetClassId, mirrorOverwrite)
    setIsMirroring(false)
    if (res.success) {
      setShowMirrorModal(false)
      alert(`✅ ${(res as any).count} aulas espelhadas com sucesso!`)
    } else {
      alert(res.message)
    }
  }

  const colors = [
    { val: '', label: 'Padrão' },
    { val: 'rgba(239, 68, 68, 0.1)', label: 'Vermelho (Feriado)' },
    { val: 'rgba(245, 158, 11, 0.1)', label: 'Amarelo (Atenção/Ponte)' },
    { val: 'rgba(59, 130, 246, 0.1)', label: 'Azul (Especial)' },
    { val: 'rgba(16, 185, 129, 0.1)', label: 'Verde (Reposição)' },
    { val: 'rgba(168, 85, 247, 0.2)', label: 'Roxo (Prova/Avaliação)' }
  ]

  // Sort entries by date
  const sortedEntries = [...(classData.scheduleEntries || [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Filter entries
  const filteredEntries = sortedEntries.filter(entry => {
    if (filterColor === 'ALL') return true
    const defaultBg = entry.isHoliday ? 'rgba(239, 68, 68, 0.1)' : ''
    const bg = entry.rowColor || defaultBg
    return bg === filterColor
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Painel de Configuração / Geração */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <CalendarDays size={20} color="var(--accent)" /> 
          Configuração do Cronograma
        </h3>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Data de Início</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              style={{ padding: '10px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--surface-border)', color: '#fff', colorScheme: 'dark' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Data de Término</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              style={{ padding: '10px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--surface-border)', color: '#fff', colorScheme: 'dark' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Dias da Semana</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {daysOptions.map(day => (
                <button
                  key={day.value}
                  onClick={() => handleToggleDay(day.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: selectedDays.includes(day.value) ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                    border: '1px solid',
                    borderColor: selectedDays.includes(day.value) ? 'var(--accent)' : 'var(--surface-border)',
                    color: selectedDays.includes(day.value) ? '#000' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontWeight: selectedDays.includes(day.value) ? '600' : '400'
                  }}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          <button 
            className="btn-primary" 
            onClick={() => handleGenerate(false)}
            disabled={isGenerating}
            style={{ marginLeft: 'auto' }}
          >
            {isGenerating ? 'Gerando...' : 'Gerar Datas'}
          </button>
        </div>
        
        {showConfirmGenerate && (
          <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#fca5a5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>⚠️ Isto irá apagar o cronograma atual e regerar as datas. Tem certeza?</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowConfirmGenerate(false)} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #fca5a5', color: '#fca5a5', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => handleGenerate(true)} style={{ padding: '6px 12px', background: '#ef4444', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}>Sim, Apagar e Regerar</button>
            </div>
          </div>
        )}
      </div>

      {/* Lista de Datas */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} color="var(--accent)" /> 
            Aulas ({filteredEntries.length})
          </h3>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '8px' }}>
              <Filter size={14} color="var(--text-secondary)" />
              <select 
                value={filterColor} 
                onChange={e => setFilterColor(e.target.value)}
                style={{ padding: '6px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--surface-border)', color: '#fff', fontSize: '0.85rem' }}
              >
                <option value="ALL">Todas as Linhas</option>
                {colors.map(c => <option key={c.val} value={c.val}>{c.label}</option>)}
              </select>
            </div>

            {/* Mirror button */}
            {otherClasses.length > 0 && (
              <button
                onClick={() => setShowMirrorModal(true)}
                style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.4)', color: '#c084fc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
                title="Espelhar plano de aula para outra turma"
              >
                <RefreshCw size={14} /> Espelhar Plano
              </button>
            )}
            
            <input 
              type="date" 
              value={newDate} 
              onChange={e => setNewDate(e.target.value)}
              style={{ padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--surface-border)', color: '#fff', colorScheme: 'dark', fontSize: '0.85rem' }}
            />
            <button 
              onClick={handleAddSingleDate}
              style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', border: '1px solid var(--surface-border)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
            >
              <Plus size={16} /> Adicionar Dia
            </button>
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
            <p>Nenhuma aula encontrada para este filtro.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '500', width: '120px' }}>Data</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '500' }}>Plano de Aula / Conteúdo</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '500', width: '250px' }}>Observações</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: '500', width: '150px' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry: any) => {
                  const dateObj = new Date(entry.date)
                  // Format as DD/MM/YYYY using UTC to avoid timezone shift
                  const formattedDate = dateObj.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
                  
                  const isEditing = editingEntry === entry.id
                  const defaultBg = entry.isHoliday ? 'rgba(239, 68, 68, 0.1)' : ''
                  const bg = entry.rowColor || defaultBg

                  return (
                    <tr key={entry.id} style={{ borderBottom: '1px solid var(--surface-border)', background: bg }}>
                      <td style={{ padding: '12px', fontWeight: '500', color: entry.isHoliday ? '#f87171' : 'var(--text-primary)' }}>
                        {formattedDate}
                        {entry.isHoliday && <div style={{ fontSize: '0.7rem', color: '#f87171' }}>Feriado</div>}
                      </td>
                      
                      {isEditing ? (
                        <>
                          <td style={{ padding: '8px' }}>
                            <textarea 
                              value={editContent} 
                              onChange={e => setEditContent(e.target.value)}
                              style={{ width: '100%', minHeight: '60px', padding: '8px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--accent)', color: '#fff', resize: 'vertical', fontFamily: 'inherit' }}
                              placeholder="Conteúdo da aula..."
                            />
                            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Palette size={14} color="var(--text-secondary)" />
                              <select 
                                value={editColor} 
                                onChange={e => setEditColor(e.target.value)}
                                style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--surface-border)', color: '#fff', fontSize: '0.8rem' }}
                              >
                                {colors.map(c => <option key={c.val} value={c.val}>{c.label}</option>)}
                              </select>
                            </div>
                          </td>
                          <td style={{ padding: '8px' }}>
                            <textarea 
                              value={editNotes} 
                              onChange={e => setEditNotes(e.target.value)}
                              style={{ width: '100%', minHeight: '60px', padding: '8px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--accent)', color: '#fff', resize: 'vertical', fontFamily: 'inherit', marginBottom: '8px' }}
                              placeholder="Observações..."
                            />
                            <input 
                              type="text"
                              value={editDriveLink}
                              onChange={e => setEditDriveLink(e.target.value)}
                              placeholder="Link do Material (Google Drive)"
                              style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--surface-border)', color: '#fff', fontSize: '0.85rem' }}
                            />
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <button onClick={() => handleSaveEdit(entry.id)} style={{ padding: '6px 12px', background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.4)', color: '#4ade80', borderRadius: '4px', cursor: 'pointer' }}>
                                Salvar
                              </button>
                              <button onClick={() => setEditingEntry(null)} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)', borderRadius: '4px', cursor: 'pointer' }}>
                                Cancelar
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '12px', whiteSpace: 'pre-wrap', color: entry.isHoliday ? '#f87171' : 'var(--text-secondary)' }}>
                            {entry.content}
                          </td>
                          <td style={{ padding: '12px', whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            {entry.notes}
                            {entry.driveLink && (
                              <div style={{ marginTop: '12px' }}>
                                <a 
                                  href={entry.driveLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60a5fa', borderRadius: '4px', textDecoration: 'none', fontSize: '0.75rem', fontWeight: 500 }}
                                >
                                  <ExternalLink size={12} /> Material de Aula (Drive)
                                </a>
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <button 
                                onClick={() => handleStartEdit(entry)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                                title="Editar Aula"
                              >
                                ✏️
                              </button>
                              {otherClasses.length > 0 && (
                                <button 
                                  onClick={() => { setCopyingEntryId(entry.id); setCopyTargetClassId(''); setCopyTargetEntryId('') }}
                                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                                  title="Copiar esta aula para outra turma"
                                >
                                  <Copy size={15} />
                                </button>
                              )}
                              <button 
                                onClick={() => handleDelete(entry.id)}
                                style={{ 
                                  background: confirmDeleteId === entry.id ? 'rgba(239, 68, 68, 0.2)' : 'none', 
                                  border: 'none', 
                                  color: confirmDeleteId === entry.id ? '#fca5a5' : 'var(--text-secondary)', 
                                  cursor: 'pointer', 
                                  padding: '4px',
                                  borderRadius: '4px'
                                }}
                                title={confirmDeleteId === entry.id ? 'Clique novamente para confirmar' : 'Excluir Aula'}
                              >
                                {confirmDeleteId === entry.id ? 'Confirmar' : <Trash2 size={16} />}
                              </button>
                            </div>

                            {/* Copy popover */}
                            {copyingEntryId === entry.id && (
                              <div style={{ marginTop: '8px', padding: '12px', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(165,180,252,0.3)', borderRadius: '8px', textAlign: 'left', minWidth: '220px' }}>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Copiar para:</p>
                                <select
                                  value={copyTargetClassId}
                                  onChange={e => { setCopyTargetClassId(e.target.value); setCopyTargetEntryId('') }}
                                  style={{ width: '100%', padding: '6px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--surface-border)', color: '#fff', fontSize: '0.8rem', marginBottom: '6px' }}
                                >
                                  <option value="">Selecione a turma...</option>
                                  {otherClasses.map(c => (
                                    <option key={c.id} value={c.id}>
                                      {c.subject.name}{c.turmaName ? ` — ${c.turmaName}` : ''} | {c.semester.name}
                                    </option>
                                  ))}
                                </select>
                                {copyTargetClassId && (
                                  <select
                                    value={copyTargetEntryId}
                                    onChange={e => setCopyTargetEntryId(e.target.value)}
                                    style={{ width: '100%', padding: '6px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--surface-border)', color: '#fff', fontSize: '0.8rem', marginBottom: '8px' }}
                                  >
                                    <option value="">Selecione a data...</option>
                                    {otherClasses
                                      .find(c => c.id === copyTargetClassId)
                                      ?.scheduleEntries
                                      .map((e: any) => (
                                        <option key={e.id} value={e.id}>
                                          {new Date(e.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}{e.content ? ` — ${e.content.substring(0, 30)}...` : ''}
                                        </option>
                                      ))}
                                  </select>
                                )}
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button
                                    onClick={handleCopyEntry}
                                    disabled={!copyTargetEntryId || isCopying}
                                    style={{ flex: 1, padding: '6px', background: 'rgba(165,180,252,0.2)', border: '1px solid rgba(165,180,252,0.4)', color: 'var(--accent)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                                  >
                                    {isCopying ? '...' : 'Copiar'}
                                  </button>
                                  <button
                                    onClick={() => setCopyingEntryId(null)}
                                    style={{ padding: '6px 10px', background: 'transparent', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mirror Modal */}
      {showMirrorModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ padding: '32px', width: '100%', maxWidth: '480px', margin: '16px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <RefreshCw size={20} color="#c084fc" /> Espelhar Plano de Aula
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
              O conteúdo das aulas desta turma será distribuído sequencialmente para os dias de aula da turma escolhida, pulando automaticamente os feriados.
            </p>

            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Turma de Destino</label>
            <select
              value={mirrorTargetClassId}
              onChange={e => setMirrorTargetClassId(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--surface-border)', color: '#fff', fontSize: '0.95rem', marginBottom: '20px' }}
            >
              <option value="">Selecione a turma...</option>
              {otherClasses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.subject.name}{c.turmaName ? ` — ${c.turmaName}` : ''} | {c.semester.name}{c.schedule ? ` | ${c.schedule}` : ''}
                </option>
              ))}
            </select>

            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Modo de Preenchimento</label>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
              <button
                onClick={() => setMirrorOverwrite(false)}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `2px solid ${!mirrorOverwrite ? '#a78bfa' : 'var(--surface-border)'}`, background: !mirrorOverwrite ? 'rgba(167,139,250,0.1)' : 'transparent', color: !mirrorOverwrite ? '#c084fc' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: !mirrorOverwrite ? '600' : '400' }}
              >
                Apenas aulas vazias
              </button>
              <button
                onClick={() => setMirrorOverwrite(true)}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `2px solid ${mirrorOverwrite ? '#f87171' : 'var(--surface-border)'}`, background: mirrorOverwrite ? 'rgba(248,113,113,0.1)' : 'transparent', color: mirrorOverwrite ? '#f87171' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: mirrorOverwrite ? '600' : '400' }}
              >
                ⚠️ Sobrescrever tudo
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleMirror}
                disabled={!mirrorTargetClassId || isMirroring}
                style={{ flex: 1, padding: '12px', background: mirrorTargetClassId ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${mirrorTargetClassId ? 'rgba(167,139,250,0.5)' : 'var(--surface-border)'}`, color: mirrorTargetClassId ? '#c084fc' : 'var(--text-secondary)', borderRadius: '8px', cursor: mirrorTargetClassId ? 'pointer' : 'not-allowed', fontWeight: '600', fontSize: '0.95rem' }}
              >
                {isMirroring ? 'Espelhando...' : '🔁 Espelhar Agora'}
              </button>
              <button
                onClick={() => setShowMirrorModal(false)}
                style={{ padding: '12px 20px', background: 'transparent', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)', borderRadius: '8px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
