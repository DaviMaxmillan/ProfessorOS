import { describe, expect, it } from 'vitest'
import {
  PASSING_GRADE,
  bimesterThreshold,
  calculateGrades,
  finalGradeOrNull,
  gradeStanding,
  projectedFinal,
  isGradeAtRisk,
  isSemesterComplete,
  maxAttainable,
  passingThreshold,
  standingLabel,
  isPassing,
  isValidGradeValue,
  parseGradeInput,
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

describe('isValidGradeValue', () => {
  it('aceita notas dentro da faixa', () => {
    expect(isValidGradeValue(0)).toBe(true)
    expect(isValidGradeValue(7.5)).toBe(true)
    expect(isValidGradeValue(10)).toBe(true)
  })

  it('recusa notas fora da faixa', () => {
    expect(isValidGradeValue(-1)).toBe(false)
    expect(isValidGradeValue(10.1)).toBe(false)
    expect(isValidGradeValue(100)).toBe(false)
  })

  it('recusa valores que não são número finito', () => {
    expect(isValidGradeValue(NaN)).toBe(false)
    expect(isValidGradeValue(Infinity)).toBe(false)
    expect(isValidGradeValue('8')).toBe(false)
    expect(isValidGradeValue(null)).toBe(false)
    expect(isValidGradeValue(undefined)).toBe(false)
  })
})

describe('parseGradeInput', () => {
  it('separa notas a gravar das que devem ser removidas', () => {
    const r = parseGradeInput({ a: 8, b: null, c: 6.5 })

    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.toSave).toEqual([
      { enrollmentId: 'a', value: 8 },
      { enrollmentId: 'c', value: 6.5 },
    ])
    expect(r.toRemove).toEqual(['b'])
  })

  it('trata "sem nota" como remoção, nunca como zero', () => {
    // Era o bug: a tela mandava 0 para quem ainda não tinha nota, e o aluno
    // aparecia reprovado sem nunca ter sido corrigido.
    const r = parseGradeInput({ a: null, b: undefined })

    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.toSave).toEqual([])
    expect(r.toRemove).toEqual(['a', 'b'])
  })

  it('mantém o zero lançado de propósito', () => {
    const r = parseGradeInput({ a: 0 })

    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.toSave).toEqual([{ enrollmentId: 'a', value: 0 }])
    expect(r.toRemove).toEqual([])
  })

  it('recusa o lote inteiro quando alguma nota é inválida', () => {
    // Gravar as válidas e descartar as inválidas em silêncio deixaria o diário
    // num estado que o professor não pediu e não veria.
    const r = parseGradeInput({ a: 8, b: 99, c: 7 })

    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.invalid).toEqual([{ enrollmentId: 'b', value: 99 }])
  })

  it('lista todas as entradas inválidas do lote', () => {
    const r = parseGradeInput({ a: -5, b: 8, c: NaN })

    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.invalid.map(i => i.enrollmentId)).toEqual(['a', 'c'])
  })

  it('aceita um lote vazio', () => {
    const r = parseGradeInput({})

    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.toSave).toEqual([])
    expect(r.toRemove).toEqual([])
  })
})

