import { redirect } from 'next/navigation'

/**
 * A raiz não tem tela própria: o sistema começa no painel.
 *
 * O `proxy.ts` já redireciona `/` antes de chegar aqui (para `/dashboard` com
 * sessão, para `/login` sem). Este redirect existe como rede de segurança:
 * se um dia aquela regra mudar, a raiz continua indo para o lugar certo em vez
 * de cair numa página em branco.
 */
export default function Home() {
  redirect('/dashboard')
}
