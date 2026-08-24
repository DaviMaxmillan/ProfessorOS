import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { checkRateLimit, resetRateLimit } from '../rateLimit'

const JANELA = 15 * 60 * 1000
const LIMITE = 5

// Cada teste usa uma chave própria: o store é um módulo compartilhado.
let contador = 0
function chave() {
  contador++
  return `teste:${contador}:${Math.random()}`
}

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

describe('checkRateLimit', () => {
  it('permite tentativas até o limite', () => {
    const k = chave()
    for (let i = 0; i < LIMITE; i++) {
      expect(checkRateLimit(k, LIMITE, JANELA).allowed).toBe(true)
    }
  })

  it('bloqueia a tentativa seguinte ao limite', () => {
    const k = chave()
    for (let i = 0; i < LIMITE; i++) checkRateLimit(k, LIMITE, JANELA)

    const r = checkRateLimit(k, LIMITE, JANELA)
    expect(r.allowed).toBe(false)
    expect(r.remaining).toBe(0)
    expect(r.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('informa quantas tentativas ainda restam', () => {
    const k = chave()
    expect(checkRateLimit(k, LIMITE, JANELA).remaining).toBe(4)
    expect(checkRateLimit(k, LIMITE, JANELA).remaining).toBe(3)
    expect(checkRateLimit(k, LIMITE, JANELA).remaining).toBe(2)
  })

  it('libera de novo depois que a janela passa', () => {
    const k = chave()
    for (let i = 0; i < LIMITE; i++) checkRateLimit(k, LIMITE, JANELA)
    expect(checkRateLimit(k, LIMITE, JANELA).allowed).toBe(false)

    vi.advanceTimersByTime(JANELA + 1000)
    expect(checkRateLimit(k, LIMITE, JANELA).allowed).toBe(true)
  })

  it('continua bloqueado antes de a janela fechar', () => {
    const k = chave()
    for (let i = 0; i < LIMITE; i++) checkRateLimit(k, LIMITE, JANELA)

    vi.advanceTimersByTime(JANELA - 5000)
    expect(checkRateLimit(k, LIMITE, JANELA).allowed).toBe(false)
  })

  it('conta cada chave separadamente — um IP não bloqueia outro', () => {
    const ipA = chave()
    const ipB = chave()

    for (let i = 0; i < LIMITE; i++) checkRateLimit(ipA, LIMITE, JANELA)
    expect(checkRateLimit(ipA, LIMITE, JANELA).allowed).toBe(false)
    expect(checkRateLimit(ipB, LIMITE, JANELA).allowed).toBe(true)
  })

  it('retryAfterSeconds nunca é zero quando bloqueado', () => {
    const k = chave()
    for (let i = 0; i < LIMITE; i++) checkRateLimit(k, LIMITE, JANELA)

    vi.advanceTimersByTime(JANELA - 10)
    const r = checkRateLimit(k, LIMITE, JANELA)
    expect(r.allowed).toBe(false)
    expect(r.retryAfterSeconds).toBeGreaterThanOrEqual(1)
  })
})

describe('resetRateLimit', () => {
  it('zera o contador após um login bem-sucedido', () => {
    const k = chave()
    for (let i = 0; i < LIMITE; i++) checkRateLimit(k, LIMITE, JANELA)
    expect(checkRateLimit(k, LIMITE, JANELA).allowed).toBe(false)

    resetRateLimit(k)
    expect(checkRateLimit(k, LIMITE, JANELA).allowed).toBe(true)
  })
})
