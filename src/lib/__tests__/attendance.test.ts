import { describe, expect, it } from 'vitest'
import {
  MIN_CALLS_FOR_RISK,
  attendanceDate,
  attendanceDateKey,
  attendanceForDate,
  frequencyPercent,
  hasAttendanceForDate,
  isAbsenceAtRisk,
  isBelowMinFrequency,
  summarizeAttendance,
  todayLocalDate,
  type AttendanceEntry,
} from '../attendance'

/** Atalho: uma sequência de chamadas, `true` = presente. */
function chamadas(presencas: boolean[]): AttendanceEntry[] {
  return presencas.map((present, i) => ({
    date: new Date(Date.UTC(2026, 9, i + 1)),
    present,
  }))
}

describe('summarizeAttendance', () => {
  it('conta presenças, faltas e frequência', () => {
    const resumo = summarizeAttendance(chamadas([true, true, false, true]))

    expect(resumo.calls).toBe(4)
    expect(resumo.presences).toBe(3)
    expect(resumo.absences).toBe(1)
    expect(resumo.frequency).toBeCloseTo(0.75)
  })

  it('devolve frequência nula quando não houve chamada', () => {
    const resumo = summarizeAttendance([])

    expect(resumo.calls).toBe(0)
    expect(resumo.absences).toBe(0)
    // Nulo, e não 100%: "nenhuma chamada feita" é diferente de "todos
    // presentes". A planilha mostrava 100% para turmas sem chamada nenhuma.
    expect(resumo.frequency).toBeNull()
  })

  it('conta a chamada em que o aluno faltou a tudo', () => {
    const resumo = summarizeAttendance(chamadas([false, false]))

    expect(resumo.presences).toBe(0)
    expect(resumo.absences).toBe(2)
    expect(resumo.frequency).toBe(0)
  })
})

describe('isAbsenceAtRisk', () => {
  it('não sinaliza risco antes de haver chamadas suficientes', () => {
    // Faltou na única aula registrada: 0% de frequência, mas uma chamada só
    // não diz nada sobre o semestre.
    const resumo = summarizeAttendance(chamadas([false]))

    expect(resumo.frequency).toBe(0)
    expect(isAbsenceAtRisk(resumo)).toBe(false)
  })

  it('sinaliza quando a frequência fica abaixo de 75% com histórico', () => {
    // 5 chamadas, 2 faltas: 60%.
    const resumo = summarizeAttendance(chamadas([true, true, true, false, false]))

    expect(resumo.calls).toBeGreaterThanOrEqual(MIN_CALLS_FOR_RISK)
    expect(isAbsenceAtRisk(resumo)).toBe(true)
  })

  it('não sinaliza exatamente em 75%', () => {
    const resumo = summarizeAttendance(chamadas([true, true, true, false]))

    expect(resumo.frequency).toBeCloseTo(0.75)
    expect(isAbsenceAtRisk(resumo)).toBe(false)
  })

  it('não sinaliza sem chamada nenhuma', () => {
    expect(isAbsenceAtRisk(summarizeAttendance([]))).toBe(false)
  })
})

describe('isBelowMinFrequency', () => {
  it('é o fato puro, sem piso de chamadas', () => {
    // Uma chamada só, e o aluno faltou: a planilha mostra 0% ao lado, então
    // dizer "Regular" aqui contradiria a célula vizinha.
    const resumo = summarizeAttendance(chamadas([false]))

    expect(isBelowMinFrequency(resumo)).toBe(true)
    expect(isAbsenceAtRisk(resumo)).toBe(false)
  })

  it('não acusa em 75% exatos', () => {
    expect(isBelowMinFrequency(summarizeAttendance(chamadas([true, true, true, false])))).toBe(false)
  })

  it('não acusa sem chamada nenhuma', () => {
    expect(isBelowMinFrequency(summarizeAttendance([]))).toBe(false)
  })
})

describe('attendanceDate', () => {
  it('converte a data do formulário em meia-noite UTC', () => {
    expect(attendanceDate('2026-10-29')?.toISOString()).toBe('2026-10-29T00:00:00.000Z')
  })

  it('rejeita o que não é data', () => {
    expect(attendanceDate('29/10/2026')).toBeNull()
    expect(attendanceDate('')).toBeNull()
    expect(attendanceDate('2026-13-45')).toBeNull()
  })
})

