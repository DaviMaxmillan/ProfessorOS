'use server'

import { cookies, headers } from 'next/headers'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { checkRateLimit, resetRateLimit } from '@/lib/rateLimit'
import {
  SESSION_COOKIE,
  createSessionToken,
  passwordFingerprint,
  sessionCookieOptions,
} from '@/lib/session'

export type LoginState = { error: string } | undefined

/** Tentativas por IP dentro da janela. */
const ATTEMPT_LIMIT = 5
/** Teto global, caso o cabeçalho de IP não esteja disponível ou seja forjado. */
const GLOBAL_ATTEMPT_LIMIT = 30
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000

const MIN_PASSWORD_LENGTH = 8

async function clientIp(): Promise<string> {
  const headerList = await headers()
  const forwarded = headerList.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return headerList.get('x-real-ip')?.trim() || 'unknown'
}

/** Mensagem devolvida ao formulário quando AUTH_SECRET não está configurada. */
const CONFIG_ERROR =
  'O servidor está sem a variável AUTH_SECRET configurada, então não é possível ' +
  'criar uma sessão. Gere uma chave com `openssl rand -base64 32` e configure-a ' +
  'nas variáveis de ambiente do deploy.'

async function startSession(passwordHash: string): Promise<void> {
  const token = await createSessionToken(await passwordFingerprint(passwordHash))
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions())
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const password = formData.get('password')

  if (typeof password !== 'string' || !password) {
    return { error: 'A senha é obrigatória.' }
  }

  const ip = await clientIp()
  const perIp = checkRateLimit(`login:${ip}`, ATTEMPT_LIMIT, ATTEMPT_WINDOW_MS)
  const global = checkRateLimit('login:global', GLOBAL_ATTEMPT_LIMIT, ATTEMPT_WINDOW_MS)

  if (!perIp.allowed || !global.allowed) {
    const wait = Math.max(perIp.retryAfterSeconds, global.retryAfterSeconds)
    const minutes = Math.ceil(wait / 60)
    return {
      error: `Muitas tentativas de login. Tente novamente em ${minutes} minuto${
        minutes > 1 ? 's' : ''
      }.`,
    }
  }

  const settings = await prisma.settings.findFirst()

  // Primeiro acesso: ainda não existe senha configurada. Um registro de
  // Settings criado por outra parte do sistema (tema, por exemplo) pode existir
  // com a senha vazia — nesse caso também estamos no fluxo de configuração.
  if (!settings?.password) {
    if (password.length < MIN_PASSWORD_LENGTH) {
      return {
        error: `A senha mestre precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    if (settings) {
      await prisma.settings.update({
        where: { id: settings.id },
        data: { password: hashedPassword },
      })
    } else {
      await prisma.settings.create({ data: { password: hashedPassword } })
    }

    resetRateLimit(`login:${ip}`)
    try {
      await startSession(hashedPassword)
    } catch {
      return { error: CONFIG_ERROR }
    }
  } else {
    const isValid = await bcrypt.compare(password, settings.password)

    if (!isValid) {
      const remaining = Math.min(perIp.remaining, global.remaining)
      return {
        error:
          remaining > 0 && remaining <= 2
            ? `Senha incorreta. ${remaining} tentativa${
                remaining > 1 ? 's' : ''
              } restante${remaining > 1 ? 's' : ''}.`
            : 'Senha incorreta.',
      }
    }

    resetRateLimit(`login:${ip}`)
    try {
      await startSession(settings.password)
    } catch {
      return { error: CONFIG_ERROR }
    }
  }

  redirect('/dashboard')
}

export async function checkHasPassword(): Promise<boolean> {
  const settings = await prisma.settings.findFirst({ select: { password: true } })
  return !!settings?.password
}

export async function logoutAction() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  redirect('/login')
}
