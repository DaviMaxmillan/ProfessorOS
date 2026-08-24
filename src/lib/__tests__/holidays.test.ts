import { describe, expect, it } from 'vitest'
import { getHolidays, isHoliday } from '../holidays'

/** As datas do cronograma são criadas ao meio-dia UTC (veja actions/schedule.ts). */
function dataDeAula(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`)
}

describe('getHolidays — feriados fixos', () => {
  const feriados2026 = getHolidays(2026)
  const nomes = feriados2026.map(h => h.name)

  it('inclui os feriados nacionais', () => {
    expect(nomes).toContain('Natal')
    expect(nomes).toContain('Confraternização Universal')
    expect(nomes).toContain('Independência do Brasil')
    expect(nomes).toContain('Tiradentes')
  })

  it('inclui o feriado estadual de São Paulo', () => {
    expect(nomes).toContain('Revolução Constitucionalista')
  })

  it('inclui os feriados municipais de Franca', () => {
    expect(nomes).toContain('Aniversário de Franca')
  })

  it('devolve a lista ordenada por data', () => {
    const tempos = feriados2026.map(h => h.date.getTime())
    expect(tempos).toEqual([...tempos].sort((a, b) => a - b))
  })
})

describe('getHolidays — feriados móveis (dependem da Páscoa)', () => {
  // Datas conferidas em calendário: Páscoa 2026 = 5 de abril; 2027 = 28 de março.
  const casos: Array<[number, string]> = [
    [2024, '2024-03-31'],
    [2025, '2025-04-20'],
    [2026, '2026-04-05'],
    [2027, '2027-03-28'],
  ]

  it.each(casos)('calcula a Páscoa de %i corretamente', (ano, esperado) => {
    const pascoa = getHolidays(ano).find(h => h.name === 'Páscoa')!
    const iso = `${pascoa.date.getFullYear()}-${String(pascoa.date.getMonth() + 1).padStart(2, '0')}-${String(pascoa.date.getDate()).padStart(2, '0')}`
    expect(iso).toBe(esperado)
  })

  it('posiciona Carnaval 47 dias antes da Páscoa', () => {
    const feriados = getHolidays(2026)
    const pascoa = feriados.find(h => h.name === 'Páscoa')!
    const carnaval = feriados.find(h => h.name === 'Carnaval')!
    const dias = Math.round((pascoa.date.getTime() - carnaval.date.getTime()) / 86400000)
    expect(dias).toBe(47)
  })

  it('posiciona a Sexta-feira Santa 2 dias antes da Páscoa', () => {
    const feriados = getHolidays(2026)
    const pascoa = feriados.find(h => h.name === 'Páscoa')!
    const sexta = feriados.find(h => h.name.startsWith('Sexta-feira Santa'))!
    const dias = Math.round((pascoa.date.getTime() - sexta.date.getTime()) / 86400000)
    expect(dias).toBe(2)
  })

  it('posiciona Corpus Christi 60 dias depois da Páscoa', () => {
    const feriados = getHolidays(2026)
    const pascoa = feriados.find(h => h.name === 'Páscoa')!
    const corpus = feriados.find(h => h.name === 'Corpus Christi')!
    const dias = Math.round((corpus.date.getTime() - pascoa.date.getTime()) / 86400000)
    expect(dias).toBe(60)
  })
})

describe('isHoliday', () => {
  it('reconhece o Natal', () => {
    const r = isHoliday(dataDeAula('2026-12-25'))
    expect(r.isHoliday).toBe(true)
    expect(r.name).toBe('Natal')
  })

  it('reconhece um feriado móvel', () => {
    const r = isHoliday(dataDeAula('2026-04-03')) // Sexta-feira Santa de 2026
    expect(r.isHoliday).toBe(true)
    expect(r.name).toContain('Sexta-feira Santa')
  })

  it('não marca um dia comum como feriado', () => {
    const r = isHoliday(dataDeAula('2026-03-10'))
    expect(r.isHoliday).toBe(false)
    expect(r.name).toBeUndefined()
  })

  it('atravessa a virada do ano sem confundir o cálculo', () => {
    expect(isHoliday(dataDeAula('2026-01-01')).isHoliday).toBe(true)
    expect(isHoliday(dataDeAula('2025-12-31')).isHoliday).toBe(false)
  })
})