describe('todayLocalDate', () => {
  /**
   * `en-CA` formata em `YYYY-MM-DD` no fuso local — é uma segunda opinião
   * independente da implementação, e vale em qualquer fuso. Comparar com
   * `toISOString()` não valeria: num runner em UTC as duas respostas coincidem
   * e o teste passaria sem testar nada.
   */
  const dataLocal = (d: Date) => d.toLocaleDateString('en-CA')

  it('usa o fuso de quem está usando, não UTC', () => {
    // Aula noturna: 21h30 no horário de Brasília já é o dia seguinte em UTC.
    // A chamada precisa ficar no dia em que a aula aconteceu.
    const aulaNoturna = new Date('2026-10-29T21:30:00-03:00')

    expect(todayLocalDate(aulaNoturna)).toBe(dataLocal(aulaNoturna))
  })

  it('concorda com o fuso local na virada do dia', () => {
    for (const iso of [
      '2026-10-29T23:59:00-03:00',
      '2026-10-30T00:01:00-03:00',
      '2026-01-01T02:00:00+09:00',
      '2026-12-31T22:00:00-05:00',
    ]) {
      const momento = new Date(iso)
      expect(todayLocalDate(momento)).toBe(dataLocal(momento))
    }
  })

  it('preenche mês e dia com zero à esquerda', () => {
    // Construído com componentes locais, então não depende do fuso do runner.
    expect(todayLocalDate(new Date(2026, 0, 5, 12))).toBe('2026-01-05')
  })
})

describe('attendanceDateKey', () => {
  it('normaliza Date e string para YYYY-MM-DD', () => {
    expect(attendanceDateKey(new Date('2026-10-29T00:00:00.000Z'))).toBe('2026-10-29')
    expect(attendanceDateKey('2026-10-29T00:00:00.000Z')).toBe('2026-10-29')
    expect(attendanceDateKey('2026-10-29')).toBe('2026-10-29')
  })

  it('devolve vazio para entrada inválida', () => {
    expect(attendanceDateKey(new Date('nada'))).toBe('')
    expect(attendanceDateKey('ontem')).toBe('')
  })
})

describe('attendanceForDate', () => {
  const matriculas = [
    {
      id: 'ana',
      attendances: [
        { date: new Date('2026-10-28T00:00:00.000Z'), present: true },
        { date: new Date('2026-10-29T00:00:00.000Z'), present: true },
      ],
    },
    {
      id: 'bruno',
      attendances: [{ date: new Date('2026-10-29T00:00:00.000Z'), present: false }],
    },
    { id: 'carla', attendances: [] },
  ]

  it('devolve a chamada da data pedida', () => {
    expect(attendanceForDate(matriculas, '2026-10-29')).toEqual({
      ana: true,
      bruno: false,
    })
  })

  it('omite quem não tem registro na data, em vez de assumir presente', () => {
    const chamada = attendanceForDate(matriculas, '2026-10-29')

    // Carla não aparece: a aba decide o padrão dela, e assim dá para
    // distinguir "faltou" de "nunca foi chamado".
    expect('carla' in chamada).toBe(false)
  })

  it('não mistura datas', () => {
    expect(attendanceForDate(matriculas, '2026-10-28')).toEqual({ ana: true })
    expect(attendanceForDate(matriculas, '2026-10-30')).toEqual({})
  })
})

describe('hasAttendanceForDate', () => {
  const matriculas = [
    { attendances: [{ date: new Date('2026-10-29T00:00:00.000Z'), present: true }] },
    { attendances: [] },
  ]

  it('reconhece a data que já tem chamada salva', () => {
    expect(hasAttendanceForDate(matriculas, '2026-10-29')).toBe(true)
  })

  it('reconhece a data sem chamada', () => {
    expect(hasAttendanceForDate(matriculas, '2026-10-30')).toBe(false)
    expect(hasAttendanceForDate([{ attendances: [] }], '2026-10-29')).toBe(false)
  })
})

describe('frequencyPercent', () => {
  it('arredonda em uma casa', () => {
    expect(frequencyPercent(summarizeAttendance(chamadas([true, true, false])))).toBe(66.7)
  })

  it('devolve nulo sem chamada', () => {
    expect(frequencyPercent(summarizeAttendance([]))).toBeNull()
  })
})
