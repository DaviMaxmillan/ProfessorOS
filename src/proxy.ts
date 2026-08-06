import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const session = request.cookies.get('auth_session')
  const { pathname } = request.nextUrl

  // Se não estiver logado e tentar acessar qualquer rota que não seja /login
  if (!session && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Se estiver logado e tentar acessar /login, redireciona para /dashboard
  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Se estiver logado e tentar acessar a raiz, redireciona para /dashboard
  if (session && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
