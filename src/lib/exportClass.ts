/**
 * exportClass.ts
 * Centralized XLSX export utilities for all class tabs.
 * Each function returns a WorkSheet ready to be added to a workbook.
 * The `exportAll` function generates a multi-sheet XLSX with every tab.
 */

import * as XLSX from 'xlsx'
import type { ClassDetail } from './types'
import { calculateGrades, isPassing } from './grades'

/** Uma linha de planilha: cabeçalho da coluna -> valor da célula. */
type SheetRow = Record<string, string | number>

// ---- Helpers ----

function classLabel(classData: ClassDetail) {
  return `${classData.subject.name}${classData.turmaName ? ` — ${classData.turmaName}` : ''} | ${classData.semester.name}`
}

// ---- Sheet builders ----

export function buildStudentsSheet(classData: ClassDetail): XLSX.WorkSheet {
  const rows = classData.enrollments.map((e, i) => ({
    'Nº': i + 1,
    'Nome': e.student.name,
    'RGM': e.student.rgm || '',
    'Matrícula': e.enrollmentDate ? new Date(e.enrollmentDate).toLocaleDateString('pt-BR') : '',
    'Status': e.status || 'ATIVO',
    'Anotação': e.notes || '',
  }))
  return XLSX.utils.json_to_sheet(rows)
}

export function buildGradesSheet(classData: ClassDetail): XLSX.WorkSheet {
  const b1Acts = classData.activities.filter((a) => a.bimester === 1)
  const b2Acts = classData.activities.filter((a) => a.bimester === 2)
  const afActs = classData.activities.filter((a) => a.bimester === 3)

  const rows = classData.enrollments.map((e) => {
    const gradeMap: Record<string, number> = {}
    e.grades.forEach((g) => { gradeMap[g.activityId] = g.value })
    const avgs = calculateGrades(classData.activities, e.grades, classData.calculationMethod)

    const row: SheetRow = {
      'Aluno': e.student.name,
      'RGM': e.student.rgm || '',
    }
    b1Acts.forEach((a) => { row[`B1 – ${a.name} (P${a.weight})`] = gradeMap[a.id] ?? '' })
    row['Média B1'] = avgs.b1Avg
    b2Acts.forEach((a) => { row[`B2 – ${a.name} (P${a.weight})`] = gradeMap[a.id] ?? '' })
    row['Média B2'] = avgs.b2Avg
    if (afActs.length > 0) {
      afActs.forEach((a) => { row[`AF – ${a.name}`] = gradeMap[a.id] ?? '' })
    }
    row['Média Final'] = avgs.final
    row['Situação'] = isPassing(avgs.final) ? 'Aprovado' : 'Em Risco'
    return row
  })

  return XLSX.utils.json_to_sheet(rows)
}

export function buildAttendanceSheet(classData: ClassDetail): XLSX.WorkSheet {
  // Consolidated absences per student (from scheduleEntries attendance records)
  const rows = classData.enrollments.map((e, i) => {
    const totalAulas = classData.scheduleEntries?.filter((se) => !se.isHoliday).length ?? 0
    const absences = e.absences ?? 0
    const presences = Math.max(0, totalAulas - absences)
    const freqPct = totalAulas > 0 ? ((presences / totalAulas) * 100).toFixed(1) : '—'

    return {
      'Nº': i + 1,
      'Nome': e.student.name,
      'RGM': e.student.rgm || '',
      'Total de Aulas': totalAulas,
      'Presenças': presences,
      'Faltas': absences,
      'Frequência (%)': freqPct !== '—' ? parseFloat(freqPct) : '—',
      'Situação': freqPct !== '—' ? (parseFloat(freqPct) >= 75 ? 'Regular' : '⚠ Risco de Reprovação') : '—',
    }
  })

  return XLSX.utils.json_to_sheet(rows)
}

export function buildScheduleSheet(classData: ClassDetail): XLSX.WorkSheet {
  const rows = (classData.scheduleEntries ?? []).map((se, i) => ({
    'Nº': i + 1,
    'Data': new Date(se.date).toLocaleDateString('pt-BR'),
    'Conteúdo': se.content || '',
    'Observações': se.notes || '',
    'Feriado?': se.isHoliday ? (se.holidayName || 'Sim') : 'Não',
    'Link Drive': se.driveLink || '',
  }))

  return XLSX.utils.json_to_sheet(rows)
}

export function buildGroupsSheet(classData: ClassDetail): XLSX.WorkSheet {
  const rows: SheetRow[] = []

  ;(classData.groupWorks ?? []).forEach((gw) => {
    ;(gw.groups ?? []).forEach((group) => {
      ;(group.members ?? []).forEach((member) => {
        rows.push({
          'Trabalho': gw.name,
          'Grupo': group.name,
          'Tema': group.theme || '',
          'Aluno': member.enrollment?.student?.name || '',
          'RGM': member.enrollment?.student?.rgm || '',
          'Feedback do Grupo': group.notes || '',
        })
      })
    })
  })

  if (rows.length === 0) {
    rows.push({ 'Trabalho': 'Nenhum grupo cadastrado' })
  }

  return XLSX.utils.json_to_sheet(rows)
}

export function buildNotesSheet(classData: ClassDetail): XLSX.WorkSheet {
  const rows: SheetRow[] = (classData.classNotes ?? []).map((note) => ({
    'Título': note.title || '(sem título)',
    'Conteúdo': note.content,
    'Etiqueta': note.label || '',
    'Fixado': note.pinned ? 'Sim' : 'Não',
    'Criado em': new Date(note.createdAt).toLocaleDateString('pt-BR'),
  }))

  if (rows.length === 0) rows.push({ 'Título': 'Nenhuma nota cadastrada' })

  return XLSX.utils.json_to_sheet(rows)
}

// ---- Main export functions ----

export function exportSheetXLSX(ws: XLSX.WorkSheet, sheetName: string, filename: string) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, filename)
}

export function exportAllXLSX(classData: ClassDetail) {
  const wb = XLSX.utils.book_new()
  const label = classLabel(classData).replace(/[/\\?%*:|"<>]/g, '-')

  XLSX.utils.book_append_sheet(wb, buildStudentsSheet(classData), 'Alunos')
  XLSX.utils.book_append_sheet(wb, buildGradesSheet(classData), 'Diário de Notas')
  XLSX.utils.book_append_sheet(wb, buildAttendanceSheet(classData), 'Frequência')
  XLSX.utils.book_append_sheet(wb, buildScheduleSheet(classData), 'Cronograma')
  XLSX.utils.book_append_sheet(wb, buildGroupsSheet(classData), 'Grupos')
  XLSX.utils.book_append_sheet(wb, buildNotesSheet(classData), 'Notas da Turma')

  XLSX.writeFile(wb, `Turma_${label}.xlsx`)
}
