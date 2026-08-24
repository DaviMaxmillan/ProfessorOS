/**
 * Sessão stateless assinada com HMAC-SHA256 (Web Crypto).
 *
 * O cookie antigo guardava a string fixa "authenticated", o que permitia a
 * qualquer pessoa forjar uma sessão pelo console do navegador. Agora o cookie
 * carrega um payload assinado: sem a AUTH_SECRET não é possível produzir um
 * token válido.
 *
 * Usa Web Crypto (disponível no runtime Node e no Edge) para que o mesmo módulo
 * possa ser importado tanto pelo proxy quanto pelas Server Actions.
 */

export const SESSION_COOKIE = 'auth_session'

/** 30 dias, em segundos. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30

/**
 * Segredo usado apenas em desenvolvimento quando AUTH_SECRET não está definida.
 * É fixo (e não aleatório) para que a sessão sobreviva a reinícios do `next dev`.
 */
const DEV_FALLBACK_SECRET = 'professor-os-dev-secret-nao-use-em-producao'

const encoder = new TextEncoder()

let warnedAboutDevSecret = false

function getSecret(): string {
  const secret = process.env.AUTH_SECRET

  if (secret && secret.length >= 32) return secret

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'AUTH_SECRET não definida (ou com menos de 32 caracteres). ' +
        'Gere uma com `openssl rand -base64 32` e configure a variável de ambiente.'
    )
  }

  if (!warnedAboutDevSecret) {
    warnedAboutDevSecret = true
    console.warn(
      '[auth] AUTH_SECRET não definida — usando segredo de desenvolvimento. ' +
        'Defina AUTH_SECRET no .env antes de publicar.'
    )
  }

  return DEV_FALLBACK_SECRET
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(value: string): Uint8Array | null {
  try {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='))
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  } catch {
    return null
  }
}

async function sign(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  return base64UrlEncode(new Uint8Array(signature))
}

/** Comparação em tempo constante: não vaza quantos caracteres bateram. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export type SessionPayload = {
  /** Sujeito da sessão. O sistema é single-user, então é sempre "admin". */
  sub: 'admin'
  /** Impressão digital da senha vigente — invalida sessões após troca de senha. */
  v: string
  /** Emitido em (segundos desde a época). */
  iat: number
  /** Expira em (segundos desde a época). */
  exp: number
}

/**
 * Deriva uma impressão digital curta do hash bcrypt da senha. Quando a senha
 * muda, o hash muda, a impressão digital muda e todas as sessões antigas param
 * de valer.
 */
export async function passwordFingerprint(passwordHash: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(passwordHash))
  return base64UrlEncode(new Uint8Array(digest)).slice(0, 16)
}

export async function createSessionToken(fingerprint: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const payload: SessionPayload = {
    sub: 'admin',
    v: fingerprint,
    iat: now,
    exp: now + SESSION_MAX_AGE,
  }

  const encodedPayload = base64UrlEncode(encoder.encode(JSON.stringify(payload)))
  const signature = await sign(encodedPayload)

  return `${encodedPayload}.${signature}`
}

/**
 * Valida assinatura e expiração do token. Retorna `null` para qualquer token
 * ausente, malformado, forjado ou vencido.
 */
export async function verifySessionToken(
  token: string | undefined | null
): Promise<SessionPayload | null> {
  if (!token) return null

  const parts = token.split('.')
  if (parts.length !== 2) return null

  const [encodedPayload, signature] = parts

  // Sem segredo configurado não há como validar nada: trata como não
  // autenticado em vez de derrubar toda requisição com um 500. Quem tentar
  // fazer login recebe a mensagem explicando o que configurar.
  let expected: string
  try {
    expected = await sign(encodedPayload)
  } catch {
    return null
  }
  if (!safeEqual(signature, expected)) return null

  const decoded = base64UrlDecode(encodedPayload)
  if (!decoded) return null

  let payload: SessionPayload
  try {
    payload = JSON.parse(new TextDecoder().decode(decoded))
  } catch {
    return null
  }

  if (payload?.sub !== 'admin' || typeof payload.exp !== 'number') return null
  if (payload.exp <= Math.floor(Date.now() / 1000)) return null

  return payload
}

/** Opções do cookie de sessão, usadas no login e no logout. */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: SESSION_MAX_AGE,
    path: '/',
  }
}
