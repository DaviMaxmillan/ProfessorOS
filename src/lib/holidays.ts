// Feriados Nacionais (Fixos)
const fixedNationalHolidays = [
  { month: 1, day: 1, name: 'Confraternização Universal' },
  { month: 4, day: 21, name: 'Tiradentes' },
  { month: 5, day: 1, name: 'Dia do Trabalho' },
  { month: 9, day: 7, name: 'Independência do Brasil' },
  { month: 10, day: 12, name: 'Nossa Senhora Aparecida' },
  { month: 11, day: 2, name: 'Finados' },
  { month: 11, day: 15, name: 'Proclamação da República' },
  { month: 11, day: 20, name: 'Dia Nacional de Zumbi e da Consciência Negra' },
  { month: 12, day: 25, name: 'Natal' }
]

// Feriados Estaduais SP (Fixos)
const fixedStateHolidays = [
  { month: 7, day: 9, name: 'Revolução Constitucionalista' }
]

// Feriados Municipais Franca/SP (Fixos)
const fixedLocalHolidays = [
  { month: 11, day: 28, name: 'Aniversário de Franca' },
  { month: 12, day: 8, name: 'Padroeira de Franca (Nossa Sra. da Conceição)' }
]

// Função para calcular a data da Páscoa (Algoritmo de Meeus/Jones/Butcher)
function getEasterDate(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1

  return new Date(year, month - 1, day)
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function getHolidays(year: number): { date: Date; name: string }[] {
  const holidays: { date: Date; name: string }[] = []

  // Adiciona feriados fixos
  const allFixed = [...fixedNationalHolidays, ...fixedStateHolidays, ...fixedLocalHolidays]
  for (const h of allFixed) {
    holidays.push({ date: new Date(year, h.month - 1, h.day), name: h.name })
  }

  // Calcula feriados móveis (baseados na Páscoa)
  const easter = getEasterDate(year)
  holidays.push({ date: easter, name: 'Páscoa' })
  holidays.push({ date: addDays(easter, -47), name: 'Carnaval' })
  holidays.push({ date: addDays(easter, -2), name: 'Sexta-feira Santa (Paixão de Cristo)' })
  holidays.push({ date: addDays(easter, 60), name: 'Corpus Christi' })

  // Ordena por data
  return holidays.sort((a, b) => a.date.getTime() - b.date.getTime())
}

export function isHoliday(date: Date): { isHoliday: boolean; name?: string } {
  const year = date.getFullYear()
  const holidays = getHolidays(year)

  // Ignorar timezone issues: compara apenas YYYY-MM-DD
  const dateString = date.toISOString().split('T')[0]

  const holiday = holidays.find(h => {
    // Normalizar a data do feriado para a meia-noite local para evitar discrepâncias
    // Format YYYY-MM-DD (fuso horário local ao criar)
    const y = h.date.getFullYear()
    const m = String(h.date.getMonth() + 1).padStart(2, '0')
    const d = String(h.date.getDate()).padStart(2, '0')
    const hString = `${y}-${m}-${d}`
    
    return hString === dateString
  })

  if (holiday) {
    return { isHoliday: true, name: holiday.name }
  }

  return { isHoliday: false }
}
