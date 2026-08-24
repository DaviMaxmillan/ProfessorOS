import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/session'

/**
 * Encerra a sessão e devolve o usuário para o login.
 *
 * Existe como Route Handler porque só aqui é possível apagar um cookie durante
 * uma navegação — Server Components não podem escrever cookies. É para onde o
 * `requireAuth()` manda o usuário quando o cookie tem assinatura válida mas a
 * sessão não vale mais (por exemplo, após uma troca de senha): sem apagar o
 * cookie, o proxy veria uma assinatura boa, devolveria o usuário ao dashboard,
 * a página rejeitaria de novo, e o navegador ficaria preso num loop.
 */
export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', request.url))
  response.cookies.delete(SESSION_COOKIE)
  return response
}
