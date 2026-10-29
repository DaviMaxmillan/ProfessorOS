/**
 * O rascunho do diário de notas — o que está digitado mas ainda não gravado.
 *
 * O diário tinha um botão "Salvar" por coluna, pequeno, dentro do cabeçalho da
 * atividade. Nada comparava o que estava na tela com o que estava no banco, e
 * nada avisava que havia nota por gravar. Na prática:
 *
 *   - Lançar a turma inteira em várias provas e salvar uma coluna só gravava
 *     aquela coluna; o resto sumia sem aviso.
 *   - Trocar de aba desmontava o componente e levava junto tudo o que não
 *     tinha sido salvo.
 *   - A exportação em Excel lê o que veio do servidor, então saía vazia — e
 *     era por ela que o professor descobria o problema.
 *
 * Estas funções respondem "o que mudou em relação ao banco?". Com isso a tela
 * consegue mostrar quantas notas faltam gravar, destacar as células e salvar
 * todas as atividades de uma vez.
 *
 * Coberto por testes em `gradeDraft.test.ts`.
 */

import type { GradeInput } from './grades'

/** Uma matrícula com as notas que vieram do banco. */
export type EnrollmentGrades = {
  id: string
  grades: { activityId: string; value: number }[]
}

/** O rascunho da tela: matrícula -> atividade -> nota (ou null para "sem nota"). */
export type GradeDraft = Record<string, Record<string, number | null>>

/** Uma célula que está diferente do banco. */
export type ChangedCell = {
  enrollmentId: string
  activityId: string
}

/**
 * O estado inicial do rascunho, a partir do que o banco devolveu.
 *
 * Toda matrícula entra, mesmo sem nota, para a tela não precisar checar se a
 * chave existe a cada célula.
 */
export function draftFromEnrollments(enrollments: EnrollmentGrades[]): GradeDraft {
  const draft: GradeDraft = {}
  for (const enrollment of enrollments) {
    draft[enrollment.id] = {}
    for (const grade of enrollment.grades) {
      draft[enrollment.id][grade.activityId] = grade.value
    }
  }
  return draft
}

/** A nota gravada, ou `null` quando o aluno não tem nota nessa atividade. */
function notaSalva(enrollment: EnrollmentGrades, activityId: string): number | null {
  const grade = enrollment.grades.find(g => g.activityId === activityId)
  return grade ? grade.value : null
}

/**
 * As células do rascunho que não batem com o banco.
 *
 * "Sem nota" e "zero" são coisas diferentes — apagar uma nota lançada é uma
 * alteração tanto quanto trocá-la por outra, e precisa aparecer como pendente.
 */
export function changedCells(
  enrollments: EnrollmentGrades[],
  activityIds: string[],
  draft: GradeDraft
): ChangedCell[] {
  const alteradas: ChangedCell[] = []

  for (const enrollment of enrollments) {
    const linha = draft[enrollment.id]
    if (!linha) continue

    for (const activityId of activityIds) {
      const naTela = linha[activityId] ?? null
      if (naTela !== notaSalva(enrollment, activityId)) {
        alteradas.push({ enrollmentId: enrollment.id, activityId })
      }
    }
  }

  return alteradas
}

/** As atividades que têm pelo menos uma célula alterada. */
export function changedActivityIds(alteradas: ChangedCell[]): string[] {
  return [...new Set(alteradas.map(c => c.activityId))]
}

/**
 * O lote a enviar: só as atividades alteradas, com a turma inteira em cada uma.
 *
 * A turma inteira entra porque a gravação de uma atividade é um retrato
 * completo dela: quem está sem nota precisa chegar como `null` para que uma
 * nota apagada seja de fato removida, em vez de sobrar no banco.
 */
export function draftToPayload(
  enrollments: EnrollmentGrades[],
  alteradas: ChangedCell[],
  draft: GradeDraft
): Record<string, Record<string, GradeInput>> {
  const payload: Record<string, Record<string, GradeInput>> = {}

  for (const activityId of changedActivityIds(alteradas)) {
    const daAtividade: Record<string, GradeInput> = {}
    for (const enrollment of enrollments) {
      const valor = draft[enrollment.id]?.[activityId]
      daAtividade[enrollment.id] = typeof valor === 'number' ? valor : null
    }
    payload[activityId] = daAtividade
  }

  return payload
}

/** Um conjunto de chaves "matrícula:atividade", para a tela destacar as células. */
export function changedCellKeys(alteradas: ChangedCell[]): Set<string> {
  return new Set(alteradas.map(c => `${c.enrollmentId}:${c.activityId}`))
}

export function cellKey(enrollmentId: string, activityId: string): string {
  return `${enrollmentId}:${activityId}`
}
