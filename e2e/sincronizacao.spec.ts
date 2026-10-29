import { expect, test, type Page } from '@playwright/test'
import {
  criarTurmaDeTeste,
  db,
  matriculasDaTurma,
  novoContextoAutenticado,
  planilhaDeAlunos,
  type TurmaDeTeste,
} from './helpers'

/**
 * Abre a tela de sincronização já com a turma do teste escolhida.
 *
 * O `select` lista todas as turmas do banco, e os testes rodam em sequência no
 * mesmo banco — escolher pelo id evita pegar a turma de outro teste.
 */
async function abrirSincronizacao(page: Page, classId: string) {
  await page.goto('/dashboard/import')
  await page.locator('select').selectOption(classId)
}

async function enviarPlanilha(
  page: Page,
  linhas: { nome: string; rgm?: string }[]
) {
  await page.locator('input[type=file]').waitFor({ state: 'attached' })
  await page.locator('input[type=file]').setInputFiles({
    name: 'alunos.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: planilhaDeAlunos(linhas),
  })
  await page.getByRole('button', { name: /Iniciar Sincronização/i }).click()
}

const ALUNOS = ['ANA PRIMEIRA', 'BRUNO SEGUNDO', 'CARLA TERCEIRA']

/**
 * Uma linha de planilha para um aluno da turma, com o RGM dele.
 *
 * O RGM é o que a planilha da instituição traz, e é como a sincronização
 * identifica o aluno. Sem ele a busca cai no nome, e o banco de teste acumula
 * dezenas de homônimos de execuções anteriores — o aluno encontrado seria
 * outro.
 */
function linhaDe(turma: TurmaDeTeste, nome: string, prefixo = '') {
  return { nome: `${prefixo}${nome}`, rgm: turma.rgmPorNome[nome] }
}

/** O painel de confirmação da remoção, para não casar com o texto da mensagem. */
function avisoDeRemocao(page: Page) {
  return page.getByTestId('remocoes-pendentes')
}

