/**
 * Data Access Layer de autenticação.
 *
 * O proxy faz apenas a checagem otimista (assinatura + validade do cookie).
 * A verificação definitiva mora aqui, o mais perto possível dos dados: toda
 * Server Action e todo Route Handler chama `requireAuth()` antes de tocar no
 * banco. Assim uma requisição que não passe pelo proxy — ou um token emitido
 * antes de uma troca de senha — continua sendo barrada.
 */

import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import prisma from './prisma'
import {
  SESSION_COOKIE,
  passwordFingerprint,
  verifySessionToken,
  type SessionPayload,
} from './session'

/**
 * Valida a sessão do request atual. Memoizado com `cache` para que várias
 * chamadas dentro do mesmo render/ação não repitam a consulta ao banco.
 */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const payload = await verifySessionToken(token)
  if (!payload) return null

  // Checagem segura: a sessão precisa corresponder à senha vigente.
  const settings = await prisma.settings.findFirst({ select: { password: true } })
  if (!settings?.password) return null

  const expected = await passwordFingerprint(settings.password)
  if (payload.v !== expected) return null

  return payload
})

/**
 * Garante que o request está autenticado. Em Server Actions o redirect é
 * propagado para o cliente.
 *
 * O destino é /logout, e não /login, de propósito: chegar aqui sem sessão
 * significa que o cookie passou pela checagem otimista do proxy mas não vale
 * mais (senha trocada, por exemplo). Mandar direto para /login faria o proxy
 * ver a assinatura ainda válida e devolver o usuário ao dashboard, num loop.
 * /logout apaga o cookie antes de seguir para o login.
 */
export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession()
  if (!session) redirect('/logout')
  return session
}

/**
 * Variante para Route Handlers, onde um 401 é mais adequado que um redirect.
 */
export async function isAuthenticated(): Promise<boolean> {
  return (await getSession()) !== null
}
