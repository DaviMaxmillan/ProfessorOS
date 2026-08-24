import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  SESSION_MAX_AGE,
  createSessionToken,
  passwordFingerprint,
  verifySessionToken,
} from '../session'

// A assinatura depende de AUTH_SECRET. Fixamos uma no ambiente de teste.
beforeEach(() => {
  vi.stubEnv('AUTH_SECRET', 'segredo-de-teste-com-mais-de-32-caracteres-aqui')
  vi.unstubAllGlobals()
})

const IMPRESSAO = 'impressao-digital-fake'

describe('createSessionToken / verifySessionToken', () => {
  it('aceita um token recém-emitido', async () => {
    const token = await createSessionToken(IMPRESSAO)
    const payload = await verifySessionToken(token)

    expect(payload).not.toBeNull()
    expect(payload!.sub).toBe('admin')
    expect(payload!.v).toBe(IMPRESSAO)
  })

  it('emite o token no formato payload.assinatura', async () => {
    const token = await createSessionToken(IMPRESSAO)
    expect(token.split('.')).toHaveLength(2)
  })

  it('nunca produz a string fixa do bypass antigo', async () => {
    const token = await createSessionToken(IMPRESSAO)
    expect(token).not.toBe('authenticated')
  })

  it('define a expiração 30 dias à frente', async () => {
    const token = await createSessionToken(IMPRESSAO)
    const payload = (await verifySessionToken(token))!
    expect(payload.exp - payload.iat).toBe(SESSION_MAX_AGE)
  })
})

describe('verifySessionToken — rejeições', () => {
  it('rejeita token ausente', async () => {
    expect(await verifySessionToken(undefined)).toBeNull()
    expect(await verifySessionToken(null)).toBeNull()
    expect(await verifySessionToken('')).toBeNull()
  })

  it('rejeita o cookie forjado do bypass antigo', async () => {
    expect(await verifySessionToken('authenticated')).toBeNull()
  })

  it('rejeita token sem as duas partes', async () => {
    expect(await verifySessionToken('so-uma-parte')).toBeNull()
    expect(await verifySessionToken('a.b.c')).toBeNull()
  })

  it('rejeita assinatura adulterada', async () => {
    const [payload, assinatura] = (await createSessionToken(IMPRESSAO)).split('.')
    const invertida = assinatura.split('').reverse().join('')
    expect(await verifySessionToken(`${payload}.${invertida}`)).toBeNull()
  })

  it('rejeita payload adulterado mantendo a assinatura original', async () => {
    const [payload, assinatura] = (await createSessionToken(IMPRESSAO)).split('.')

    const dados = JSON.parse(Buffer.from(payload, 'base64url').toString())
    dados.exp += 999_999 // tenta esticar a validade
    const forjado = Buffer.from(JSON.stringify(dados)).toString('base64url')

    expect(await verifySessionToken(`${forjado}.${assinatura}`)).toBeNull()
  })

  it('rejeita token assinado com outro segredo', async () => {
    const token = await createSessionToken(IMPRESSAO)

    vi.stubEnv('AUTH_SECRET', 'um-segredo-completamente-diferente-com-32-chars')
    expect(await verifySessionToken(token)).toBeNull()
  })

  it('rejeita token expirado', async () => {
    const agora = Date.now()
    const token = await createSessionToken(IMPRESSAO)

    // Avança o relógio para depois da expiração.
    vi.spyOn(Date, 'now').mockReturnValue(agora + (SESSION_MAX_AGE + 60) * 1000)
    expect(await verifySessionToken(token)).toBeNull()
    vi.restoreAllMocks()
  })

  it('rejeita base64 inválido no payload', async () => {
    const [, assinatura] = (await createSessionToken(IMPRESSAO)).split('.')
    expect(await verifySessionToken(`!!!nao-e-base64!!!.${assinatura}`)).toBeNull()
  })
})

describe('passwordFingerprint', () => {
  it('é estável para o mesmo hash de senha', async () => {
    const hash = '$2b$12$abcdefghijklmnopqrstuv'
    expect(await passwordFingerprint(hash)).toBe(await passwordFingerprint(hash))
  })

  it('muda quando a senha muda — é o que invalida sessões antigas', async () => {
    const antes = await passwordFingerprint('$2b$12$senha-antiga')
    const depois = await passwordFingerprint('$2b$12$senha-nova')
    expect(antes).not.toBe(depois)
  })

  it('não expõe o hash da senha', async () => {
    const hash = '$2b$12$hash-secreto-do-professor'
    const impressao = await passwordFingerprint(hash)
    expect(impressao).not.toContain('hash-secreto')
    expect(impressao).toHaveLength(16)
  })
})
