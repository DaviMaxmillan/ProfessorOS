'use client'

import { useState } from 'react'
import { Plus, Calculator, Settings, X, Edit2, StickyNote, FileSpreadsheet } from 'lucide-react'
import { createActivityAction, saveGradesAction, updateClassCalculationMethod, deleteActivityAction, updateStudentNameAction, saveEnrollmentNotesAction } from '@/app/actions/diary'
import { buildGradesSheet, exportSheetXLSX } from '@/lib/exportClass'
import type { ClassDetail } from '@/lib/types'

export default function GradesTab({ classData }: { classData: ClassDetail }) {
  const [isAddingActivity, setIsAddingActivity] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [calcMethod, setCalcMethod] = useState(classData.calculationMethod || 'SUM')
  const [notesModal, setNotesModal] = useState<{ enrollmentId: string; studentName: string; currentNotes: string } | null>(null)
  const [notesText, setNotesText] = useState('')
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  
  // gradesState shape: { [enrollmentId]: { [activityId]: number | null } }
  const [gradesState, setGradesState] = useState<Record<string, Record<string, number | null>>>(() => {
    const initial: Record<string, Record<string, number | null>> = {}
    classData.enrollments.forEach((e) => {
      initial[e.id] = {}
      e.grades.forEach((g) => {
        initial[e.id][g.activityId] = g.value
      })
    })
    return initial
  })

  const b1Activities = classData.activities.filter((a) => a.bimester === 1)
  const b2Activities = classData.activities.filter((a) => a.bimester === 2)
  const afActivities = classData.activities.filter((a) => a.bimester === 3)

  const handleGradeChange = (enrollmentId: string, activityId: string, val: string) => {
    const num = parseFloat(val)
    setGradesState(prev => ({
      ...prev,
      [enrollmentId]: {
        ...prev[enrollmentId],
        [activityId]: isNaN(num) ? null : num
      }
    }))
  }

  const handleMethodChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const method = e.target.value
    setCalcMethod(method)
    await updateClassCalculationMethod(classData.id, method)
  }

  const calculateFinalAvg = (enrollmentId: string) => {
    let b1Sum = 0;
    let b2Sum = 0;
    let afSum = 0;
    let hasAfGrade = false;
    
    classData.activities.forEach((act) => {
      const gradeVal = gradesState[enrollmentId]?.[act.id];
      const grade = typeof gradeVal === 'number' ? gradeVal : 0;
      
      if (act.bimester === 1) {
        b1Sum += grade * act.weight;
      } else if (act.bimester === 2) {
        b2Sum += grade * act.weight;
      } else if (act.bimester === 3) {
        if (typeof gradeVal === 'number') {
          hasAfGrade = true;
        }
        afSum += grade * act.weight;
      }
    });

    const b1Avg = b1Sum / 10;
    const b2Avg = b2Sum / 10;
    const afAvg = (afActivities.length > 0 && hasAfGrade) ? (afSum / 10) : null;
    
    let finalRaw = 0;
    if (calcMethod === 'AVERAGE') {
      finalRaw = (b1Avg + b2Avg) / 2;
    } else {
      finalRaw = b1Avg + b2Avg;
    }
    
    if (afAvg !== null && finalRaw < 6.0) {
      if (b1Avg <= b2Avg) {
        finalRaw = calcMethod === 'AVERAGE' ? (afAvg + b2Avg) / 2 : (afAvg + b2Avg);
      } else {
        finalRaw = calcMethod === 'AVERAGE' ? (b1Avg + afAvg) / 2 : (b1Avg + afAvg);
      }
    }

    return {
      b1Avg: b1Avg.toFixed(1),
      b2Avg: b2Avg.toFixed(1),
      afAvg: afAvg !== null ? afAvg.toFixed(1) : null,
      final: finalRaw.toFixed(1)
    }
  }

  const handleCreateActivity = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.append('classId', classData.id)
    
    const result = await createActivityAction(formData)
    if (result.success) {
      setIsAddingActivity(false)
    } else {
      alert(result.message)
    }
  }

  const handleSaveGrades = async (activityId: string) => {
    setIsSaving(true)
    const gradesData: Record<string, number> = {}
    classData.enrollments.forEach((e) => {
      gradesData[e.id] = gradesState[e.id]?.[activityId] || 0
    })

    const result = await saveGradesAction(classData.id, activityId, gradesData)
    setIsSaving(false)
    alert(result.message)
  }

  const handleDeleteActivity = async (activityId: string) => {
    if (confirm('Tem certeza que deseja excluir esta atividade e todas as suas notas?')) {
      const result = await deleteActivityAction(classData.id, activityId)
      if (!result.success) {
        alert(result.message)
      }
    }
  }

  const handleEditStudent = async (studentId: string, currentName: string) => {
    const newName = prompt('Editar nome do aluno:', currentName)
    if (newName && newName.trim() !== '' && newName !== currentName) {
      const res = await updateStudentNameAction(studentId, newName)
      if (!res.success) {
        alert(res.message)
      }
    }
  }

  const handleOpenNotes = (enrollmentId: string, studentName: string, currentNotes: string) => {
    setNotesModal({ enrollmentId, studentName, currentNotes })
    setNotesText(currentNotes || '')
  }

  const handleSaveNotes = async () => {
    if (!notesModal) return
    setIsSavingNotes(true)
    const res = await saveEnrollmentNotesAction(notesModal.enrollmentId, notesText)
    setIsSavingNotes(false)
    if (res.success) {
      setNotesModal(null)
    } else {
      alert(res.message)
    }
  }

  return (
    <>
      <div className="glass-panel" style={{ padding: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Calculator size={20} color="var(--accent)" /> 
            Diário de Notas
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            <Settings size={16} />
            Cálculo da Média:
            <select 
              value={calcMethod} 
              onChange={handleMethodChange}
              style={{ background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid var(--surface-border)', borderRadius: '4px', padding: '4px' }}
            >
              <option value="SUM">Soma (Ex: Max 5 + Max 5 = 10)</option>
              <option value="AVERAGE">Média (Ex: (10 + 10) / 2 = 10)</option>
            </select>
          </div>
        </div>
        
        {!isAddingActivity ? (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => {
                const ws = buildGradesSheet(classData)
                const label = `${classData.subject.name}${classData.turmaName ? `_${classData.turmaName}` : ''}_${classData.semester.name}`.replace(/[/\\?%*:|"<>]/g, '-')
                exportSheetXLSX(ws, 'Diário de Notas', `Notas_${label}.xlsx`)
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}
            >
              <FileSpreadsheet size={16} /> Exportar XLSX
            </button>
            <button className="btn-primary" onClick={() => setIsAddingActivity(true)}>
              <Plus size={18} /> Nova Atividade
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreateActivity} style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', flexWrap: 'wrap' }}>
            <select name="bimester" required style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.3)', color: '#fff' }}>
              <option value="1">1º Bimestre</option>
              <option value="2">2º Bimestre</option>
              <option value="3">Avaliação Final (AF)</option>
            </select>
            <input type="text" name="name" placeholder="Ex: Prova 1" required style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.3)', color: '#fff' }} />
            <input type="number" name="weight" placeholder="Peso (Ex: 2)" required step="0.1" min="0.1" style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.3)', color: '#fff', width: '120px' }} />
            <button type="submit" className="btn-primary" style={{ padding: '8px 16px' }}>Criar</button>
            <button type="button" onClick={() => setIsAddingActivity(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancelar</button>
          </form>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
              <th rowSpan={2} style={{ padding: '16px 20px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '500', borderBottom: '1px solid var(--surface-border)', borderRight: '1px solid var(--surface-border)' }}>Aluno</th>
              
              <th colSpan={b1Activities.length + 1} style={{ padding: '8px', textAlign: 'center', color: '#fff', fontWeight: 'bold', borderBottom: '1px solid var(--surface-border)', borderRight: '1px solid var(--surface-border)', background: 'rgba(99, 102, 241, 0.1)' }}>
                1º Bimestre
              </th>
              
              <th colSpan={b2Activities.length + 1} style={{ padding: '8px', textAlign: 'center', color: '#fff', fontWeight: 'bold', borderBottom: '1px solid var(--surface-border)', borderRight: '1px solid var(--surface-border)', background: 'rgba(99, 102, 241, 0.1)' }}>
                2º Bimestre
              </th>
              
              <th colSpan={afActivities.length > 0 ? afActivities.length : 1} style={{ padding: '8px', textAlign: 'center', color: '#f59e0b', fontWeight: 'bold', borderBottom: '1px solid var(--surface-border)', borderRight: '1px solid var(--surface-border)', background: 'rgba(245, 158, 11, 0.1)' }}>
                Avaliação Final
              </th>
              
              <th rowSpan={2} style={{ padding: '16px 20px', textAlign: 'center', color: '#4ade80', fontWeight: 'bold', borderBottom: '1px solid var(--surface-border)' }}>
                Média Final
              </th>
            </tr>
            <tr style={{ background: 'rgba(0,0,0,0.1)' }}>
              {b1Activities.map((act) => (
                <th key={act.id} style={{ padding: '12px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: '500', borderBottom: '1px solid var(--surface-border)', position: 'relative' }}>
                  <button onClick={() => handleDeleteActivity(act.id)} style={{ position: 'absolute', top: '4px', right: '4px', background: 'none', border: 'none', color: 'rgba(239, 68, 68, 0.6)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }} title="Excluir Atividade" onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(239, 68, 68, 0.6)'}>
                    <X size={12} strokeWidth={3} />
                  </button>
                  <div style={{ color: 'var(--text-primary)' }}>{act.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: '2px' }}>Peso {act.weight}</div>
                  <button onClick={() => handleSaveGrades(act.id)} disabled={isSaving} style={{ marginTop: '6px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '4px', padding: '2px 6px', fontSize: '0.7rem', cursor: 'pointer' }}>Salvar</button>
                </th>
              ))}
              <th style={{ padding: '12px', textAlign: 'center', color: '#fff', borderBottom: '1px solid var(--surface-border)', borderRight: '1px solid var(--surface-border)' }}>Média B1</th>
              
              {b2Activities.map((act) => (
                <th key={act.id} style={{ padding: '12px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: '500', borderBottom: '1px solid var(--surface-border)', position: 'relative' }}>
                  <button onClick={() => handleDeleteActivity(act.id)} style={{ position: 'absolute', top: '4px', right: '4px', background: 'none', border: 'none', color: 'rgba(239, 68, 68, 0.6)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }} title="Excluir Atividade" onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(239, 68, 68, 0.6)'}>
                    <X size={12} strokeWidth={3} />
                  </button>
                  <div style={{ color: 'var(--text-primary)' }}>{act.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: '2px' }}>Peso {act.weight}</div>
                  <button onClick={() => handleSaveGrades(act.id)} disabled={isSaving} style={{ marginTop: '6px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '4px', padding: '2px 6px', fontSize: '0.7rem', cursor: 'pointer' }}>Salvar</button>
                </th>
              ))}
              <th style={{ padding: '12px', textAlign: 'center', color: '#fff', borderBottom: '1px solid var(--surface-border)', borderRight: '1px solid var(--surface-border)' }}>Média B2</th>

              {afActivities.length === 0 ? (
                <th style={{ padding: '12px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: '500', borderBottom: '1px solid var(--surface-border)', borderRight: '1px solid var(--surface-border)' }}>
                   -
                </th>
              ) : (
                afActivities.map((act) => (
                  <th key={act.id} style={{ padding: '12px', textAlign: 'center', color: '#f59e0b', fontWeight: '500', borderBottom: '1px solid var(--surface-border)', position: 'relative', borderRight: '1px solid var(--surface-border)' }}>
                    <button onClick={() => handleDeleteActivity(act.id)} style={{ position: 'absolute', top: '4px', right: '4px', background: 'none', border: 'none', color: 'rgba(239, 68, 68, 0.6)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }} title="Excluir Atividade" onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(239, 68, 68, 0.6)'}>
                      <X size={12} strokeWidth={3} />
                    </button>
                    <div style={{ color: '#f59e0b' }}>{act.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#f59e0b', opacity: 0.8, marginTop: '2px' }}>Peso {act.weight}</div>
                    <button onClick={() => handleSaveGrades(act.id)} disabled={isSaving} style={{ marginTop: '6px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '4px', padding: '2px 6px', fontSize: '0.7rem', cursor: 'pointer' }}>Salvar</button>
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {classData.enrollments.map((enrollment, index: number) => {
              const avgs = calculateFinalAvg(enrollment.id)
              const isApproved = parseFloat(avgs.final) >= 6.0

              return (
                <tr key={enrollment.id} style={{ borderBottom: '1px solid var(--surface-border)', background: enrollment.status === 'INATIVO' ? 'rgba(239, 68, 68, 0.07)' : enrollment.status === 'DESISTENTE' ? 'rgba(245, 158, 11, 0.07)' : (index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)') }}>
                  <td style={{ padding: '12px 20px', fontWeight: '500', borderRight: '1px solid var(--surface-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* Destaque se tiver anotação */}
                      <span style={{ color: enrollment.notes ? '#f59e0b' : 'var(--text-primary)', fontWeight: enrollment.notes ? '600' : '500' }}>
                        {enrollment.student.name}
                      </span>
                      {enrollment.notes && (
                        <span title="Este aluno tem anotação">
                          <StickyNote size={13} color="#f59e0b" />
                        </span>
                      )}
                      <button
                        onClick={() => handleEditStudent(enrollment.student.id, enrollment.student.name)}
                        style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: 'var(--accent)', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Editar Nome"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleOpenNotes(enrollment.id, enrollment.student.name, enrollment.notes || '')}
                        style={{ background: enrollment.notes ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${enrollment.notes ? 'rgba(245,158,11,0.4)' : 'var(--surface-border)'}`, color: enrollment.notes ? '#f59e0b' : 'var(--text-secondary)', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title={enrollment.notes ? 'Ver/Editar Anotação' : 'Adicionar Anotação'}
                      >
                        <StickyNote size={14} />
                      </button>
                    </div>
                  </td>
                  
                  {/* B1 Activities */}
                  {b1Activities.map((act) => (
                    <td key={act.id} style={{ padding: '12px', textAlign: 'center' }}>
                      <input 
                        type="number" min="0" max="10" step="0.1"
                        value={gradesState[enrollment.id]?.[act.id] ?? ''}
                        onChange={(e) => handleGradeChange(enrollment.id, act.id, e.target.value)}
                        style={{ width: '60px', textAlign: 'center', padding: '6px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--surface-border)', color: '#fff' }}
                      />
                    </td>
                  ))}
                  <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: 'var(--text-secondary)', borderRight: '1px solid var(--surface-border)' }}>{avgs.b1Avg}</td>

                  {/* B2 Activities */}
                  {b2Activities.map((act) => (
                    <td key={act.id} style={{ padding: '12px', textAlign: 'center' }}>
                      <input 
                        type="number" min="0" max="10" step="0.1"
                        value={gradesState[enrollment.id]?.[act.id] ?? ''}
                        onChange={(e) => handleGradeChange(enrollment.id, act.id, e.target.value)}
                        style={{ width: '60px', textAlign: 'center', padding: '6px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--surface-border)', color: '#fff' }}
                      />
                    </td>
                  ))}
                  <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: 'var(--text-secondary)', borderRight: '1px solid var(--surface-border)' }}>{avgs.b2Avg}</td>

                  {/* AF */}
                  {afActivities.length === 0 ? (
                    <td style={{ padding: '12px', textAlign: 'center', borderRight: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}>
                       -
                    </td>
                  ) : (
                    afActivities.map((act) => (
                      <td key={act.id} style={{ padding: '12px', textAlign: 'center', borderRight: '1px solid var(--surface-border)' }}>
                        <input 
                          type="number" min="0" max="10" step="0.1"
                          value={gradesState[enrollment.id]?.[act.id] ?? ''}
                          onChange={(e) => handleGradeChange(enrollment.id, act.id, e.target.value)}
                          placeholder="-"
                          style={{ width: '60px', textAlign: 'center', padding: '6px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#f59e0b' }}
                        />
                      </td>
                    ))
                  )}

                  {/* Final */}
                  <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                    <span style={{ 
                      display: 'inline-block', padding: '4px 12px', borderRadius: '16px', fontWeight: 'bold',
                      background: isApproved ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)',
                      color: isApproved ? '#4ade80' : '#f87171'
                    }}>
                      {avgs.final}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>

      {/* Modal de Anotações */}
      {notesModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '32px', animation: 'slideUp 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <StickyNote size={20} color="#f59e0b" />
                Anotação — {notesModal.studentName}
              </h3>
              <button onClick={() => setNotesModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '12px' }}>
              Esta anotação é privada e visível apenas para você.
            </p>
            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Ex: Aluno afastado — enviar atividades por e-mail. Contato: aluno@email.com"
              rows={5}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--surface-border)', color: '#fff', fontFamily: 'inherit', fontSize: '0.95rem', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
                className="btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                {isSavingNotes ? 'Salvando...' : 'Salvar Anotação'}
              </button>
              {notesModal.currentNotes && (
                <button
                  onClick={() => setNotesText('')}
                  style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem' }}
                  title="Limpar anotação"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
