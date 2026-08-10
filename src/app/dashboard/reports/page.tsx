'use client'

import { useState, useEffect } from 'react'
import { getFiltersAction, getClassReportAction } from '@/app/actions/reports'
import { BarChart2, Download, Printer, Filter } from 'lucide-react'

export default function ReportsPage() {
  const [filters, setFilters] = useState<any>(null)
  const [selectedClass, setSelectedClass] = useState('')
  const [reportData, setReportData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    getFiltersAction().then(setFilters)
  }, [])

  useEffect(() => {
    if (selectedClass) {
      setIsLoading(true)
      getClassReportAction(selectedClass).then(data => {
        setReportData(data)
        setIsLoading(false)
      })
    } else {
      setReportData(null)
    }
  }, [selectedClass])

  const handlePrint = () => {
    window.print()
  }

  // Cálculos do Relatório
  let averages: number[] = []
  if (reportData && reportData.enrollments) {
    reportData.enrollments.forEach((enrollment: any) => {
      // Baseado na lógica de cálculo de média atual do sistema (SUM by default)
      let sum = 0
      enrollment.grades.forEach((g: any) => {
        sum += g.value
      })
      
      const b1 = sum // simplificando
      const final = enrollment.afGrade ? ((b1 + enrollment.afGrade) / 2) : b1
      averages.push(final)
      enrollment._calculatedFinal = final
    })
  }

  const classAverage = averages.length > 0 ? (averages.reduce((a,b)=>a+b,0) / averages.length).toFixed(1) : '0.0'
  const aboveAverageCount = averages.filter(a => a >= 6).length // Supondo média 6
  const belowAverageCount = averages.length - aboveAverageCount

  return (
    <div>
      <div className="page-header no-print">
        <div>
          <h1 className="page-title">Relatórios</h1>
          <p className="page-description">Visualize e exporte o rendimento das suas turmas.</p>
        </div>
        
        {reportData && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={handlePrint} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--text-primary)', color: 'var(--bg-color)' }}>
              <Printer size={18} /> Imprimir / PDF
            </button>
          </div>
        )}
      </div>

      <div className="glass-panel no-print" style={{ padding: '24px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'flex', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', alignItems: 'center', gap: '6px' }}>
            <Filter size={14} /> Selecione uma Turma para o Relatório
          </label>
          <select 
            className="glass-input"
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
          >
            <option value="">-- Escolha uma turma --</option>
            {filters?.classes.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.subject.name}{c.turmaName ? ` — ${c.turmaName}` : ''} | {c.semester.name}{c.schedule ? ` | ${c.schedule}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Gerando relatório...</div>}

      {reportData && !isLoading && (
        <div className="report-container" style={{ background: '#fff', color: '#000', padding: '40px', borderRadius: '8px' }}>
          
          <div style={{ textAlign: 'center', borderBottom: '2px solid #ccc', paddingBottom: '24px', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '8px' }}>Relatório de Desempenho da Turma</h2>
            <p style={{ fontSize: '1.1rem', color: '#444' }}>Disciplina: <strong>{reportData.subject.name}</strong></p>
            <p style={{ fontSize: '1.1rem', color: '#444' }}>Semestre: {reportData.semester.name} | Professor: {reportData.professor}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '40px' }}>
            <div style={{ border: '1px solid #ddd', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
              <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '4px' }}>Média Geral da Turma</p>
              <h3 style={{ fontSize: '2rem', color: '#000' }}>{classAverage}</h3>
            </div>
            <div style={{ border: '1px solid #ddd', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
              <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '4px' }}>Alunos Acima da Média (&gt;= 6)</p>
              <h3 style={{ fontSize: '2rem', color: '#16a34a' }}>{aboveAverageCount}</h3>
            </div>
            <div style={{ border: '1px solid #ddd', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
              <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '4px' }}>Alunos Abaixo da Média</p>
              <h3 style={{ fontSize: '2rem', color: '#dc2626' }}>{belowAverageCount}</h3>
            </div>
          </div>

          <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Detalhamento por Aluno</h3>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Aluno</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>RGM</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Faltas</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Média Final</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Situação</th>
              </tr>
            </thead>
            <tbody>
              {reportData.enrollments.map((enr: any) => {
                const finalGrade = enr._calculatedFinal || 0
                const isApproved = finalGrade >= 6
                
                return (
                  <tr key={enr.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}>{enr.student.name}</td>
                    <td style={{ padding: '12px', color: '#666' }}>{enr.student.rgm || '-'}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{enr.absences}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: isApproved ? '#16a34a' : '#dc2626' }}>
                      {finalGrade.toFixed(1)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{ background: isApproved ? '#dcfce7' : '#fee2e2', color: isApproved ? '#16a34a' : '#dc2626', padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        {isApproved ? 'Aprovado' : 'Reprovado'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          
        </div>
      )}

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: #fff !important;
            color: #000 !important;
          }
          .dashboard-layout {
            display: block !important;
          }
          .sidebar {
            display: none !important;
          }
          .main-content {
            padding: 0 !important;
            margin: 0 !important;
          }
          .report-container {
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  )
}
