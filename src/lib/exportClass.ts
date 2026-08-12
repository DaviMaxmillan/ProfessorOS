/**
 * exportClass.ts
 * Centralized XLSX export utilities for all class tabs.
 * Each function returns a WorkSheet ready to be added to a workbook.
 * The `exportAll` function generates a multi-sheet XLSX with every tab.
 */

import * as XLSX from 'xlsx'

// ---- Helpers ----

function calcGrades(enrollment: any, activities: any[], calcMethod: string) {
  const b1Acts = activities.filter((a: any) => a.bimester === 1)
  const b2Acts = activities.filter((a: any) => a.bimester === 2)
  const afActs = activities.filter((a: any) => a.bimester === 3)

  const gradeMap: Record<string, number> = {}
  enrollment.grades.forEach((g: any) => { gradeMap[g.activityId] = g.value })

  let b1Sum = 0, b2Sum = 0, afSum = 0
  let hasAf = false

  b1Acts.forEach((a: any) => { b1Sum += (gradeMap[a.id] ?? 0) * a.weight })
  b2Acts.forEach((a: any) => { b2Sum += (gradeMap[a.id] ?? 0) * a.weight })
  afActs.forEach((a: any) => {
    if (gradeMap[a.id] != null) { hasAf = true; afSum += (gradeMap[a.id] ?? 0) * a.weight }
  })

  const b1Avg = b1Sum / 10
  const b2Avg = b2Sum / 10
  const afAvg = afActs.length > 0 && hasAf ? afSum / 10 : null

  let final = calcMethod === 'AVERAGE' ? (b1Avg + b2Avg) / 2 : b1Avg + b2Avg

  if (afAvg !== null && final < 6) {
    if (b1Avg <= b2Avg) {
      final = calcMethod === 'AVERAGE' ? (afAvg + b2Avg) / 2 : afAvg + b2Avg
    } else {
      final = calcMethod === 'AVERAGE' ? (b1Avg + afAvg) / 2 : b1Avg + afAvg
    }
  }

  return { b1Avg: parseFloat(b1Avg.toFixed(2)), b2Avg: parseFloat(b2Avg.toFixed(2)), afAvg: afAvg != null ? parseFloat(afAvg.toFixed(2)) : null, final: parseFloat(final.toFixed(2)) }
}

function classLabel(classData: any) {
  return `${classData.subject.name}${classData.turmaName ? ` — ${classData.turmaName}` : ''} | ${classData.semester.name}`
}

// ---- Sheet builders ----

export function buildStudentsSheet(classData: any): XLSX.WorkSheet {
  const rows = classData.enrollments.map((e: any, i: number) => ({
    'Nº': i + 1,
    'Nome': e.student.name,
    'RGM': e.student.rgm || '',
    'Matrícula': e.enrollmentDate ? new Date(e.enrollmentDate).toLocaleDateString('pt-BR') : '',
    'Status': e.status || 'ATIVO',
    'Anotação': e.notes || '',
  }))
  return XLSX.utils.json_to_sheet(rows)
}

export function buildGradesSheet(classData: any): XLSX.WorkSheet {
  const b1Acts = classData.activities.filter((a: any) => a.bimester === 1)
  const b2Acts = classData.activities.filter((a: any) => a.bimester === 2)
  const afActs = classData.activities.filter((a: any) => a.bimester === 3)

  const rows = classData.enrollments.map((e: any) => {
    const gradeMap: Record<string, number> = {}
    e.grades.forEach((g: any) => { gradeMap[g.activityId] = g.value })
    const avgs = calcGrades(e, classData.activities, classData.calculationMethod)

    const row: Record<string, any> = {
      'Aluno': e.student.name,
      'RGM': e.student.rgm || '',
    }
    b1Acts.forEach((a: any) => { row[`B1 – ${a.name} (P${a.weight})`] = gradeMap[a.id] ?? '' })
    row['Média B1'] = avgs.b1Avg
    b2Acts.forEach((a: any) => { row[`B2 – ${a.name} (P${a.weight})`] = gradeMap[a.id] ?? '' })
    row['Média B2'] = avgs.b2Avg
    if (afActs.length > 0) {
      afActs.forEach((a: any) => { row[`AF – ${a.name}`] = gradeMap[a.id] ?? '' })
    }
    row['Média Final'] = avgs.final
    row['Situação'] = avgs.final >= 6 ? 'Aprovado' : 'Em Risco'
    return row
  })

  return XLSX.utils.json_to_sheet(rows)
}

export function buildAttendanceSheet(classData: any): XLSX.WorkSheet {
  // Consolidated absences per student (from scheduleEntries attendance records)
  const rows = classData.enrollments.map((e: any, i: number) => {
    const totalAulas = classData.scheduleEntries?.filter((se: any) => !se.isHoliday).length ?? 0
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

export function buildScheduleSheet(classData: any): XLSX.WorkSheet {
  const rows = (classData.scheduleEntries ?? []).map((se: any, i: number) => ({
    'Nº': i + 1,
    'Data': new Date(se.date).toLocaleDateString('pt-BR'),
    'Conteúdo': se.content || '',
    'Observações': se.notes || '',
    'Feriado?': se.isHoliday ? (se.holidayName || 'Sim') : 'Não',
    'Link Drive': se.driveLink || '',
  }))

  return XLSX.utils.json_to_sheet(rows)
}

export function buildGroupsSheet(classData: any): XLSX.WorkSheet {
  const rows: any[] = []

  ;(classData.groupWorks ?? []).forEach((gw: any) => {
    ;(gw.groups ?? []).forEach((group: any) => {
      ;(group.members ?? []).forEach((member: any) => {
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

export function buildNotesSheet(classData: any): XLSX.WorkSheet {
  const rows = (classData.classNotes ?? []).map((note: any) => ({
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

export function exportAllXLSX(classData: any) {
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
