/**
 * exportClass.ts
 * Centralized XLSX export utilities for all class tabs.
 * Each function returns a WorkSheet ready to be added to a workbook.
 * The `exportAll` function generates a multi-sheet XLSX with every tab.
 */

import * as XLSX from 'xlsx'
import type { ClassDetail } from './types'
import { calculateGrades, gradeStanding, passingThreshold, standingLabel } from './grades'
import { attendanceDateKey, frequencyPercent, isBelowMinFrequency, summarizeAttendance } from './attendance'
import { isActiveEnrollment } from './roster'

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
    // O mínimo acompanha o que já foi corrigido, em vez do 6 fixo: com meio
    // semestre lançado numa turma "5 + 5", o teto é 5 e o mínimo é 3.
    row['Mínimo até aqui'] = passingThreshold(classData.activities, e.grades, classData.calculationMethod)
    row['Situação'] = standingLabel(gradeStanding(classData.activities, e.grades, classData.calculationMethod))
    return row
  })

  return XLSX.utils.json_to_sheet(rows)
}

/**
 * Consolidado de frequência, somando as chamadas salvas.
 *
 * Antes esta planilha lia `enrollment.absences`, um contador que nenhum lugar
 * do sistema escreve: saía sempre 0 faltas e 100% de frequência, mesmo com a
 * chamada feita e salva. Agora sai das chamadas de verdade.
 */
export function buildAttendanceSheet(classData: ClassDetail): XLSX.WorkSheet {
  // Aulas previstas no cronograma, para comparar com o que já foi chamado.
  const aulasPrevistas = classData.scheduleEntries?.filter((se) => !se.isHoliday).length ?? 0

  const rows = classData.enrollments.map((e, i) => {
    const resumo = summarizeAttendance(e.attendances)
    const pct = frequencyPercent(resumo)

    return {
      'Nº': i + 1,
      'Nome': e.student.name,
      'RGM': e.student.rgm || '',
      'Status': e.status || 'ATIVO',
      'Aulas Previstas': aulasPrevistas,
      'Chamadas Feitas': resumo.calls,
      'Presenças': resumo.presences,
      'Faltas': resumo.absences,
      'Frequência (%)': pct ?? '—',
      'Situação':
        pct === null
          ? 'Sem chamada'
          : isBelowMinFrequency(resumo)
            ? '⚠ Abaixo de 75%'
            : 'Regular',
    }
  })

  return XLSX.utils.json_to_sheet(rows)
}

/**
 * A chamada de uma data, como está na tela.
 *
 * Existe porque a aba de frequência tem um botão de exportar ao lado do de
 * salvar: sem esta aba na planilha, exportar depois de fazer a chamada
 * devolvia só o consolidado, sem sinal do que acabou de ser marcado.
 */
export function buildRollCallSheet(
  classData: ClassDetail,
  date: string,
  attendance: Record<string, boolean>
): XLSX.WorkSheet {
  const dataBR = attendanceDateKey(date)
    ? new Date(`${attendanceDateKey(date)}T00:00:00.000Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
    : date

  // Os mesmos alunos que a tela chama: trancado e desistente ficam de fora.
  const rows = classData.enrollments
    .filter((e) => isActiveEnrollment(e.status))
    .map((e, i) => ({
      'Nº': i + 1,
      'Data': dataBR,
      'Nome': e.student.name,
      'RGM': e.student.rgm || '',
      'Presente?': (attendance[e.id] ?? true) ? 'Presente' : 'Falta',
    }))

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

/** Várias abas num arquivo só, na ordem informada. */
export function exportSheetsXLSX(
  sheets: { name: string; sheet: XLSX.WorkSheet }[],
  filename: string
) {
  const wb = XLSX.utils.book_new()
  sheets.forEach(({ name, sheet }) => XLSX.utils.book_append_sheet(wb, sheet, name))
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
