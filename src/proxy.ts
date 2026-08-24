import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session'

/**
 * Checagem otimista de sessão: valida a assinatura e a expiração do cookie sem
 * tocar no banco (o proxy roda em toda requisição, inclusive em prefetches).
 * A verificação definitiva fica no Data Access Layer — veja `src/lib/auth.ts`.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = await verifySessionToken(token)

  const isApiRoute = pathname.startsWith('/api')
  const isLoginRoute = pathname === '/login'

  // /logout limpa o cookie e sempre precisa passar, inclusive com uma sessão
  // que o proxy considera válida — é justamente como o Data Access Layer
  // encerra uma sessão obsoleta sem cair num loop de redirect.
  if (pathname === '/logout') return NextResponse.next()

  if (!session) {
    // Rotas de API respondem 401 em vez de redirecionar: um redirect para HTML
    // quebraria o `fetch` do cliente com um erro confuso.
    if (isApiRoute) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }

    if (!isLoginRoute) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Cookie presente porém inválido (forjado, expirado ou emitido com outro
    // segredo): limpa para o usuário não ficar preso num loop de redirect.
    if (token) {
      const response = NextResponse.next()
      response.cookies.delete(SESSION_COOKIE)
      return response
    }

    return NextResponse.next()
  }

  if (isLoginRoute || pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Roda em todas as rotas — inclusive /api, que antes ficava de fora e
     * expunha /api/search publicamente. Ficam de fora apenas os assets
     * estáticos, que não carregam dado nenhum:
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagens)
     * - arquivos com extensão em /public (favicon, ícones, imagens)
     */
    '/((?!_next/static|_next/image|.*\\.[\\w]+$).*)',
  ],
}