test.describe('Sincronização da planilha', () => {
  test('"(Trancado)" na planilha tranca a matrícula e tira o aluno da chamada', async ({ browser }) => {
    const turma = await criarTurmaDeTeste(ALUNOS)

    const ctx = await novoContextoAutenticado(browser)
    const page = await ctx.newPage()
    await abrirSincronizacao(page, turma.classId)

    await enviarPlanilha(page, [
      linhaDe(turma, 'ANA PRIMEIRA'),
      linhaDe(turma, 'BRUNO SEGUNDO', '(Trancado) '),
      linhaDe(turma, 'CARLA TERCEIRA'),
    ])

    await expect(page.getByText(/Trancados pela planilha:\s*1/i)).toBeVisible()

    const matriculas = await matriculasDaTurma(turma.classId)
    expect(matriculas['BRUNO SEGUNDO'].status).toBe('INATIVO')
    expect(matriculas['ANA PRIMEIRA'].status).toBeNull()
    // O nome é guardado limpo: com a marca junto, o aluno nunca mais bateria
    // com a planilha depois de destrancar.
    expect(matriculas['(Trancado) BRUNO SEGUNDO']).toBeUndefined()

    // E some da chamada. O locator é escopado na tabela da aba: o nome do
    // aluno também aparece na aba "Alunos", que fica montada ao lado.
    await page.goto(`/dashboard/classes/${turma.classId}`)
    await page.getByRole('button', { name: /Frequência Provisória/i }).click()
    const chamada = page.locator('table.print-table tbody')
    await expect(chamada.getByRole('cell', { name: 'ANA PRIMEIRA' })).toBeVisible()
    await expect(chamada.getByRole('cell', { name: 'BRUNO SEGUNDO' })).toHaveCount(0)
    await expect(chamada.getByRole('cell', { name: 'CARLA TERCEIRA' })).toBeVisible()

    await ctx.close()
  })

  test('tirar a marca da planilha devolve o aluno para a chamada', async ({ browser }) => {
    const turma = await criarTurmaDeTeste(ALUNOS)

    const ctx = await novoContextoAutenticado(browser)
    const page = await ctx.newPage()
    await abrirSincronizacao(page, turma.classId)

    await enviarPlanilha(page, [
      linhaDe(turma, 'ANA PRIMEIRA'),
      linhaDe(turma, 'BRUNO SEGUNDO', '(Trancado) '),
      linhaDe(turma, 'CARLA TERCEIRA'),
    ])
    await expect(page.getByText(/Trancados pela planilha:\s*1/i)).toBeVisible()

    await page.reload()
    await page.locator('select').selectOption(turma.classId)
    await enviarPlanilha(page, ALUNOS.map(nome => linhaDe(turma, nome)))

    await expect(page.getByText(/Destrancados:\s*1/i)).toBeVisible()
    expect((await matriculasDaTurma(turma.classId))['BRUNO SEGUNDO'].status).toBe('ATIVO')

    await ctx.close()
  })

  test('aluno fora da planilha não é apagado sem confirmação', async ({ browser }) => {
    // A remoção apaga notas e chamadas em cascata. Uma planilha incompleta não
    // pode destruir o semestre do aluno num clique.
    const turma = await criarTurmaDeTeste(ALUNOS)
    await db.grade.create({
      data: {
        enrollmentId: turma.enrollmentIdPorNome['CARLA TERCEIRA'],
        activityId: turma.activityId,
        value: 9,
      },
    })

    const ctx = await novoContextoAutenticado(browser)
    const page = await ctx.newPage()
    await abrirSincronizacao(page, turma.classId)

    await enviarPlanilha(page, [
      linhaDe(turma, 'ANA PRIMEIRA'),
      linhaDe(turma, 'BRUNO SEGUNDO'),
    ])

    await expect(avisoDeRemocao(page).getByText(/1 aluno não consta na planilha/i)).toBeVisible()
    // A tela diz o que se perde: a nota lançada da Carla.
    const linha = page.getByRole('row').filter({ hasText: 'CARLA TERCEIRA' })
    await expect(linha).toBeVisible()
    await expect(linha.getByText('1', { exact: true }).first()).toBeVisible()

    // Nada foi apagado.
    expect(Object.keys(await matriculasDaTurma(turma.classId))).toHaveLength(3)

    await ctx.close()
  })

  test('"Manter todos" fecha o aviso sem apagar ninguém', async ({ browser }) => {
    const turma = await criarTurmaDeTeste(ALUNOS)

    const ctx = await novoContextoAutenticado(browser)
    const page = await ctx.newPage()
    await abrirSincronizacao(page, turma.classId)

    await enviarPlanilha(page, [linhaDe(turma, 'ANA PRIMEIRA')])
    await expect(avisoDeRemocao(page).getByText(/2 alunos não constam na planilha/i)).toBeVisible()

    await page.getByRole('button', { name: /Manter todos/i }).click()
    await expect(avisoDeRemocao(page)).toHaveCount(0)

    expect(Object.keys(await matriculasDaTurma(turma.classId))).toHaveLength(3)

    await ctx.close()
  })

  test('confirmar remove o aluno e o que estava ligado a ele', async ({ browser }) => {
    const turma = await criarTurmaDeTeste(ALUNOS)
    const carla = turma.enrollmentIdPorNome['CARLA TERCEIRA']
    await db.grade.create({
      data: { enrollmentId: carla, activityId: turma.activityId, value: 9 },
    })
    await db.attendanceRecord.create({
      data: { enrollmentId: carla, date: new Date('2026-03-10T00:00:00.000Z'), present: false },
    })

    const ctx = await novoContextoAutenticado(browser)
    const page = await ctx.newPage()
    await abrirSincronizacao(page, turma.classId)

    await enviarPlanilha(page, [
      linhaDe(turma, 'ANA PRIMEIRA'),
      linhaDe(turma, 'BRUNO SEGUNDO'),
    ])
    await expect(avisoDeRemocao(page).getByText(/1 aluno não consta na planilha/i)).toBeVisible()

    await page.getByRole('button', { name: /Confirmar e remover/i }).click()
    await expect(page.getByText(/Removidos da turma:\s*1/i)).toBeVisible()

    const matriculas = await matriculasDaTurma(turma.classId)
    expect(Object.keys(matriculas)).toHaveLength(2)
    expect(matriculas['CARLA TERCEIRA']).toBeUndefined()

    // A cascata levou nota e chamada junto — era o que a tela avisou.
    expect(await db.grade.count({ where: { enrollmentId: carla } })).toBe(0)
    expect(await db.attendanceRecord.count({ where: { enrollmentId: carla } })).toBe(0)

    // Os outros ficaram intactos.
    expect(matriculas['ANA PRIMEIRA']).toBeDefined()
    expect(matriculas['BRUNO SEGUNDO']).toBeDefined()

    await ctx.close()
  })

  test('aluno só trancado na planilha não entra na lista de remoção', async ({ browser }) => {
    // A diferença entre as duas regras: a marca mantém o aluno na turma.
    const turma = await criarTurmaDeTeste(ALUNOS)

    const ctx = await novoContextoAutenticado(browser)
    const page = await ctx.newPage()
    await abrirSincronizacao(page, turma.classId)

    await enviarPlanilha(page, [
      linhaDe(turma, 'ANA PRIMEIRA'),
      linhaDe(turma, 'BRUNO SEGUNDO', '(Trancado) '),
      linhaDe(turma, 'CARLA TERCEIRA', '(Trancado) '),
    ])

    await expect(page.getByText(/Trancados pela planilha:\s*2/i)).toBeVisible()
    await expect(page.getByText(/não consta/i)).toHaveCount(0)
    expect(Object.keys(await matriculasDaTurma(turma.classId))).toHaveLength(3)

    await ctx.close()
  })

  test('aluno novo na planilha continua sendo cadastrado', async ({ browser }) => {
    // O comportamento que já existia não pode ter mudado.
    const turma = await criarTurmaDeTeste(['ANA PRIMEIRA'])

    const ctx = await novoContextoAutenticado(browser)
    const page = await ctx.newPage()
    await abrirSincronizacao(page, turma.classId)

    await enviarPlanilha(page, [
      linhaDe(turma, 'ANA PRIMEIRA'),
      { nome: `DANIEL QUARTO ${Date.now()}`, rgm: `rgm-novo-${Date.now()}` },
    ])

    await expect(page.getByText(/Novos alunos cadastrados:\s*1/i)).toBeVisible()
    expect(Object.keys(await matriculasDaTurma(turma.classId))).toHaveLength(2)

    await ctx.close()
  })
})
