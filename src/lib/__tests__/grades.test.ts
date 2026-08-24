import { describe, expect, it } from 'vitest'
import {
  PASSING_GRADE,
  calculateGrades,
  finalGradeOrNull,
  isPassing,
  type GradeEntry,
  type GradedActivity,
} from '../grades'

/** Turma típica: dois bimestres com duas atividades cada (pesos 3 e 7). */
const atividades: GradedActivity[] = [
  { id: 'b1-prova', bimester: 1, weight: 7 },
  { id: 'b1-trab', bimester: 1, weight: 3 },
  { id: 'b2-prova', bimester: 2, weight: 7 },
  { id: 'b2-trab', bimester: 2, weight: 3 },
]

const comAf: GradedActivity[] = [
  ...atividades,
  { id: 'af', bimester: 3, weight: 10 },
]

/** Atalho: mesma nota em todas as atividades informadas. */
function notas(valores: Record<string, number>): GradeEntry[] {
  return Object.entries(valores).map(([activityId, value]) => ({ activityId, value }))
}

describe('calculateGrades — pesos', () => {
  it('aplica o peso de cada atividade dentro do bimestre', () => {
    // 8 na prova (peso 7) e 5 no trabalho (peso 3) => (56 + 15) / 10 = 7.1
    const r = calculateGrades(atividades, notas({ 'b1-prova': 8, 'b1-trab': 5 }), 'SUM')
    expect(r.b1Avg).toBe(7.1)
  })

  it('nota igual em todas as atividades resulta na própria nota', () => {
    const r = calculateGrades(atividades, notas({
      'b1-prova': 8, 'b1-trab': 8, 'b2-prova': 8, 'b2-trab': 8,
    }), 'SUM')
    expect(r.b1Avg).toBe(8)
    expect(r.b2Avg).toBe(8)
  })

  it('atividade sem nota lançada conta como zero no bimestre', () => {
    // Só a prova (peso 7) tem nota: 8 * 7 / 10 = 5.6
    const r = calculateGrades(atividades, notas({ 'b1-prova': 8 }), 'SUM')
    expect(r.b1Avg).toBe(5.6)
  })
})

describe('calculateGrades — método SUM x AVERAGE', () => {
  const todasOito = notas({ 'b1-prova': 8, 'b1-trab': 8, 'b2-prova': 8, 'b2-trab': 8 })

  it('SUM soma os dois bimestres', () => {
    expect(calculateGrades(atividades, todasOito, 'SUM').final).toBe(16)
  })

  it('AVERAGE tira a média dos dois bimestres', () => {
    expect(calculateGrades(atividades, todasOito, 'AVERAGE').final).toBe(8)
  })
})

describe('calculateGrades — avaliação final (AF)', () => {
  const abaixoDaMedia = notas({
    'b1-prova': 4, 'b1-trab': 4,   // B1 = 4.0
    'b2-prova': 6, 'b2-trab': 6,   // B2 = 6.0
  })

  it('não considera AF quando a atividade existe mas não tem nota lançada', () => {
    const r = calculateGrades(comAf, abaixoDaMedia, 'AVERAGE')
    expect(r.afAvg).toBeNull()
    expect(r.final).toBe(5) // (4 + 6) / 2
  })

  it('AF substitui o bimestre de menor nota quando o aluno está abaixo da média', () => {
    const r = calculateGrades(comAf, [...abaixoDaMedia, { activityId: 'af', value: 9 }], 'AVERAGE')
    expect(r.afAvg).toBe(9)
    // B1 (4.0) é o menor, então sai e entra a AF: (9 + 6) / 2 = 7.5
    expect(r.final).toBe(7.5)
  })

  it('AF substitui o B2 quando ele é o menor dos dois', () => {
    const b2Menor = notas({
      'b1-prova': 6, 'b1-trab': 6,   // B1 = 6.0
      'b2-prova': 3, 'b2-trab': 3,   // B2 = 3.0
      'af': 8,
    })
    const r = calculateGrades(comAf, b2Menor, 'AVERAGE')
    // B2 (3.0) sai e entra a AF: (6 + 8) / 2 = 7.0
    expect(r.final).toBe(7)
  })

  it('AF é ignorada quando o aluno já está aprovado', () => {
    const jaAprovado = notas({
      'b1-prova': 8, 'b1-trab': 8, 'b2-prova': 8, 'b2-trab': 8, 'af': 2,
    })
    const r = calculateGrades(comAf, jaAprovado, 'AVERAGE')
    // A AF (2.0) não pode derrubar quem já passou.
    expect(r.final).toBe(8)
  })

  it('a AF não melhora a nota além do necessário quando ainda assim reprova', () => {
    const r = calculateGrades(comAf, notas({
      'b1-prova': 1, 'b1-trab': 1, 'b2-prova': 2, 'b2-trab': 2, 'af': 4,
    }), 'AVERAGE')
    // B1 (1.0) sai, entra AF (4.0): (4 + 2) / 2 = 3.0 — segue reprovado.
    expect(r.final).toBe(3)
    expect(isPassing(r.final)).toBe(false)
  })
})

describe('isPassing', () => {
  it(`aprova exatamente na nota ${PASSING_GRADE}`, () => {
    expect(isPassing(PASSING_GRADE)).toBe(true)
  })

  it('reprova logo abaixo da nota de corte', () => {
    expect(isPassing(5.99)).toBe(false)
  })
})

describe('finalGradeOrNull', () => {
  it('devolve null quando não há nota nenhuma lançada', () => {
    expect(finalGradeOrNull(atividades, [], 'SUM')).toBeNull()
  })

  it('distingue "sem nota" de "tirou zero"', () => {
    const zerado = finalGradeOrNull(atividades, notas({ 'b1-prova': 0 }), 'SUM')
    expect(zerado).toBe(0)
    expect(zerado).not.toBeNull()
  })
})

describe('regressão: as telas precisam concordar entre si', () => {
  // Este era o bug: o cabeçalho da turma, a visão geral e os relatórios
  // somavam as notas cruas, ignorando peso e bimestre. Um aluno com 2 em tudo
  // aparecia como 8.0 e "Aprovado" nessas telas, e 2.0 e "Reprovado" no diário.
  it('aluno com 2 em todas as atividades está reprovado', () => {
    const r = calculateGrades(atividades, notas({
      'b1-prova': 2, 'b1-trab': 2, 'b2-prova': 2, 'b2-trab': 2,
    }), 'SUM')

    expect(r.final).toBe(4)
    expect(isPassing(r.final)).toBe(false)
    // A soma crua das notas daria 8 e o aprovaria por engano.
    expect(r.final).not.toBe(8)
  })

  it('média final nunca é a soma crua das notas', () => {
    const valores = { 'b1-prova': 7, 'b1-trab': 4, 'b2-prova': 9, 'b2-trab': 6 }
    const somaCrua = Object.values(valores).reduce((a, b) => a + b, 0)
    const r = calculateGrades(atividades, notas(valores), 'SUM')
    expect(r.final).not.toBe(somaCrua)
    expect(r.final).toBeLessThan(somaCrua)
  })
})
