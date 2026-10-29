'use client'

import { useMemo, useState } from 'react'
import { Check, X, Save, Printer, Edit2, FileSpreadsheet } from 'lucide-react'
import { saveProvisionalAttendanceAction, updateStudentNameAction } from '@/app/actions/diary'
import { buildAttendanceSheet, buildRollCallSheet, exportSheetsXLSX } from '@/lib/exportClass'
import { attendanceForDate, hasAttendanceForDate, todayLocalDate } from '@/lib/attendance'
import type { ClassDetail } from '@/lib/types'

/** A chamada de uma data: matrícula -> presente. Quem não foi chamado fica presente. */
function chamadaDaData(classData: ClassDetail, date: string): Record<string, boolean> {
  const salva = attendanceForDate(classData.enrollments, date)
  const chamada: Record<string, boolean> = {}
  classData.enrollments.forEach((e) => {
    chamada[e.id] = salva[e.id] ?? true
  })
  return chamada
}

export default function AttendanceTab({ classData }: { classData: ClassDetail }) {
  // Data local, não UTC: numa aula noturna o `toISOString()` já aponta para o
  // dia seguinte no fuso do Brasil, e a chamada era gravada na data errada.
  const hoje = todayLocalDate()

  // A data e a chamada andam juntas: trocar a data carrega a chamada salva
  // daquele dia. Antes a aba começava sempre com todos presentes e nunca lia o
  // que estava no banco, então a chamada salva parecia ter sido perdida.
  const [chamada, setChamada] = useState(() => ({
    date: hoje,
    attendance: chamadaDaData(classData, hoje),
    alterada: false,
  }))

  const { date, attendance } = chamada
  const [isSaving, setIsSaving] = useState(false)

  const jaSalva = useMemo(
    () => hasAttendanceForDate(classData.enrollments, date),
    [classData.enrollments, date]
  )

  const trocarData = (novaData: string) => {
    setChamada({
      date: novaData,
      attendance: chamadaDaData(classData, novaData),
      alterada: false,
    })
  }

  const toggleStudent = (enrollmentId: string) => {
    setChamada(atual => ({
      ...atual,
      attendance: { ...atual.attendance, [enrollmentId]: !atual.attendance[enrollmentId] },
      alterada: true,
    }))
  }

  const markAll = (present: boolean) => {
    const updated: Record<string, boolean> = {}
    classData.enrollments.forEach((e) => {
      updated[e.id] = present
    })
    setChamada(atual => ({ ...atual, attendance: updated, alterada: true }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    const result = await saveProvisionalAttendanceAction(classData.id, date, attendance)
    setIsSaving(false)
    if (result.success) {
      setChamada(atual => ({ ...atual, alterada: false }))
    }
    alert(result.message)
  }

  const estado = chamada.alterada
    ? { texto: '● Alterações não salvas', cor: '#fbbf24' }
    : jaSalva
      ? { texto: '✓ Chamada salva nesta data', cor: '#4ade80' }
      : { texto: 'Nenhuma chamada salva nesta data', cor: 'var(--text-secondary)' }

  const handleEditStudent = async (studentId: string, currentName: string) => {
    const newName = prompt('Editar nome do aluno:', currentName)
    if (newName && newName.trim() !== '' && newName !== currentName) {
      const res = await updateStudentNameAction(studentId, newName)
      if (!res.success) {
        alert(res.message)
      }
    }
  }

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Data da Chamada</label>
            <input 
              type="date" 
              value={date}
              onChange={(e) => trocarData(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)', colorScheme: 'dark' }}
            />
            {/* Dizer em que pé está a chamada desta data. O professor não tem
                como adivinhar se o que está na tela já foi gravado. */}
            <div style={{ fontSize: '0.75rem', marginTop: '4px', color: estado.cor }}>{estado.texto}</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
            <button onClick={() => markAll(true)} style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.3)', color: '#4ade80', cursor: 'pointer' }}>Todos Presentes</button>
            <button onClick={() => markAll(false)} style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(248, 113, 113, 0.1)', border: '1px solid rgba(248, 113, 113, 0.3)', color: '#f87171', cursor: 'pointer' }}>Todos Faltantes</button>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-primary" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }} onClick={() => window.print()}>
            <Printer size={18} /> Imprimir em Branco
          </button>
          <button
            onClick={() => {
              const label = `${classData.subject.name}${classData.turmaName ? `_${classData.turmaName}` : ''}_${classData.semester.name}`.replace(/[/\\?%*:|"<>]/g, '-')
              // Duas abas: o consolidado do semestre e a chamada que está na
              // tela. Antes só saía o consolidado, e como ele vinha de um
              // contador que ninguém atualizava, a planilha dizia 0 faltas.
              exportSheetsXLSX(
                [
                  { name: 'Frequência', sheet: buildAttendanceSheet(classData) },
                  { name: 'Chamada do dia', sheet: buildRollCallSheet(classData, date, attendance) },
                ],
                `Frequencia_${label}.xlsx`
              )
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}
          >
            <FileSpreadsheet size={18} /> Exportar XLSX
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
            <Save size={18} /> {isSaving ? 'Salvando...' : 'Salvar Frequência'}
          </button>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }} className="print-table">
        <thead>
          <tr style={{ background: 'rgba(0,0,0,0.2)', textAlign: 'left' }}>
            <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--surface-border)', width: '60px' }}>Nº</th>
            <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--surface-border)' }}>Nome do Aluno</th>
            <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--surface-border)' }}>RGM</th>
            <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--surface-border)', textAlign: 'center' }}>Presente?</th>
            <th className="print-only" style={{ padding: '12px 16px', color: '#000', borderBottom: '1px solid #ccc', textAlign: 'center' }}>Assinatura</th>
          </tr>
        </thead>
        <tbody>
          {classData.enrollments.map((enrollment, index: number) => {
            const isPresent = attendance[enrollment.id] ?? true
            return (
              <tr key={enrollment.id} style={{ borderBottom: '1px solid var(--surface-border)' }} className="print-row">
                <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{index + 1}</td>
                <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '500' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {enrollment.student.name}
                    <button onClick={() => handleEditStudent(enrollment.student.id, enrollment.student.name)} style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', color: 'var(--accent)', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Editar Nome">
                      <Edit2 size={14} />
                    </button>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{enrollment.student.rgm}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }} className="no-print">
                  <button 
                    onClick={() => toggleStudent(enrollment.id)}
                    style={{
                      width: '36px', height: '36px', borderRadius: '8px', cursor: 'pointer', border: 'none',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      background: isPresent ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)',
                      color: isPresent ? '#4ade80' : '#f87171'
                    }}
                  >
                    {isPresent ? <Check size={20} /> : <X size={20} />}
                  </button>
                </td>
                <td className="print-only" style={{ padding: '12px 16px', borderBottom: '1px solid #ccc' }}></td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <style jsx global>{`
        .print-only { display: none; }
        @media print {
          body * { visibility: hidden; }
          .print-table, .print-table * { visibility: visible; color: #000 !important; border-color: #ccc !important; }
          .print-table { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .print-only { display: table-cell; }
          .glass-panel { background: #fff !important; border: none !important; }
          tr { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  )
}
