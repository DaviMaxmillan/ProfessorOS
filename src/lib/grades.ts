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
