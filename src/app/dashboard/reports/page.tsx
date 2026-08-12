'use client'

import { useState, useEffect, useRef } from 'react'
import { getFiltersAction, getClassReportAction } from '@/app/actions/reports'
import { BarChart2, Download, Printer, Filter, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'

export default function ReportsPage() {
  const [filters, setFilters] = useState<any>(null)
  const [selectedClass, setSelectedClass] = useState('')
  const [reportData, setReportData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

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

  const handlePrint = () => { window.print() }

  // ---- Grade calculation ----
  function calcFinal(enrollment: any, method: string) {
    if (!enrollment.grades || enrollment.grades.length === 0) return null
    const sum = enrollment.grades.reduce((s: number, g: any) => s + g.value, 0)
    const base = method === 'AVERAGE' ? sum / enrollment.grades.length : sum
    if (enrollment.afGrade != null) return (base + enrollment.afGrade) / 2
    return base
  }

  let averages: number[] = []
  if (reportData?.enrollments) {
    reportData.enrollments.forEach((e: any) => {
      const f = calcFinal(e, reportData.calculationMethod)
      e._calculatedFinal = f
      if (f !== null) averages.push(f)
    })
  }

  const classAverage = averages.length > 0 ? (averages.reduce((a, b) => a + b, 0) / averages.length).toFixed(1) : '0.0'
  const aboveAverageCount = averages.filter(a => a >= 6).length
  const belowAverageCount = averages.length - aboveAverageCount

  // ---- XLSX Export ----
  const exportXLSX = () => {
    if (!reportData) return
    const rows = reportData.enrollments.map((e: any) => ({
      'Aluno': e.student.name,
      'RGM': e.student.rgm || '',
      'Faltas': e.absences,
      'Média Final': e._calculatedFinal != null ? parseFloat(e._calculatedFinal.toFixed(2)) : '',
      'Situação': e._calculatedFinal != null ? (e._calculatedFinal >= 6 ? 'Aprovado' : 'Reprovado') : 'Sem nota',
      'Status': e.status || 'ATIVO',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório')
    const label = `${reportData.subject.name}${reportData.turmaName ? `_${reportData.turmaName}` : ''}_${reportData.semester.name}`
      .replace(/[/\\?%*:|"<>]/g, '-')
    XLSX.writeFile(wb, `Relatorio_${label}.xlsx`)
  }

  return (
    <div>
      <div className="page-header no-print">
        <div>
          <h1 className="page-title">Relatórios</h1>
          <p className="page-description">Visualize e exporte o rendimento das suas turmas.</p>
        </div>

        {reportData && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={exportXLSX}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}
            >
              <FileSpreadsheet size={18} /> Exportar XLSX
            </button>
            <button
              onClick={handlePrint}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'var(--text-primary)', border: 'none', color: 'var(--bg-color)', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}
            >
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
        <div ref={reportRef} className="report-container" style={{ background: '#fff', color: '#000', padding: '40px', borderRadius: '8px' }}>

          <div style={{ textAlign: 'center', borderBottom: '2px solid #ccc', paddingBottom: '24px', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '8px' }}>Relatório de Desempenho da Turma</h2>
            <p style={{ fontSize: '1.1rem', color: '#444' }}>Disciplina: <strong>{reportData.subject.name}</strong>{reportData.turmaName ? ` — ${reportData.turmaName}` : ''}</p>
            <p style={{ fontSize: '1rem', color: '#666' }}>Semestre: {reportData.semester.name} | Professor: {reportData.professor}</p>
            {reportData.schedule && <p style={{ fontSize: '0.9rem', color: '#888' }}>Período: {reportData.schedule}</p>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '40px' }}>
            {[
              { label: 'Média Geral da Turma', value: classAverage, color: '#000' },
              { label: 'Alunos Aprovados (≥ 6)', value: String(aboveAverageCount), color: '#16a34a' },
              { label: 'Alunos em Risco (< 6)', value: String(belowAverageCount), color: '#dc2626' },
            ].map(stat => (
              <div key={stat.label} style={{ border: '1px solid #ddd', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '4px' }}>{stat.label}</p>
                <h3 style={{ fontSize: '2rem', color: stat.color }}>{stat.value}</h3>
              </div>
            ))}
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
                const finalGrade = enr._calculatedFinal
                const isApproved = finalGrade != null && finalGrade >= 6
                return (
                  <tr key={enr.id} style={{ borderBottom: '1px solid #eee', background: finalGrade == null ? '#fafafa' : 'transparent' }}>
                    <td style={{ padding: '12px' }}>{enr.student.name}</td>
                    <td style={{ padding: '12px', color: '#666' }}>{enr.student.rgm || '—'}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{enr.absences}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: finalGrade != null ? (isApproved ? '#16a34a' : '#dc2626') : '#999' }}>
                      {finalGrade != null ? finalGrade.toFixed(1) : '—'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {finalGrade != null ? (
                        <span style={{ background: isApproved ? '#dcfce7' : '#fee2e2', color: isApproved ? '#16a34a' : '#dc2626', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                          {isApproved ? 'Aprovado' : 'Reprovado'}
                        </span>
                      ) : (
                        <span style={{ background: '#f3f4f6', color: '#6b7280', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem' }}>Sem nota</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <p style={{ textAlign: 'right', color: '#aaa', fontSize: '0.8rem', marginTop: '32px' }}>
            Gerado em: {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
      )}

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; color: #000 !important; }
          .dashboard-layout { display: block !important; }
          .sidebar { display: none !important; }
          .main-content { padding: 0 !important; margin: 0 !important; }
          .report-container { padding: 0 !important; }
        }
      `}</style>
    </div>
  )
}
