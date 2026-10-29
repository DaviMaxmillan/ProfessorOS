import { describe, expect, it } from 'vitest'
import {
  cellKey,
  changedActivityIds,
  changedCellKeys,
  changedCells,
  draftFromEnrollments,
  draftToPayload,
  type EnrollmentGrades,
} from '../gradeDraft'

const ATIVIDADES = ['prova1', 'prova2']

const turma: EnrollmentGrades[] = [
  { id: 'ana', grades: [{ activityId: 'prova1', value: 8 }] },
  { id: 'bruno', grades: [] },
  {
    id: 'carla',
    grades: [
      { activityId: 'prova1', value: 6 },
      { activityId: 'prova2', value: 10 },
    ],
  },
]

describe('draftFromEnrollments', () => {
  it('parte do que está no banco', () => {
    expect(draftFromEnrollments(turma)).toEqual({
      ana: { prova1: 8 },
      bruno: {},
      carla: { prova1: 6, prova2: 10 },
    })
  })

  it('inclui quem não tem nota nenhuma', () => {
    expect(draftFromEnrollments(turma)).toHaveProperty('bruno')
  })
})

describe('changedCells', () => {
  it('não acusa nada quando o rascunho é igual ao banco', () => {
    expect(changedCells(turma, ATIVIDADES, draftFromEnrollments(turma))).toEqual([])
  })

  it('acusa a nota digitada onde não havia', () => {
    const draft = draftFromEnrollments(turma)
    draft.bruno.prova1 = 7

    expect(changedCells(turma, ATIVIDADES, draft)).toEqual([
      { enrollmentId: 'bruno', activityId: 'prova1' },
    ])
  })

  it('acusa a nota trocada', () => {
    const draft = draftFromEnrollments(turma)
    draft.ana.prova1 = 9

    expect(changedCells(turma, ATIVIDADES, draft)).toEqual([
      { enrollmentId: 'ana', activityId: 'prova1' },
    ])
  })

  it('acusa a nota apagada', () => {
    // Apagar é uma alteração tanto quanto digitar: se não contasse como
    // pendente, a remoção nunca chegaria ao banco.
    const draft = draftFromEnrollments(turma)
    draft.carla.prova2 = null

    expect(changedCells(turma, ATIVIDADES, draft)).toEqual([
      { enrollmentId: 'carla', activityId: 'prova2' },
    ])
  })

  it('distingue zero de sem nota', () => {
    const draft = draftFromEnrollments(turma)
    draft.bruno.prova1 = 0

    expect(changedCells(turma, ATIVIDADES, draft)).toHaveLength(1)
  })

  it('enxerga a turma inteira lançada em várias atividades', () => {
    // O caso do professor: lançou tudo e salvou uma coluna só.
    const draft = draftFromEnrollments(turma)
    for (const aluno of ['ana', 'bruno', 'carla']) {
      draft[aluno].prova1 = 7
      draft[aluno].prova2 = 7
    }

    const alteradas = changedCells(turma, ATIVIDADES, draft)

    // 6 células, menos a prova1 da Carla que já valia 6... não: virou 7.
    // Só a prova1 da Ana (8 -> 7) e todas as outras mudam.
    expect(alteradas).toHaveLength(6)
    expect(changedActivityIds(alteradas).sort()).toEqual(['prova1', 'prova2'])
  })

  it('ignora matrícula que não está no rascunho', () => {
    expect(changedCells(turma, ATIVIDADES, { ana: { prova1: 8 } })).toEqual([])
  })
})

describe('changedActivityIds', () => {
  it('não repete a atividade', () => {
    const alteradas = [
      { enrollmentId: 'ana', activityId: 'prova1' },
      { enrollmentId: 'bruno', activityId: 'prova1' },
    ]

    expect(changedActivityIds(alteradas)).toEqual(['prova1'])
  })

  it('devolve vazio sem alterações', () => {
    expect(changedActivityIds([])).toEqual([])
  })
})

describe('draftToPayload', () => {
  it('manda só as atividades alteradas', () => {
    const draft = draftFromEnrollments(turma)
    draft.bruno.prova1 = 7

    const payload = draftToPayload(turma, changedCells(turma, ATIVIDADES, draft), draft)

    expect(Object.keys(payload)).toEqual(['prova1'])
  })

  it('manda a turma inteira dentro da atividade alterada', () => {
    // O retrato precisa ser completo: quem está sem nota vai como null, senão
    // uma nota apagada continuaria no banco.
    const draft = draftFromEnrollments(turma)
    draft.carla.prova2 = null

    const payload = draftToPayload(turma, changedCells(turma, ATIVIDADES, draft), draft)

    expect(payload.prova2).toEqual({ ana: null, bruno: null, carla: null })
  })

  it('preserva as notas das outras linhas da mesma atividade', () => {
    const draft = draftFromEnrollments(turma)
    draft.bruno.prova1 = 7

    const payload = draftToPayload(turma, changedCells(turma, ATIVIDADES, draft), draft)

    expect(payload.prova1).toEqual({ ana: 8, bruno: 7, carla: 6 })
  })

  it('não manda nada quando não há alteração', () => {
    const draft = draftFromEnrollments(turma)

    expect(draftToPayload(turma, [], draft)).toEqual({})
  })

  it('manda o zero digitado de propósito', () => {
    const draft = draftFromEnrollments(turma)
    draft.bruno.prova1 = 0

    const payload = draftToPayload(turma, changedCells(turma, ATIVIDADES, draft), draft)

    expect(payload.prova1.bruno).toBe(0)
  })
})

describe('changedCellKeys', () => {
  it('monta as chaves que a tela usa para destacar', () => {
    const chaves = changedCellKeys([{ enrollmentId: 'ana', activityId: 'prova1' }])

    expect(chaves.has(cellKey('ana', 'prova1'))).toBe(true)
    expect(chaves.has(cellKey('ana', 'prova2'))).toBe(false)
  })
})
