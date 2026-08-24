import { describe, expect, it } from 'vitest'
import { errorMessage, isPrismaErrorCode } from '../errors'

describe('errorMessage', () => {
  it('lê a mensagem de um Error', () => {
    expect(errorMessage(new Error('deu ruim'))).toBe('deu ruim')
  })

  it('aceita uma string lançada diretamente', () => {
    expect(errorMessage('falhou')).toBe('falhou')
  })

  it('lê a mensagem de um objeto que não é Error', () => {
    expect(errorMessage({ message: 'erro do prisma' })).toBe('erro do prisma')
  })

  it('devolve texto padrão para valores sem mensagem legível', () => {
    // Era exatamente o caso que o `catch (error: any)` escondia: `.message`
    // vinha undefined e o usuário via uma mensagem vazia.
    expect(errorMessage(null)).toBe('Erro inesperado.')
    expect(errorMessage(undefined)).toBe('Erro inesperado.')
    expect(errorMessage(42)).toBe('Erro inesperado.')
    expect(errorMessage({ code: 'P2002' })).toBe('Erro inesperado.')
    expect(errorMessage({ message: 123 })).toBe('Erro inesperado.')
  })
})

describe('isPrismaErrorCode', () => {
  it('reconhece o código informado', () => {
    expect(isPrismaErrorCode({ code: 'P2002' }, 'P2002')).toBe(true)
  })

  it('não confunde códigos diferentes', () => {
    expect(isPrismaErrorCode({ code: 'P2025' }, 'P2002')).toBe(false)
  })

  it('lida com valores que não são objetos', () => {
    expect(isPrismaErrorCode(null, 'P2002')).toBe(false)
    expect(isPrismaErrorCode('P2002', 'P2002')).toBe(false)
    expect(isPrismaErrorCode(new Error('x'), 'P2002')).toBe(false)
  })
})
