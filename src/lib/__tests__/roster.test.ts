import { describe, expect, it } from 'vitest'
import {
  ENROLLMENT_STATUS,
  isActiveEnrollment,
  normalizeStudentName,
  parseRosterName,
  planRosterSync,
  type EnrolledStudent,
  type RosterEntry,
} from '../roster'

describe('parseRosterName', () => {
  it('reconhece a marca na frente do nome, que é como o professor escreve', () => {
    expect(parseRosterName('(Trancado) JOSE DA SILVA')).toEqual({
      name: 'JOSE DA SILVA',
      locked: true,
    })
  })

  it('aceita as variações que aparecem na prática', () => {
    const casos = [
      '(Trancado) ANA SOUZA',
      '(TRANCADO) ANA SOUZA',
      '(trancado) ANA SOUZA',
      '(Trancada) ANA SOUZA',
      '[Trancado] ANA SOUZA',
      'ANA SOUZA (Trancado)',
      'ANA SOUZA - TRANCADO',
      'TRANCADO - ANA SOUZA',
      '( Trancado )  ANA  SOUZA',
    ]

    for (const caso of casos) {
      const resultado = parseRosterName(caso)
      expect(resultado.locked, caso).toBe(true)
      expect(normalizeStudentName(resultado.name), caso).toBe('ANA SOUZA')
    }
  })

  it('não tranca quem não tem a marca', () => {
    expect(parseRosterName('MARIA TRANCOSO LIMA')).toEqual({
      name: 'MARIA TRANCOSO LIMA',
      locked: false,
    })
    expect(parseRosterName('JOAO PEREIRA').locked).toBe(false)
  })

  it('exige delimitador: a palavra solta no meio do nome não tranca', () => {
    // Sem isso, um sobrenome infeliz trancaria o aluno sozinho.
    expect(parseRosterName('CARLOS TRANCADO SILVA').locked).toBe(false)
  })

  it('normaliza o espaçamento do nome limpo', () => {
    expect(parseRosterName('(Trancado)   PEDRO   ALVES  ').name).toBe('PEDRO ALVES')
  })

  it('não devolve nome vazio quando a célula só tem a marca', () => {
    const resultado = parseRosterName('(Trancado)')
    expect(resultado.name).not.toBe('')
  })
})

describe('normalizeStudentName', () => {
  it('ignora acento, caixa e espaço repetido', () => {
    expect(normalizeStudentName('José  da Silva')).toBe('JOSE DA SILVA')
    expect(normalizeStudentName('JOSÉ DA SILVA')).toBe('JOSE DA SILVA')
    expect(normalizeStudentName('  josé da silva  ')).toBe('JOSE DA SILVA')
  })

  it('não junta pessoas diferentes', () => {
    expect(normalizeStudentName('ANA SOUZA')).not.toBe(normalizeStudentName('ANA SOUSA'))
  })
})

describe('isActiveEnrollment', () => {
  it('considera ativo quem não tem status, por compatibilidade', () => {
    // As matrículas antigas foram criadas sem status.
    expect(isActiveEnrollment(null)).toBe(true)
    expect(isActiveEnrollment(undefined)).toBe(true)
    expect(isActiveEnrollment('ATIVO')).toBe(true)
  })

  it('tira da chamada quem trancou ou desistiu', () => {
    expect(isActiveEnrollment('INATIVO')).toBe(false)
    expect(isActiveEnrollment('DESISTENTE')).toBe(false)
  })
})

