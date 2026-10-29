/**
 * Regra de cálculo de notas — fonte única.
 *
 * Esta mesma pergunta ("qual a média final deste aluno?") estava respondida de
 * três formas diferentes no projeto, e as respostas não batiam:
 *
 *   - O diário de notas e a exportação em Excel aplicavam o peso de cada
 *     atividade, separavam por bimestre e tratavam a AF.
 *   - O cabeçalho da turma e a visão geral apenas somavam as notas cruas,
 *     ignorando peso, bimestre e AF.
 *   - A tela de relatórios fazia uma terceira coisa.
 *
 * Um aluno com 2 em quatro atividades aparecia como 2.0 (reprovado) no diário
 * e 8.0 (aprovado) no cabeçalho e nos relatórios.
 *
 * Agora existe um cálculo só, coberto por testes em `grades.test.ts`.
 */

export type CalculationMethod = 'SUM' | 'AVERAGE'

/** O mínimo necessário de uma atividade para o cálculo. */
export type GradedActivity = {
  id: string
  /** 1 = primeiro bimestre, 2 = segundo, 3 = avaliação final (AF). */
  bimester: number
  weight: number
}

/** O mínimo necessário de uma nota lançada. */
export type GradeEntry = {
  activityId: string
  value: number
}

export type GradeSummary = {
  /** Média do 1º bimestre. */
  b1Avg: number
  /** Média do 2º bimestre. */
  b2Avg: number
  /** Média da avaliação final, ou null se não houver AF lançada. */
  afAvg: number | null
  /** Média final, já considerando a substituição pela AF quando aplicável. */
  final: number
}

/** Nota mínima para aprovação. */
export const PASSING_GRADE = 6

/** Faixa aceita para uma nota lançada. */
export const MIN_GRADE = 0
export const MAX_GRADE = 10

/**
 * A soma ponderada de um bimestre é dividida por 10 porque os pesos das
 * atividades de um bimestre somam 10 (ex.: 3 + 2 + 5).
 */
const WEIGHT_TOTAL = 10

function weightedAverage(
  activities: GradedActivity[],
  gradeByActivity: Map<string, number>
): number {
  let sum = 0
  for (const activity of activities) {
    sum += (gradeByActivity.get(activity.id) ?? 0) * activity.weight
  }
  return sum / WEIGHT_TOTAL
}

function round2(value: number): number {
  return parseFloat(value.toFixed(2))
}

/**
 * Calcula as médias de um aluno numa turma.
 *
 * A AF (bimestre 3) só entra quando o aluno já está abaixo da média, e
 * substitui o bimestre de menor nota — que é a regra usada no diário.
 */
export function calculateGrades(
  activities: GradedActivity[],
  grades: GradeEntry[],
  method: CalculationMethod | string
): GradeSummary {
  const gradeByActivity = new Map(grades.map(g => [g.activityId, g.value]))

  const b1Activities = activities.filter(a => a.bimester === 1)
  const b2Activities = activities.filter(a => a.bimester === 2)
  const afActivities = activities.filter(a => a.bimester === 3)

  const b1Avg = weightedAverage(b1Activities, gradeByActivity)
  const b2Avg = weightedAverage(b2Activities, gradeByActivity)

  // A AF só conta se houver ao menos uma nota de AF efetivamente lançada:
  // uma atividade de AF criada e ainda sem nota não pode baixar a média.
  const hasAfGrade = afActivities.some(a => gradeByActivity.has(a.id))
  const afAvg = afActivities.length > 0 && hasAfGrade
    ? weightedAverage(afActivities, gradeByActivity)
    : null

  const combine = (first: number, second: number) =>
    method === 'AVERAGE' ? (first + second) / 2 : first + second

  let final = combine(b1Avg, b2Avg)

  if (afAvg !== null && final < PASSING_GRADE) {
    // Substitui o bimestre de menor nota pela AF.
    final = b1Avg <= b2Avg ? combine(afAvg, b2Avg) : combine(b1Avg, afAvg)
  }

  return {
    b1Avg: round2(b1Avg),
    b2Avg: round2(b2Avg),
    afAvg: afAvg !== null ? round2(afAvg) : null,
    final: round2(final),
  }
}

/** O aluno atingiu a média para aprovação? */
export function isPassing(final: number): boolean {
  return final >= PASSING_GRADE
}

// ---- Situação do aluno ao longo do semestre ----

/**
 * A fração da nota máxima necessária para passar: 60%.
 *
 * O 6 sozinho só vale quando a nota máxima da turma é 10 e o semestre inteiro
 * já foi corrigido. Em qualquer outro momento o que vale é a proporção.
 */
export const PASSING_RATIO = PASSING_GRADE / MAX_GRADE

/**
 * O máximo que o aluno poderia ter alcançado nas atividades já corrigidas.
 *
 * Numa turma configurada como "5 + 5 = 10", um bimestre vale no máximo 5. Com
 * só o primeiro bimestre lançado, a maior nota possível é 5 — então comparar
 * com 6 marcava a turma inteira como em risco, inclusive quem tirou 10 nas
 * duas provas.
 *
 * A AF fica de fora porque ela só pode subir a nota final, nunca baixá-la.
 */
export function maxAttainable(
  activities: GradedActivity[],
  grades: GradeEntry[],
  method: CalculationMethod | string
): number {
  const lancadas = new Set(grades.map(g => g.activityId))

  // A nota máxima de uma atividade é MAX_GRADE, então o teto de um bimestre é
  // a soma dos pesos das atividades corrigidas (o cálculo divide por 10).
  const tetoDoBimestre = (bimester: number) =>
    activities
      .filter(a => a.bimester === bimester && lancadas.has(a.id))
      .reduce((soma, a) => soma + a.weight, 0) * MAX_GRADE / WEIGHT_TOTAL

  const b1 = tetoDoBimestre(1)
  const b2 = tetoDoBimestre(2)

  return method === 'AVERAGE' ? (b1 + b2) / 2 : b1 + b2
}

