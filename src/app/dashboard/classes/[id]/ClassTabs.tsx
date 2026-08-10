'use client'

import { useState } from 'react'
import { Users, FileSpreadsheet, CalendarCheck } from 'lucide-react'
import GradesTab from './GradesTab'
import AttendanceTab from './AttendanceTab'
import ScheduleTab from './ScheduleTab'
import GroupWorkTab from './GroupWorkTab'
import NotesTab from './NotesTab'
import { updateEnrollmentStatusAction } from '@/app/actions/diary'

type ClassTabsProps = {
  classData: any;
  allClasses: any[];
}

const STATUS_OPTIONS = [
  { value: 'ATIVO', label: 'Ativo', color: '#4ade80' },
  { value: 'INATIVO', label: 'Inativo (Trancado)', color: '#ef4444' },
  { value: 'DESISTENTE', label: 'Desistente', color: '#f59e0b' },
]

function getStatusInfo(status: string | null) {
  return STATUS_OPTIONS.find(s => s.value === status) ?? STATUS_OPTIONS[0]
}

export default function ClassTabs({ classData, allClasses }: ClassTabsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'grades' | 'attendance' | 'schedule' | 'groupwork' | 'notes'>('overview')
  // local status state so UI updates immediately without a full reload
  const [statusMap, setStatusMap] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    classData.enrollments.forEach((e: any) => {
      m[e.id] = e.status || 'ATIVO'
    })
    return m
  })

  const handleStatusChange = async (enrollmentId: string, newStatus: string) => {
    setStatusMap(prev => ({ ...prev, [enrollmentId]: newStatus }))
    await updateEnrollmentStatusAction(enrollmentId, newStatus === 'ATIVO' ? '' : newStatus)
  }

  return (
    <div style={{ marginTop: '24px' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--surface-border)', paddingBottom: '16px' }}>
        <button 
          onClick={() => setActiveTab('overview')}
          className="tab-button"
          style={{ 
            background: activeTab === 'overview' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
            color: activeTab === 'overview' ? 'var(--accent)' : 'var(--text-secondary)',
          }}
        >
          <Users size={18} /> Alunos ({classData.enrollments.length})
        </button>
        <button 
          onClick={() => setActiveTab('grades')}
          className="tab-button"
          style={{ 
            background: activeTab === 'grades' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
            color: activeTab === 'grades' ? 'var(--accent)' : 'var(--text-secondary)',
          }}
        >
          <FileSpreadsheet size={18} /> Diário de Notas
        </button>
        <button 
          onClick={() => setActiveTab('attendance')}
          className="tab-button"
          style={{ 
            background: activeTab === 'attendance' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
            color: activeTab === 'attendance' ? 'var(--accent)' : 'var(--text-secondary)',
          }}
        >
          <CalendarCheck size={18} /> Frequência Provisória
        </button>
        <button 
          onClick={() => setActiveTab('schedule')}
          className="tab-button"
          style={{ 
            background: activeTab === 'schedule' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
            color: activeTab === 'schedule' ? 'var(--accent)' : 'var(--text-secondary)',
          }}
        >
          <CalendarCheck size={18} /> Cronograma
        </button>
        <button 
          onClick={() => setActiveTab('groupwork')}
          className="tab-button"
          style={{ 
            background: activeTab === 'groupwork' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
            color: activeTab === 'groupwork' ? 'var(--accent)' : 'var(--text-secondary)',
          }}
        >
          <Users size={18} /> Trabalhos em Grupo
        </button>
        <button 
          onClick={() => setActiveTab('notes')}
          className="tab-button"
          style={{ 
            background: activeTab === 'notes' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
            color: activeTab === 'notes' ? 'var(--accent)' : 'var(--text-secondary)',
          }}
        >
          📝 Notas
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)', textAlign: 'left' }}>
                <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: '500', borderBottom: '1px solid var(--surface-border)' }}>Nome do Aluno</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: '500', borderBottom: '1px solid var(--surface-border)' }}>RGM / Matrícula</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: '500', borderBottom: '1px solid var(--surface-border)' }}>Data Matrícula</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: '500', borderBottom: '1px solid var(--surface-border)', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {classData.enrollments.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Nenhum aluno matriculado.</td>
                </tr>
              ) : (
                classData.enrollments.map((enrollment: any, index: number) => {
                  const currentStatus = statusMap[enrollment.id] ?? 'ATIVO'
                  const statusInfo = getStatusInfo(currentStatus)
                  
                  // Row background based on status
                  let rowBg = index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'
                  if (currentStatus === 'INATIVO') rowBg = 'rgba(239, 68, 68, 0.06)'
                  if (currentStatus === 'DESISTENTE') rowBg = 'rgba(245, 158, 11, 0.06)'

                  return (
                    <tr key={enrollment.id} style={{ borderBottom: '1px solid var(--surface-border)', background: rowBg, transition: 'background 0.3s' }}>
                      <td style={{ padding: '16px 20px', fontWeight: '500', color: 'var(--text-primary)' }}>{enrollment.student.name}</td>
                      <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>{enrollment.student.rgm || 'Não informado'}</td>
                      <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                        {enrollment.enrollmentDate ? new Date(enrollment.enrollmentDate).toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: statusInfo.color, flexShrink: 0 }}></span>
                          <select
                            value={currentStatus}
                            onChange={e => handleStatusChange(enrollment.id, e.target.value)}
                            style={{
                              background: 'rgba(0,0,0,0.3)',
                              border: `1px solid ${statusInfo.color}40`,
                              color: statusInfo.color,
                              borderRadius: '6px',
                              padding: '4px 8px',
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                              fontWeight: 500,
                            }}
                          >
                            {STATUS_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value} style={{ color: '#fff', background: '#1a1b23' }}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}


      {activeTab === 'grades' && <GradesTab classData={classData} />}
      {activeTab === 'attendance' && <AttendanceTab classData={classData} />}
      {activeTab === 'schedule' && <ScheduleTab classData={classData} allClasses={allClasses} />}
      {activeTab === 'groupwork' && <GroupWorkTab classData={classData} />}
      {activeTab === 'notes' && <NotesTab classData={classData} />}

      <style jsx>{`
        .tab-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 8px;
          border: none;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 1rem;
        }
        .tab-button:hover {
          background: rgba(255, 255, 255, 0.05) !important;
        }
      `}</style>
    </div>
  )
}