describe('planRosterSync', () => {
  const matricula = (
    name: string,
    extras: Partial<EnrolledStudent> = {}
  ): EnrolledStudent => ({
    enrollmentId: `enr-${name}`,
    studentId: `std-${name}`,
    name,
    rgm: null,
    status: null,
    ...extras,
  })

  const linha = (name: string, extras: Partial<RosterEntry> = {}): RosterEntry => ({
    name,
    rgm: '',
    locked: false,
    ...extras,
  })

  it('tranca quem a planilha marcou', () => {
    const plano = planRosterSync(
      [linha('ANA SOUZA', { locked: true }), linha('BRUNO LIMA')],
      [matricula('ANA SOUZA'), matricula('BRUNO LIMA')]
    )

    expect(plano.toLock.map(m => m.name)).toEqual(['ANA SOUZA'])
    expect(plano.toRemove).toEqual([])
  })

  it('não tranca de novo quem já está trancado', () => {
    const plano = planRosterSync(
      [linha('ANA SOUZA', { locked: true })],
      [matricula('ANA SOUZA', { status: ENROLLMENT_STATUS.INATIVO })]
    )

    expect(plano.toLock).toEqual([])
    expect(plano.toUnlock).toEqual([])
  })

  it('destranca quem voltou sem a marca', () => {
    const plano = planRosterSync(
      [linha('ANA SOUZA')],
      [matricula('ANA SOUZA', { status: ENROLLMENT_STATUS.INATIVO })]
    )

    expect(plano.toUnlock.map(m => m.name)).toEqual(['ANA SOUZA'])
  })

  it('preserva DESISTENTE, que a planilha não sabe expressar', () => {
    // O professor marcou à mão. A planilha da secretaria só diz trancado ou
    // nada — sobrescrever apagaria a avaliação dele.
    const plano = planRosterSync(
      [linha('ANA SOUZA')],
      [matricula('ANA SOUZA', { status: ENROLLMENT_STATUS.DESISTENTE })]
    )

    expect(plano.toUnlock).toEqual([])
    expect(plano.toLock).toEqual([])
    expect(plano.toRemove).toEqual([])
  })

  it('marca para remoção quem sumiu da planilha', () => {
    const plano = planRosterSync(
      [linha('ANA SOUZA')],
      [matricula('ANA SOUZA'), matricula('BRUNO LIMA')]
    )

    expect(plano.toRemove.map(m => m.name)).toEqual(['BRUNO LIMA'])
  })

  it('não remove quem está na planilha apenas com a marca de trancado', () => {
    // Esta é a diferença que o professor pediu: trancado continua na turma,
    // só sai da chamada.
    const plano = planRosterSync(
      [linha('BRUNO LIMA', { locked: true })],
      [matricula('BRUNO LIMA')]
    )

    expect(plano.toRemove).toEqual([])
    expect(plano.toLock.map(m => m.name)).toEqual(['BRUNO LIMA'])
  })

  it('casa pelo RGM mesmo quando o nome mudou na planilha', () => {
    // Correção de grafia na secretaria não pode virar "sumiu da planilha" e
    // apagar as notas do aluno.
    const plano = planRosterSync(
      [linha('ANA SOUSA', { rgm: '12345' })],
      [matricula('ANA SOUZA', { rgm: '12345' })]
    )

    expect(plano.toRemove).toEqual([])
  })

  it('casa pelo nome quando não há RGM dos dois lados', () => {
    const plano = planRosterSync([linha('José da Silva')], [matricula('JOSE DA SILVA')])

    expect(plano.toRemove).toEqual([])
  })

  it('a marca de trancado vence um DESISTENTE anterior', () => {
    const plano = planRosterSync(
      [linha('ANA SOUZA', { locked: true })],
      [matricula('ANA SOUZA', { status: ENROLLMENT_STATUS.DESISTENTE })]
    )

    expect(plano.toLock.map(m => m.name)).toEqual(['ANA SOUZA'])
  })

  it('turma inteira fora da planilha cai toda em toRemove', () => {
    // O caso perigoso: planilha errada ou parcial. O plano devolve tudo, e
    // quem decide se isso faz sentido é a tela de confirmação.
    const plano = planRosterSync(
      [linha('ALGUEM DE OUTRA TURMA')],
      [matricula('ANA SOUZA'), matricula('BRUNO LIMA'), matricula('CARLA DIAS')]
    )

    expect(plano.toRemove).toHaveLength(3)
  })
})
