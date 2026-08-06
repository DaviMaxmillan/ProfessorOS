'use client'

import { useState } from 'react'
import { Users, FileSpreadsheet, CalendarCheck } from 'lucide-react'
import GradesTab from './GradesTab'
import AttendanceTab from './AttendanceTab'

type ClassTabsProps = {
  classData: any;
}

export default function ClassTabs({ classData }: ClassTabsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'grades' | 'attendance'>('overview')

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
                classData.enrollments.map((enrollment: any, index: number) => (
                  <tr key={enrollment.id} style={{ borderBottom: '1px solid var(--surface-border)', background: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '16px 20px', fontWeight: '500', color: 'var(--text-primary)' }}>{enrollment.student.name}</td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>{enrollment.student.rgm || 'Não informado'}</td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                      {enrollment.enrollmentDate ? new Date(enrollment.enrollmentDate).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80', marginRight: '8px' }}></span>
                      <span style={{ color: '#4ade80', fontSize: '0.9rem' }}>Ativo</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'grades' && <GradesTab classData={classData} />}
      {activeTab === 'attendance' && <AttendanceTab classData={classData} />}

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