describe('situação ao longo do semestre', () => {
  /** A turma do professor: "5 + 5 = 10", dois bimestres de peso 5. */
  const cincoMaisCinco: GradedActivity[] = [
    { id: 'b1p1', bimester: 1, weight: 2.5 },
    { id: 'b1p2', bimester: 1, weight: 2.5 },
    { id: 'b2p1', bimester: 2, weight: 2.5 },
    { id: 'b2p2', bimester: 2, weight: 2.5 },
  ]

  const soB1 = (valor: number) => notas({ b1p1: valor, b1p2: valor })
  const semestreTodo = (b1: number, b2: number) =>
    notas({ b1p1: b1, b1p2: b1, b2p1: b2, b2p2: b2 })

  describe('maxAttainable', () => {
    it('é 5 quando só o primeiro bimestre de uma turma 5+5 foi corrigido', () => {
      expect(maxAttainable(cincoMaisCinco, soB1(10), 'SUM')).toBe(5)
    })

    it('é 10 com o semestre inteiro corrigido', () => {
      expect(maxAttainable(cincoMaisCinco, semestreTodo(10, 10), 'SUM')).toBe(10)
    })

    it('conta o bimestre inteiro, não só a parte corrigida', () => {
      // O teto é o que o bimestre vale na configuração da turma. Corrigir
      // uma prova de peso 2.5 não muda o fato de que o bimestre vale 5 — a
      // prova que falta ainda vale nota.
      expect(maxAttainable(cincoMaisCinco, notas({ b1p1: 10 }), 'SUM')).toBe(5)
    })

    it('não conta o bimestre que ainda não começou', () => {
      expect(maxAttainable(cincoMaisCinco, soB1(10), 'SUM')).toBe(5)
    })

    it('é zero sem nota nenhuma', () => {
      expect(maxAttainable(cincoMaisCinco, [], 'SUM')).toBe(0)
    })

    it('respeita o método AVERAGE', () => {
      // Com média, um bimestre corrigido rende metade do teto.
      expect(maxAttainable(atividades, notas({ 'b1-prova': 10, 'b1-trab': 10 }), 'AVERAGE')).toBe(5)
      expect(maxAttainable(atividades, notas({
        'b1-prova': 10, 'b1-trab': 10, 'b2-prova': 10, 'b2-trab': 10,
      }), 'AVERAGE')).toBe(10)
    })
  })

  describe('passingThreshold', () => {
    it('é 3 num bimestre que vale 5 — o caso que o professor relatou', () => {
      expect(passingThreshold(cincoMaisCinco, soB1(10), 'SUM')).toBe(3)
    })

    it('volta a ser 6 com o semestre inteiro corrigido', () => {
      expect(passingThreshold(cincoMaisCinco, semestreTodo(10, 10), 'SUM')).toBe(6)
    })

    it('não encolhe quando só parte do bimestre foi corrigida', () => {
      // A segunda correção do professor: o mínimo vem do que o bimestre vale,
      // não da fatia já lançada. Com uma prova só, continua 3 — não 1.5.
      expect(passingThreshold(cincoMaisCinco, notas({ b1p1: 10 }), 'SUM')).toBe(3)
    })

    it('é 6 num bimestre que vale 10, com uma prova só corrigida', () => {
      // A turma padrão: pesos do bimestre somando 10. Exatamente o número que
      // o professor apontou.
      const bimestreDe10: GradedActivity[] = [
        { id: 'p1', bimester: 1, weight: 2.5 },
        { id: 'p2', bimester: 1, weight: 2.5 },
        { id: 'p3', bimester: 1, weight: 5 },
        { id: 'q1', bimester: 2, weight: 10 },
      ]
      expect(passingThreshold(bimestreDe10, notas({ p1: 10 }), 'AVERAGE')).toBe(3)
      // O 3 é no placar final (média dos dois bimestres); no bimestre em si
      // o mínimo é 6 — ver `projectedFinal`.
      expect(maxAttainable(bimestreDe10, notas({ p1: 10 }), 'AVERAGE')).toBe(5)
    })

    it('os dois cálculos do professor dão mínimos diferentes', () => {
      // Soma "5 + 5 = 10": o bimestre vale 5, mínimo 3.
      // Média "(10 + 10) / 2": o bimestre vale 10, mínimo 6.
      const soma: GradedActivity[] = [
        { id: 'a', bimester: 1, weight: 2.5 }, { id: 'b', bimester: 1, weight: 2.5 },
        { id: 'c', bimester: 2, weight: 2.5 }, { id: 'd', bimester: 2, weight: 2.5 },
      ]
      const media: GradedActivity[] = [
        { id: 'a', bimester: 1, weight: 5 }, { id: 'b', bimester: 1, weight: 5 },
        { id: 'c', bimester: 2, weight: 5 }, { id: 'd', bimester: 2, weight: 5 },
      ]

      expect(bimesterThreshold(soma, 1)).toBe(3)
      expect(bimesterThreshold(media, 1)).toBe(6)
      // Os dois fecham o semestre em 10, cada um pelo seu método.
      expect(maxAttainable(soma, notas({ a: 8, b: 8, c: 8, d: 8 }), 'SUM')).toBe(10)
      expect(maxAttainable(media, notas({ a: 8, b: 8, c: 8, d: 8 }), 'AVERAGE')).toBe(10)
    })

    it('a regra vale para qualquer configuração de turma', () => {
      const pesos = (total: number): GradedActivity[] => [
        { id: 'b1', bimester: 1, weight: total },
        { id: 'b2', bimester: 2, weight: total },
      ]
      // 60% do que o bimestre em andamento vale, seja ele 5, 10 ou 2.
      expect(passingThreshold(pesos(5), notas({ b1: 8 }), 'SUM')).toBe(3)
      expect(passingThreshold(pesos(10), notas({ b1: 8 }), 'SUM')).toBe(6)
      expect(passingThreshold(pesos(2), notas({ b1: 8 }), 'SUM')).toBe(1.2)
    })
  })

  describe('projectedFinal', () => {
    /** Turma padrão: o bimestre vale 10, repartido em três atividades. */
    const bimestreDe10: GradedActivity[] = [
      { id: 'p1', bimester: 1, weight: 2.5 },
      { id: 'p2', bimester: 1, weight: 2.5 },
      { id: 'p3', bimester: 1, weight: 5 },
      { id: 'q1', bimester: 2, weight: 10 },
    ]

    it('projeta a fração feita para o bimestre inteiro', () => {
      // 10 na única prova corrigida projeta 10 no bimestre, não 2.5.
      // Com AVERAGE e o 2º bimestre vazio, o placar fica em 5.
      expect(projectedFinal(bimestreDe10, notas({ p1: 10 }), 'AVERAGE')).toBe(5)
      expect(gradeStanding(bimestreDe10, notas({ p1: 10 }), 'AVERAGE')).toBe('EM_DIA')
    })

    it('o aluno precisa de 6 num bimestre que vale 10', () => {
      expect(gradeStanding(bimestreDe10, notas({ p1: 6 }), 'AVERAGE')).toBe('EM_DIA')
      expect(gradeStanding(bimestreDe10, notas({ p1: 5 }), 'AVERAGE')).toBe('EM_RISCO')
    })

    it('respeita o peso de cada atividade na projeção', () => {
      // 10 na prova de peso 5 e 0 na de peso 2.5: 2/3 do que foi corrigido.
      const projetado = projectedFinal(bimestreDe10, notas({ p3: 10, p1: 0 }), 'AVERAGE')
      expect(projetado).toBeCloseTo((10 * 5) / ((5 + 2.5) * 10) * 10 / 2, 2)
    })

    it('com o bimestre todo corrigido a projeção é a própria nota', () => {
      const todas = notas({ b1p1: 7, b1p2: 7, b2p1: 5, b2p2: 5 })
      const { final } = calculateGrades(cincoMaisCinco, todas, 'SUM')
      expect(projectedFinal(cincoMaisCinco, todas, 'SUM')).toBe(final)
    })

    it('é zero sem nota nenhuma', () => {
      expect(projectedFinal(cincoMaisCinco, [], 'SUM')).toBe(0)
    })
  })

  describe('isSemesterComplete', () => {
    it('não considera fechado com um bimestre só', () => {
      expect(isSemesterComplete(cincoMaisCinco, soB1(10))).toBe(false)
    })

    it('considera fechado com tudo lançado', () => {
      expect(isSemesterComplete(cincoMaisCinco, semestreTodo(7, 7))).toBe(true)
    })

    it('não considera fechado quando o 2º bimestre ainda não existe', () => {
      // Senão o aluno apareceria aprovado em março, antes de o professor
      // sequer cadastrar as atividades do segundo bimestre.
      const soComB1: GradedActivity[] = [
        { id: 'b1p1', bimester: 1, weight: 5 },
        { id: 'b1p2', bimester: 1, weight: 5 },
      ]
      expect(isSemesterComplete(soComB1, notas({ b1p1: 10, b1p2: 10 }))).toBe(false)
    })

    it('a AF não é exigida para fechar o semestre', () => {
      expect(isSemesterComplete(comAf, notas({
        'b1-prova': 7, 'b1-trab': 7, 'b2-prova': 7, 'b2-trab': 7,
      }))).toBe(true)
    })
  })

  describe('gradeStanding', () => {
    it('não marca em risco quem tirou o máximo no único bimestre corrigido', () => {
      // Era este o bug: com teto de 5, nem o aluno de nota 10 chegava a 6,
      // então a lista de risco acusava a turma inteira.
      expect(gradeStanding(cincoMaisCinco, soB1(10), 'SUM')).toBe('EM_DIA')
      expect(isGradeAtRisk(cincoMaisCinco, soB1(10), 'SUM')).toBe(false)
    })

    it('marca em dia exatamente no limiar', () => {
      // 6 nas duas provas dá B1 = 3, que é o mínimo proporcional.
      expect(gradeStanding(cincoMaisCinco, soB1(6), 'SUM')).toBe('EM_DIA')
    })

    it('marca em risco logo abaixo do limiar', () => {
      expect(gradeStanding(cincoMaisCinco, soB1(5), 'SUM')).toBe('EM_RISCO')
      expect(isGradeAtRisk(cincoMaisCinco, soB1(5), 'SUM')).toBe(true)
    })

    it('fecha em aprovado ou reprovado quando o semestre acaba', () => {
      expect(gradeStanding(cincoMaisCinco, semestreTodo(6, 6), 'SUM')).toBe('APROVADO')
      expect(gradeStanding(cincoMaisCinco, semestreTodo(4, 4), 'SUM')).toBe('REPROVADO')
    })

    it('não diz reprovado antes do fim do semestre', () => {
      // Com meio semestre pela frente, "reprovado" é informação errada.
      expect(gradeStanding(cincoMaisCinco, soB1(2), 'SUM')).toBe('EM_RISCO')
    })

    it('devolve SEM_NOTA quando nada foi lançado', () => {
      expect(gradeStanding(cincoMaisCinco, [], 'SUM')).toBe('SEM_NOTA')
      expect(isGradeAtRisk(cincoMaisCinco, [], 'SUM')).toBe(false)
    })

    it('reprovado entra na lista de risco', () => {
      expect(isGradeAtRisk(cincoMaisCinco, semestreTodo(4, 4), 'SUM')).toBe(true)
    })

    it('continua certo na turma de 10 + 10 com média', () => {
      const meio = notas({ 'b1-prova': 7, 'b1-trab': 7 })
      // Teto 5, limiar 3; a média final com um bimestre é 3.5.
      expect(passingThreshold(atividades, meio, 'AVERAGE')).toBe(3)
      expect(gradeStanding(atividades, meio, 'AVERAGE')).toBe('EM_DIA')
    })
  })

  describe('standingLabel', () => {
    it('dá um rótulo para cada situação', () => {
      expect(standingLabel('SEM_NOTA')).toBe('Sem nota')
      expect(standingLabel('EM_DIA')).toBe('Em dia')
      expect(standingLabel('EM_RISCO')).toBe('Em risco')
      expect(standingLabel('APROVADO')).toBe('Aprovado')
      expect(standingLabel('REPROVADO')).toBe('Reprovado')
    })
  })
})
