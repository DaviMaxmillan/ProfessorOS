import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import type { Browser, BrowserContext, Page } from '@playwright/test'
import {
  SESSION_COOKIE,
  createSessionToken,
  passwordFingerprint,
} from '../src/lib/session'

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

/**
 * Contexto já autenticado, sem passar pelo formulário de login.
 *
 * O login tem um teto global de 30 tentativas a cada 15 minutos — uma proteção
 * real contra força bruta. Uma suíte que faz login a cada teste esbarra nesse
 * teto e os últimos testes falham por motivo nenhum a ver com o que verificam.
 *
 * Aqui a senha é gravada direto no banco e o cookie de sessão é assinado com a
 * mesma função que a aplicação usa, então a sessão é legítima: nada de
 * autenticação é contornado, apenas o formulário. Os testes que de fato
 * exercitam login, rate limit e primeiro acesso continuam passando por ele.
 */
export async function novoContextoAutenticado(browser: Browser): Promise<BrowserContext> {
  const hash = await bcrypt.hash(SENHA, 10)

  await db.settings.deleteMany()
  await db.settings.create({ data: { password: hash, theme: 'dark' } })

  const token = await createSessionToken(await passwordFingerprint(hash))

  const context = await novoContexto(browser)
  await context.addCookies([
    { name: SESSION_COOKIE, value: token, domain: '127.0.0.1', path: '/' },
  ])

  return context
}

// ---- Dados de apoio ----

export type TurmaDeTeste = {
  classId: string
  activityId: string
  /** enrollmentId por nome do aluno. */
  enrollmentIdPorNome: Record<string, string>
  /**
   * enrollmentIds na mesma ordem em que aparecem na tabela.
   *
   * A página ordena as matrículas por nome do aluno, que não é
   * necessariamente a ordem de criação — um teste que assuma a ordem de
   * criação para clicar numa linha acaba mexendo no aluno errado.
   */
  enrollmentIdsEmOrdemDeExibicao: string[]
}

/**
 * Monta uma turma completa direto no banco: instituição, semestre, disciplina,
 * turma, alunos matriculados e uma atividade avaliativa.
 *
 * Criar isso pela interface levaria dezenas de cliques e tornaria o teste
 * lento e frágil por motivos que não têm a ver com o que ele verifica.
 */
export async function criarTurmaDeTeste(
  nomesDosAlunos: string[],
  opcoes: { pesoDaAtividade?: number } = {}
): Promise<TurmaDeTeste> {
  const sufixo = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const institution = await db.institution.create({ data: { name: `Fatec Teste ${sufixo}` } })
  const semester = await db.semester.create({ data: { name: `Semestre Teste ${sufixo}` } })
  const subject = await db.subject.create({ data: { name: `Disciplina Teste ${sufixo}` } })

  const turma = await db.class.create({
    data: {
      institutionId: institution.id,
      semesterId: semester.id,
      subjectId: subject.id,
      turmaName: 'Turma de Teste',
      professor: 'Prof. Teste',
      calculationMethod: 'SUM',
    },
  })

  const enrollmentIdPorNome: Record<string, string> = {}
  let criados = 0
  for (const nome of nomesDosAlunos) {
    const student = await db.student.create({
      data: { name: nome, rgm: `${sufixo}-${criados}` },
    })
    const enrollment = await db.enrollment.create({
      data: { studentId: student.id, classId: turma.id },
    })
    enrollmentIdPorNome[nome] = enrollment.id
    criados++
  }

  const activity = await db.activity.create({
    data: {
      classId: turma.id,
      bimester: 1,
      name: 'Prova 1',
      weight: opcoes.pesoDaAtividade ?? 10,
    },
  })

  const enrollmentIdsEmOrdemDeExibicao = [...nomesDosAlunos]
    .sort((a, b) => a.localeCompare(b))
    .map(nome => enrollmentIdPorNome[nome])

  return {
    classId: turma.id,
    activityId: activity.id,
    enrollmentIdPorNome,
    enrollmentIdsEmOrdemDeExibicao,
  }
}

/** As notas gravadas para uma atividade, por enrollmentId. */
export async function notasDaAtividade(activityId: string): Promise<Record<string, number>> {
  const grades = await db.grade.findMany({ where: { activityId } })
  return Object.fromEntries(grades.map(g => [g.enrollmentId, g.value]))
}
