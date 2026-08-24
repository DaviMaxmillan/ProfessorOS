import { PrismaClient } from '@prisma/client'
import type { Browser, BrowserContext, Page } from '@playwright/test'

export const SENHA = 'senha-de-teste-2026'

/**
 * Acesso ao banco a partir dos testes, para preparar e conferir estado.
 * Usa o próprio Prisma em vez de chamar o psql por fora: não depende do
 * cliente de linha de comando estar instalado e não tem problema de
 * escapamento de aspas.
 */
export const db = new PrismaClient()

/**
 * O rate limit do login conta por IP. Cada contexto usa um IP próprio para que
 * um teste não bloqueie o seguinte.
 */
let ipSeq = 0
export async function novoContexto(browser: Browser): Promise<BrowserContext> {
  ipSeq++
  const context = await browser.newContext({
    extraHTTPHeaders: { 'x-forwarded-for': `198.51.100.${(ipSeq % 250) + 1}` },
  })

  // Bloqueia qualquer requisição para fora da aplicação.
  //
  // O globals.css importa fontes do Google. O `extraHTTPHeaders` acima vale
  // para todas as requisições do contexto, então esse cabeçalho ia junto para
  // o fonts.gstatic.com — o que transforma a busca da fonte numa requisição
  // CORS com preflight, que o CDN recusa. O console enchia de erros que não
  // são da aplicação e derrubavam o teste que verifica o console.
  //
  // Além de resolver isso, deixa os testes independentes de rede.
  await context.route('**/*', route => {
    const { hostname } = new URL(route.request().url())
    const local = hostname === '127.0.0.1' || hostname === 'localhost'
    return local ? route.continue() : route.abort()
  })

  return context
}

/** Volta o sistema ao estado de primeiro acesso. */
export async function limparSenha(): Promise<void> {
  await db.settings.deleteMany()
}

/** Simula uma troca de senha feita por fora da aplicação. */
export async function trocarSenhaNoBanco(novoHash: string): Promise<void> {
  await db.settings.updateMany({ data: { password: novoHash } })
}

/** Faz o cadastro inicial da senha mestre e entra. */
export async function cadastrarSenhaEEntrar(page: Page): Promise<void> {
  await page.goto('/login')
  await page.fill('#password', SENHA)
  await page.click('button[type=submit]')
  await page.waitForURL('**/dashboard')
}

/**
 * Espera o menu lateral responder a eventos antes de disparar atalhos de
 * teclado. Logo após o redirecionamento do login a marcação já está na tela,
 * mas o React ainda não terminou de hidratar — um Ctrl+K nesse intervalo se
 * perde, porque o listener ainda não foi registrado.
 */
export async function esperarInterface(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Busca Global/i }).waitFor({ state: 'visible' })
}

/** O campo da busca global, quando o painel está aberto. */
export function campoDeBusca(page: Page) {
  return page.getByPlaceholder('Buscar alunos, turmas...')
}

/**
 * Abre a busca global e devolve o campo já pronto para receber texto.
 *
 * O painel foca o campo com um setTimeout, então digitar "às cegas" logo após
 * o Ctrl+K perde os primeiros caracteres. Esperar o campo aparecer e escrever
 * nele torna o teste determinístico.
 */
export async function abrirBusca(page: Page) {
  await esperarInterface(page)
  await page.keyboard.press('Control+k')

  const campo = campoDeBusca(page)
  await campo.waitFor({ state: 'visible' })
  return campo
}

/** Entra com uma senha já cadastrada. */
export async function entrar(page: Page, senha = SENHA): Promise<void> {
  await page.goto('/login')
  await page.fill('#password', senha)
  await page.click('button[type=submit]')
}