/**
 * A nota mínima para o aluno estar em dia neste ponto do semestre.
 *
 * É 60% do que dava para alcançar com o que já foi corrigido: 6 quando o
 * semestre inteiro está lançado numa turma de 0 a 10, e 3 quando só um
 * bimestre de "5 + 5" foi corrigido.
 */
export function passingThreshold(
  activities: GradedActivity[],
  grades: GradeEntry[],
  method: CalculationMethod | string
): number {
  return round2(maxAttainable(activities, grades, method) * PASSING_RATIO)
}

/**
 * O semestre deste aluno já está todo corrigido?
 *
 * Exige que os dois bimestres tenham atividade cadastrada e que todas tenham
 * nota. Sem isso, um primeiro bimestre corrigido antes de o segundo existir
 * seria lido como semestre fechado, e o aluno apareceria aprovado em março.
 */
export function isSemesterComplete(
  activities: GradedActivity[],
  grades: GradeEntry[]
): boolean {
  const lancadas = new Set(grades.map(g => g.activityId))
  const b1 = activities.filter(a => a.bimester === 1)
  const b2 = activities.filter(a => a.bimester === 2)

  if (b1.length === 0 || b2.length === 0) return false
  return [...b1, ...b2].every(a => lancadas.has(a.id))
}

/** A situação do aluno, conforme o ponto do semestre. */
export type GradeStanding = 'SEM_NOTA' | 'EM_DIA' | 'EM_RISCO' | 'APROVADO' | 'REPROVADO'

/**
 * Em que pé está o aluno.
 *
 * Com o semestre fechado a resposta é aprovado ou reprovado, pela média final.
 * Antes disso é "em dia" ou "em risco", medido contra o que já foi corrigido —
 * chamar de reprovado quem ainda tem meio semestre pela frente não ajuda
 * ninguém, e era o que acontecia.
 */
export function gradeStanding(
  activities: GradedActivity[],
  grades: GradeEntry[],
  method: CalculationMethod | string
): GradeStanding {
  if (grades.length === 0) return 'SEM_NOTA'

  const { final } = calculateGrades(activities, grades, method)

  if (isSemesterComplete(activities, grades)) {
    return isPassing(final) ? 'APROVADO' : 'REPROVADO'
  }

  return final >= passingThreshold(activities, grades, method) ? 'EM_DIA' : 'EM_RISCO'
}

/** O aluno está em risco pela nota? Serve para a lista de alertas. */
export function isGradeAtRisk(
  activities: GradedActivity[],
  grades: GradeEntry[],
  method: CalculationMethod | string
): boolean {
  const situacao = gradeStanding(activities, grades, method)
  return situacao === 'EM_RISCO' || situacao === 'REPROVADO'
}

/** Rótulo curto da situação, para tabelas e planilhas. */
export function standingLabel(standing: GradeStanding): string {
  switch (standing) {
    case 'SEM_NOTA': return 'Sem nota'
    case 'EM_DIA': return 'Em dia'
    case 'EM_RISCO': return 'Em risco'
    case 'APROVADO': return 'Aprovado'
    case 'REPROVADO': return 'Reprovado'
  }
}

/**
 * Média final de um aluno a partir da matrícula. Devolve null quando não há
 * nota nenhuma lançada — o que é diferente de ter tirado zero.
 */
export function finalGradeOrNull(
  activities: GradedActivity[],
  grades: GradeEntry[],
  method: CalculationMethod | string
): number | null {
  if (grades.length === 0) return null
  return calculateGrades(activities, grades, method).final
}

// ---- Entrada de notas ----

/**
 * O que a tela envia para cada aluno ao salvar uma atividade:
 * um número para a nota lançada, ou `null` para "sem nota".
 *
 * A distinção importa: um aluno sem nota não é um aluno que tirou zero. Antes
 * a tela mandava `0` nos dois casos, então corrigir metade da turma e salvar
 * zerava a outra metade.
 */
export type GradeInput = number | null

export type GradeInputResult =
  | {
      ok: true
      /** Notas a gravar. */
      toSave: Array<{ enrollmentId: string; value: number }>
      /** Alunos cuja nota deve ser removida (voltam a "sem nota"). */
      toRemove: string[]
    }
  | {
      ok: false
      /** Entradas recusadas, com o valor que veio. */
      invalid: Array<{ enrollmentId: string; value: unknown }>
    }

/** Uma nota válida é um número finito dentro da faixa. */
export function isValidGradeValue(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= MIN_GRADE &&
    value <= MAX_GRADE
  )
}

/**
 * Separa o que a tela enviou em "gravar" e "remover", recusando o lote inteiro
 * se qualquer valor for inválido.
 *
 * Recusar o lote todo é deliberado: gravar as notas boas e descartar as ruins
 * em silêncio deixaria o diário num estado que o professor não pediu e não
 * veria.
 */
export function parseGradeInput(
  data: Record<string, GradeInput | undefined>
): GradeInputResult {
  const toSave: Array<{ enrollmentId: string; value: number }> = []
  const toRemove: string[] = []
  const invalid: Array<{ enrollmentId: string; value: unknown }> = []

  for (const [enrollmentId, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      toRemove.push(enrollmentId)
    } else if (isValidGradeValue(value)) {
      toSave.push({ enrollmentId, value })
    } else {
      invalid.push({ enrollmentId, value })
    }
  }

  if (invalid.length > 0) return { ok: false, invalid }
  return { ok: true, toSave, toRemove }
}
