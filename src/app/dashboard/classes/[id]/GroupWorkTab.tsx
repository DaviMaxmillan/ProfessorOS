'use client'

import { useState } from 'react'
import { Users, Plus, Trash2, Edit2, Settings, Shuffle, GraduationCap, FileSpreadsheet } from 'lucide-react'
import { 
  createGroupWorkAction, 
  deleteGroupWorkAction, 
  createGroupAction,
  deleteGroupAction,
  addMemberToGroupAction,
  removeMemberFromGroupAction,
  gradeGroupAction,
  generateRandomGroupsAction,
  updateGroupWorkAction
} from '@/app/actions/groupwork'
import { buildGroupsSheet, exportSheetXLSX } from '@/lib/exportClass'
import type { ClassDetail, GroupWorkDetail } from '@/lib/types'

export default function GroupWorkTab({ classData }: { classData: ClassDetail }) {
  const [selectedGroupWork, setSelectedGroupWork] = useState<any>(null)
  const [isCreatingGW, setIsCreatingGW] = useState(false)
  const [newGwName, setNewGwName] = useState('')
  const [newGwDesc, setNewGwDesc] = useState('')
  const [newGwWeight, setNewGwWeight] = useState('10')
  const [createActivity, setCreateActivity] = useState(true)

  const handleCreateGroupWork = async () => {
    if (!newGwName) return
    const res = await createGroupWorkAction(classData.id, newGwName, newGwDesc, parseFloat(newGwWeight), createActivity)
    if (res.success) {
      setIsCreatingGW(false)
      setNewGwName('')
      setNewGwDesc('')
    } else {
      alert(res.message)
    }
  }

  const handleDeleteGroupWork = async (id: string) => {
    if (confirm('Tem certeza que deseja apagar este trabalho em grupo?')) {
      await deleteGroupWorkAction(id)
      if (selectedGroupWork?.id === id) setSelectedGroupWork(null)
    }
  }

  // Se tem um selecionado, precisamos achar a versão atualizada dele no classData
  const activeGW = classData.groupWorks?.find((gw: any) => gw.id === (selectedGroupWork?.id || ''))

  return (
    <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
      {/* Sidebar: Lista de Trabalhos */}
      <div className="glass-panel" style={{ width: '300px', flexShrink: 0, padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Trabalhos</h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            onClick={() => setIsCreatingGW(true)}
            style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Plus size={16} /> Novo
          </button>
          <button
            onClick={() => {
              const ws = buildGroupsSheet(classData)
              const label = `${classData.subject.name}${classData.turmaName ? `_${classData.turmaName}` : ''}_${classData.semester.name}`.replace(/[/\\?%*:|"<>]/g, '-')
              exportSheetXLSX(ws, 'Grupos', `Grupos_${label}.xlsx`)
            }}
            title="Exportar grupos"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <FileSpreadsheet size={15} />
          </button>
        </div>
        </div>

        {isCreatingGW && (
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--surface-border)' }}>
            <input 
              type="text" 
              placeholder="Nome do Trabalho..."
              value={newGwName}
              onChange={e => setNewGwName(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--surface-border)', color: '#fff', marginBottom: '8px' }}
            />
            <textarea
              placeholder="Descrição curta..."
              value={newGwDesc}
              onChange={e => setNewGwDesc(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--surface-border)', color: '#fff', marginBottom: '8px', minHeight: '60px', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <input type="checkbox" checked={createActivity} onChange={e => setCreateActivity(e.target.checked)} id="createAct" />
              <label htmlFor="createAct" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Gerar nota no Diário</label>
            </div>
            {createActivity && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Peso:</span>
                <input 
                  type="number" 
                  value={newGwWeight}
                  onChange={e => setNewGwWeight(e.target.value)}
                  style={{ width: '60px', padding: '4px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--surface-border)', color: '#fff' }}
                />
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setIsCreatingGW(false)} style={{ flex: 1, padding: '6px', background: 'transparent', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleCreateGroupWork} style={{ flex: 1, padding: '6px', background: 'var(--accent)', border: 'none', color: '#000', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Salvar</button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {classData.groupWorks?.length === 0 && !isCreatingGW && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', padding: '20px 0' }}>Nenhum trabalho criado.</p>
          )}
          {classData.groupWorks?.map((gw: any) => (
            <div 
              key={gw.id}
              onClick={() => setSelectedGroupWork(gw)}
              style={{ 
                padding: '12px', 
                borderRadius: '8px', 
                background: selectedGroupWork?.id === gw.id ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.02)',
                border: '1px solid',
                borderColor: selectedGroupWork?.id === gw.id ? 'var(--accent)' : 'var(--surface-border)',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontWeight: 500, color: selectedGroupWork?.id === gw.id ? 'var(--accent)' : '#fff' }}>{gw.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {gw.groups?.length || 0} Grupos
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); handleDeleteGroupWork(gw.id) }}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Area: Detalhes do Trabalho e Grupos */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {!activeGW ? (
          <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Users size={48} color="rgba(255,255,255,0.1)" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Trabalhos em Grupo</h3>
            <p>Selecione um trabalho na lista ao lado ou crie um novo para gerenciar as equipes.</p>
          </div>
        ) : (
          <GroupWorkManager gw={activeGW} classData={classData} />
        )}
      </div>
    </div>
  )
}

function GroupWorkManager({ gw, classData }: { gw: GroupWorkDetail, classData: ClassDetail }) {
  const [newGroupName, setNewGroupName] = useState('')
  const [isRandomizing, setIsRandomizing] = useState(false)
  const [randomCount, setRandomCount] = useState('3')
  
  // Edit GroupWork state
  const [isEditingGW, setIsEditingGW] = useState(false)
  const [editGwName, setEditGwName] = useState(gw.name)
  const [editGwDesc, setEditGwDesc] = useState(gw.description || '')
  const [editGwWeight, setEditGwWeight] = useState(gw.activity?.weight?.toString() || '10')

  // Grade state
  const [gradingGroupId, setGradingGroupId] = useState<string | null>(null)
  const [gradeValue, setGradeValue] = useState('')
  const [gradeNotes, setGradeNotes] = useState('')

  // Identify unassigned students (excluding inactive/dropout)
  const assignedEnrollmentIds = new Set(gw.groups?.flatMap((g: any) => g.members.map((m: any) => m.enrollmentId)))
  const unassignedEnrollments = classData.enrollments.filter(
    (e: any) => !assignedEnrollmentIds.has(e.id) && e.status !== 'INATIVO' && e.status !== 'DESISTENTE'
  )

  const handleCreateGroup = async () => {
    if (!newGroupName) return
    await createGroupAction(gw.id, newGroupName, '')
    setNewGroupName('')
  }

  const handleRandomize = async () => {
    if (unassignedEnrollments.length === 0) return alert('Não há alunos sem grupo para sortear.')
    const count = parseInt(randomCount)
    if (isNaN(count) || count <= 0) return alert('Quantidade inválida.')
    
    await generateRandomGroupsAction(gw.id, count, unassignedEnrollments.map((e: any) => e.id))
    setIsRandomizing(false)
  }

  const handleAssign = async (groupId: string, enrollmentId: string) => {
    await addMemberToGroupAction(groupId, enrollmentId)
  }

  const handleRemoveMember = async (memberId: string) => {
    await removeMemberFromGroupAction(memberId)
  }
  
  const handleSaveGrade = async (groupId: string) => {
    const val = parseFloat(gradeValue)
    if (isNaN(val)) return alert('Nota inválida.')
    const res = await gradeGroupAction(groupId, val, gradeNotes)
    if (res.success) {
      setGradingGroupId(null)
    } else {
      alert(res.message)
    }
  }

  const handleUpdateGW = async () => {
    if (!editGwName) return
    const res = await updateGroupWorkAction(gw.id, editGwName, editGwDesc, parseFloat(editGwWeight))
    if (res.success) {
      setIsEditingGW(false)
    } else {
      alert(res.message)
    }
  }

  return (
    <>
      <div className="glass-panel" style={{ padding: '24px' }}>
        {!isEditingGW ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {gw.name}
                  {gw.activity && <span style={{ fontSize: '0.8rem', background: 'rgba(99,102,241,0.2)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '12px' }}>Peso {gw.activity.weight}</span>}
                </h2>
                {gw.description && <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>{gw.description}</p>}
              </div>
              <button onClick={() => setIsEditingGW(true)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Edit2 size={16} /> Editar
              </button>
            </div>
          </>
        ) : (
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--surface-border)' }}>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Nome</label>
                <input type="text" value={editGwName} onChange={e => setEditGwName(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--surface-border)', color: '#fff' }} />
              </div>
              {gw.activityId && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Peso (Diário)</label>
                  <input type="number" value={editGwWeight} onChange={e => setEditGwWeight(e.target.value)} style={{ width: '80px', padding: '8px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--surface-border)', color: '#fff' }} />
                </div>
              )}
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Descrição</label>
              <textarea value={editGwDesc} onChange={e => setEditGwDesc(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--surface-border)', color: '#fff', minHeight: '60px', resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => { setIsEditingGW(false); setEditGwName(gw.name); setEditGwDesc(gw.description || ''); setEditGwWeight(gw.activity?.weight?.toString() || '10') }} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleUpdateGW} style={{ padding: '6px 12px', background: 'var(--accent)', border: 'none', color: '#000', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Salvar</button>
            </div>
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              placeholder="Nome do Novo Grupo..."
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--surface-border)', color: '#fff' }}
            />
            <button onClick={handleCreateGroup} className="btn-primary" style={{ padding: '8px 16px' }}>Criar Grupo</button>
          </div>
          <div style={{ width: '1px', height: '24px', background: 'var(--surface-border)' }}></div>
          
          {!isRandomizing ? (
            <button onClick={() => setIsRandomizing(true)} style={{ background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
              <Shuffle size={16} /> Sortear Alunos
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(99,102,241,0.1)', padding: '4px', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>Qtd de Grupos:</span>
              <input type="number" value={randomCount} onChange={e => setRandomCount(e.target.value)} style={{ width: '50px', padding: '4px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--accent)', color: '#fff' }} />
              <button onClick={handleRandomize} style={{ background: 'var(--accent)', border: 'none', color: '#000', borderRadius: '4px', padding: '4px 12px', cursor: 'pointer', fontWeight: 500 }}>Sortear Agora</button>
              <button onClick={() => setIsRandomizing(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>Cancelar</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
        {/* Lista de Grupos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {gw.groups?.map((group: any) => (
            <div key={group.id} className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {group.name}
                    <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', color: 'var(--text-secondary)' }}>
                      {group.members?.length || 0} alunos
                    </span>
                  </h3>
                  {group.theme && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Tema: {group.theme}</p>}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {gw.activityId && (
                    <button 
                      onClick={() => {
                        setGradingGroupId(group.id)
                        setGradeNotes(group.notes || '')
                      }} 
                      style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}
                    >
                      <GraduationCap size={14} /> Dar Nota
                    </button>
                  )}
                  <button onClick={() => deleteGroupAction(group.id)} style={{ background: 'transparent', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Área de Avaliação Inline */}
              {gradingGroupId === group.id && (
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid rgba(34,197,94,0.3)' }}>
                  <h4 style={{ fontSize: '0.9rem', color: '#4ade80', marginBottom: '12px' }}>Lançar Nota para o Grupo</h4>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Nota (0-10)</label>
                      <input type="number" value={gradeValue} onChange={e => setGradeValue(e.target.value)} style={{ width: '80px', padding: '8px', borderRadius: '4px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--surface-border)', color: '#fff' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Feedback / O que foi bom e ruim</label>
                      <textarea value={gradeNotes} onChange={e => setGradeNotes(e.target.value)} style={{ width: '100%', height: '60px', padding: '8px', borderRadius: '4px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--surface-border)', color: '#fff', resize: 'vertical' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                    <button onClick={() => setGradingGroupId(null)} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
                    <button onClick={() => handleSaveGrade(group.id)} style={{ padding: '6px 12px', background: '#22c55e', border: 'none', color: '#000', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Salvar Notas no Diário</button>
                  </div>
                </div>
              )}

              {/* Members List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {group.members?.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Nenhum aluno neste grupo.</p>}
                {group.members?.map((member: any) => (
                  <div key={member.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{member.enrollment.student.name}</span>
                    <button onClick={() => handleRemoveMember(member.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.7 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Alunos Sem Grupo */}
        <div className="glass-panel" style={{ padding: '20px', alignSelf: 'flex-start', position: 'sticky', top: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Sem Grupo</span>
            <span style={{ color: 'var(--accent)' }}>{unassignedEnrollments.length}</span>
          </h3>
          
          {gw.groups?.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Crie um grupo primeiro para adicionar alunos.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '500px', overflowY: 'auto', paddingRight: '8px' }}>
              {unassignedEnrollments.map((enr: any) => (
                <div key={enr.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px', border: '1px solid var(--surface-border)' }}>
                  <div style={{ fontSize: '0.9rem', color: '#fff', marginBottom: '8px' }}>{enr.student.name}</div>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {gw.groups?.map((g: any) => (
                      <button 
                        key={g.id}
                        onClick={() => handleAssign(g.id, enr.id)}
                        style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                        title={`Adicionar ao ${g.name}`}
                      >
                        +{g.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
