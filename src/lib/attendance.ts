/**
 * Frequência — fonte única.
 *
 * A chamada da aba "Frequência Provisória" sempre foi gravada no banco, na
 * tabela `AttendanceRecord`. O problema é que nada lia essa tabela:
 *
 *   - A aba carregava a turma sem o `attendances` no `include`, então ao
 *     recarregar a página todo mundo voltava a aparecer como presente.
 *   - A exportação em Excel, a visão geral e os relatórios liam
 *     `Enrollment.absences`, um contador inteiro que nenhum lugar do sistema
 *     escreve — ou seja, zero para todo mundo, sempre.
 *
 * Resultado prático: o professor fazia a chamada, salvava, exportava — e a
 * planilha dizia 0 faltas e 100% de frequência para a turma inteira. Parecia
 * que a chamada não tinha sido salva.
 *
 * Agora a chamada é a única fonte: faltas e frequência são derivadas dos
 * registros. `Enrollment.absences` deixou de ser lido.
 *
 * Coberto por testes em `attendance.test.ts`.
 */

/** O mínimo necessário de um registro de chamada. */
export type AttendanceEntry = {
  date: Date | string
  present: boolean
}

/** Frequência mínima regimental (75%). */
export const MIN_FREQUENCY = 0.75

/** A partir de quantas faltas proporcionais o aluno entra na lista de risco. */
export const RISK_ABSENCE_RATE = 1 - MIN_FREQUENCY

/**
 * Quantas chamadas precisam existir antes de sinalizar risco por falta.
 *
 * Sem esse piso, a primeira chamada do semestre já acusaria risco: quem faltou
 * na única aula registrada tem 100% de ausência. O alerta só passa a valer
 * quando há histórico suficiente para significar algo.
 */
export const MIN_CALLS_FOR_RISK = 4

export type AttendanceSummary = {
  /** Aulas com chamada registrada para este aluno. */
  calls: number
  presences: number
  absences: number
  /**
   * Frequência de 0 a 1, ou `null` quando ainda não houve chamada.
   *
   * O `null` é importante: antes a tela mostrava 100% para uma turma sem
   * nenhuma chamada feita, o que é diferente de "todos presentes".
   */
  frequency: number | null
}

/**
 * A data da chamada é a chave do registro no banco (`@@unique([enrollmentId,
 * date])`), gravada como meia-noite UTC. O input `type="date"` entrega
 * `YYYY-MM-DD`, que o `new Date()` já interpreta como meia-noite UTC — então o
 * formato combina. Esta função existe para que o resto do código não dependa
 * desse detalhe, e para rejeitar o que não for data.
 */
export function attendanceDate(date: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const parsed = new Date(`${date}T00:00:00.000Z`)
  return isNaN(parsed.getTime()) ? null : parsed
}

/**
 * A data de hoje no fuso de quem está usando, em `YYYY-MM-DD`.
 *
 * O `new Date().toISOString()` devolve a data em UTC, o que atrasa um dia o
 * fuso do Brasil a partir das 21h: uma chamada feita numa aula noturna de
 * quinta era gravada como sexta. Em São Paulo (UTC-3), 2026-10-29 21:30 vira
 * 2026-10-30 em UTC.
 */
export function todayLocalDate(now: Date = new Date()): string {
  const ano = now.getFullYear()
  const mes = String(now.getMonth() + 1).padStart(2, '0')
  const dia = String(now.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

/** A mesma data no formato `YYYY-MM-DD`, para comparar registros. */
export function attendanceDateKey(date: Date | string): string {
  if (typeof date === 'string') {
    return /^\d{4}-\d{2}-\d{2}/.test(date) ? date.slice(0, 10) : ''
  }
  return isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

/** Consolida os registros de chamada de um aluno. */
export function summarizeAttendance(records: AttendanceEntry[]): AttendanceSummary {
  let presences = 0
  let absences = 0

  for (const record of records) {
    if (record.present) presences++
    else absences++
  }

  const calls = presences + absences

  return {
    calls,
    presences,
    absences,
    frequency: calls > 0 ? presences / calls : null,
  }
}

/**
 * A chamada de uma data específica, no formato que a aba usa:
 * matrícula -> presente.
 */
export function attendanceForDate(
  enrollments: { id: string; attendances: AttendanceEntry[] }[],
  date: string
): Record<string, boolean> {
  const alvo = attendanceDateKey(date)
  const chamada: Record<string, boolean> = {}

  for (const enrollment of enrollments) {
    const registro = enrollment.attendances.find(
      (a) => attendanceDateKey(a.date) === alvo
    )
    if (registro) chamada[enrollment.id] = registro.present
  }

  return chamada
}

/** Houve chamada salva nesta data para alguém da turma? */
export function hasAttendanceForDate(
  enrollments: { attendances: AttendanceEntry[] }[],
  date: string
): boolean {
  const alvo = attendanceDateKey(date)
  return enrollments.some((e) =>
    e.attendances.some((a) => attendanceDateKey(a.date) === alvo)
  )
}

/**
 * A frequência está abaixo do mínimo regimental?
 *
 * É o fato puro, sem piso de chamadas: serve para a planilha e para a tabela,
 * onde a situação aparece ao lado da porcentagem. Dizer "Regular" para quem
 * está com 0% só porque houve uma chamada só contradiz o número da célula
 * vizinha.
 */
export function isBelowMinFrequency(summary: AttendanceSummary): boolean {
  if (summary.frequency === null) return false
  return summary.frequency < MIN_FREQUENCY
}

/**
 * O aluno entra na lista de "alunos em risco" da visão geral?
 *
 * Aqui o piso de chamadas vale: a lista é um alerta, e alertar a turma inteira
 * na primeira chamada do semestre a tornaria inútil. A planilha continua
 * mostrando a frequência real pelo `isBelowMinFrequency`.
 */
export function isAbsenceAtRisk(summary: AttendanceSummary): boolean {
  if (summary.calls < MIN_CALLS_FOR_RISK) return false
  return isBelowMinFrequency(summary)
}

/** Frequência em porcentagem com uma casa, ou `null` se não houve chamada. */
export function frequencyPercent(summary: AttendanceSummary): number | null {
  if (summary.frequency === null) return null
  return parseFloat((summary.frequency * 100).toFixed(1))
}
