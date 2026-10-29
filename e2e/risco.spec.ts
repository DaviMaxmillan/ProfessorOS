import { expect, test, type Page } from '@playwright/test'
import { criarTurmaDeTeste, db, novoContextoAutenticado } from './helpers'

/**
 * Abre o relatório de uma turma.
 *
 * As asserções ficam aqui, e não na lista do painel inicial: aquela lista é
 * global, mostra só os 8 primeiros e o banco de teste acumula centenas de
 * alunos de execuções anteriores — um aluno novo não apareceria nela de forma
 * determinística.
 */
async function abrirRelatorio(page: Page, classId: string) {
  await page.goto('/dashboard/reports')
  await page.locator('select').first().selectOption(classId)
  await expect(page.getByText(/Detalhamento por Aluno/i)).toBeVisible()
}

/**
 * A turma do professor: "5 + 5 = 10".
 *
 * Cada bimestre tem uma atividade de peso 5, então vale no máximo 5, e o
 * semestre inteiro fecha em 10. Com só o primeiro bimestre corrigido, o teto
 * é 5 — era aí que comparar com 6 fixo marcava a turma inteira como em risco,
 * inclusive quem tirou 10.
 */
async function turmaCincoMaisCinco(nomes: string[]) {
  const turma = await criarTurmaDeTeste(nomes, { pesoDaAtividade: 5 })
  const b2 = await db.activity.create({
    data: { classId: turma.classId, bimester: 2, name: 'Prova 2', weight: 5 },
  })
  return { ...turma, b1: turma.activityId, b2: b2.id }
}

test.describe('Aviso de aluno em risco', () => {
  test('quem vai bem no único bimestre corrigido fica "Em dia"', async ({ browser }) => {
    const turma = await turmaCincoMaisCinco(['ANA PRIMEIRA', 'BRUNO SEGUNDO'])

    // Ana tirou 10 (B1 = 5, o máximo possível até aqui).
    // Bruno tirou 4 (B1 = 2, abaixo do mínimo de 3).
    await db.grade.createMany({
      data: [
        { enrollmentId: turma.enrollmentIdPorNome['ANA PRIMEIRA'], activityId: turma.b1, value: 10 },
        { enrollmentId: turma.enrollmentIdPorNome['BRUNO SEGUNDO'], activityId: turma.b1, value: 4 },
      ],
    })

    const ctx = await novoContextoAutenticado(browser)
    const page = await ctx.newPage()
    await abrirRelatorio(page, turma.classId)

    // Antes, Ana saía "Reprovado": com teto 5, nem o 10 dela chegava a 6.
    await expect(page.getByRole('row').filter({ hasText: 'ANA PRIMEIRA' })).toContainText('Em dia')
    await expect(page.getByRole('row').filter({ hasText: 'BRUNO SEGUNDO' })).toContainText('Em risco')

    // E os cartões usam o mínimo do momento, não o 6.
    await expect(page.getByText(/Alunos em Dia \(≥ 3\)/i)).toBeVisible()
    await expect(page.getByText(/Alunos em Risco \(< 3\)/i)).toBeVisible()

    await ctx.close()
  })

  test('o diário mostra o mínimo exigido no ponto atual', async ({ browser }) => {
    const turma = await turmaCincoMaisCinco(['ANA PRIMEIRA'])
    await db.grade.create({
      data: { enrollmentId: turma.enrollmentIdPorNome['ANA PRIMEIRA'], activityId: turma.b1, value: 10 },
    })

    const ctx = await novoContextoAutenticado(browser)
    const page = await ctx.newPage()
    await page.goto(`/dashboard/classes/${turma.classId}`)
    await page.getByRole('button', { name: 'Diário de Notas', exact: true }).click()

    // O bimestre vale 5 nesta turma, então o mínimo dele é 3.
    await expect(page.getByText(/Mínimo por bimestre/i)).toContainText('3.0')

    await ctx.close()
  })

  test('o mínimo do bimestre não encolhe com o bimestre pela metade', async ({ browser }) => {
    // A correção do professor: o mínimo vem do que o bimestre vale, não da
    // fatia já corrigida. Com uma prova só lançada, continua 3 — não 1.5.
    const turma = await turmaCincoMaisCinco(['ANA PRIMEIRA'])
    const extra = await db.activity.create({
      data: { classId: turma.classId, bimester: 1, name: 'Trabalho', weight: 2.5 },
    })
    await db.activity.update({ where: { id: turma.b1 }, data: { weight: 2.5 } })
    await db.grade.create({
      data: { enrollmentId: turma.enrollmentIdPorNome['ANA PRIMEIRA'], activityId: extra.id, value: 10 },
    })

    const ctx = await novoContextoAutenticado(browser)
    const page = await ctx.newPage()
    await page.goto(`/dashboard/classes/${turma.classId}`)
    await page.getByRole('button', { name: 'Diário de Notas', exact: true }).click()

    await expect(page.getByText(/Mínimo por bimestre/i)).toContainText('3.0')

    // E quem tirou 10 na única prova corrigida está em dia, não em risco.
    await abrirRelatorio(page, turma.classId)
    await expect(page.getByRole('row').filter({ hasText: 'ANA PRIMEIRA' })).toContainText('Em dia')

    await ctx.close()
  })

  test('num bimestre que vale 10 o mínimo é 6', async ({ browser }) => {
    // "e isso deve ser em todas as turmas": o número sai da configuração da
    // turma, não de um valor fixo.
    const turma = await criarTurmaDeTeste(['ANA PRIMEIRA'], { pesoDaAtividade: 10 })
    await db.activity.create({
      data: { classId: turma.classId, bimester: 2, name: 'Prova 2', weight: 10 },
    })

    const ctx = await novoContextoAutenticado(browser)
    const page = await ctx.newPage()
    await page.goto(`/dashboard/classes/${turma.classId}`)
    await page.getByRole('button', { name: 'Diário de Notas', exact: true }).click()

    await expect(page.getByText(/Mínimo por bimestre/i)).toContainText('6.0')

    await ctx.close()
  })

  test('o mínimo da média volta a 6 quando o semestre fecha', async ({ browser }) => {
    const turma = await turmaCincoMaisCinco(['ANA PRIMEIRA'])
    await db.grade.createMany({
      data: [
        { enrollmentId: turma.enrollmentIdPorNome['ANA PRIMEIRA'], activityId: turma.b1, value: 8 },
        { enrollmentId: turma.enrollmentIdPorNome['ANA PRIMEIRA'], activityId: turma.b2, value: 8 },
      ],
    })

    const ctx = await novoContextoAutenticado(browser)
    const page = await ctx.newPage()
    await abrirRelatorio(page, turma.classId)

    // 8 nas duas provas dá 4 + 4 = 8, acima dos 6 da média fechada.
    await expect(page.getByRole('row').filter({ hasText: 'ANA PRIMEIRA' })).toContainText('Aprovado')
    await expect(page.getByText(/Alunos Aprovados \(≥ 6\)/i)).toBeVisible()

    await ctx.close()
  })

  test('a taxa de aprovação da turma não zera no meio do semestre', async ({ browser }) => {
    // Com o 6 fixo, uma turma inteira indo bem aparecia com 0% de aprovação.
    const turma = await turmaCincoMaisCinco(['ANA PRIMEIRA', 'BRUNO SEGUNDO'])
    await db.grade.createMany({
      data: [
        { enrollmentId: turma.enrollmentIdPorNome['ANA PRIMEIRA'], activityId: turma.b1, value: 10 },
        { enrollmentId: turma.enrollmentIdPorNome['BRUNO SEGUNDO'], activityId: turma.b1, value: 8 },
      ],
    })

    const ctx = await novoContextoAutenticado(browser)
    const page = await ctx.newPage()
    await page.goto(`/dashboard/classes/${turma.classId}`)

    const taxa = page.locator('div').filter({ hasText: /^TAXA DE APROVAÇÃO/i }).last()
    await expect(taxa).toContainText('100')

    await ctx.close()
  })

  test('quem está mal continua sendo sinalizado', async ({ browser }) => {
    // A correção não pode tornar o alerta frouxo demais.
    const turma = await turmaCincoMaisCinco(['ANA PRIMEIRA', 'BRUNO SEGUNDO'])
    await db.grade.createMany({
      data: [
        { enrollmentId: turma.enrollmentIdPorNome['ANA PRIMEIRA'], activityId: turma.b1, value: 5 },
        { enrollmentId: turma.enrollmentIdPorNome['BRUNO SEGUNDO'], activityId: turma.b1, value: 2 },
      ],
    })

    const ctx = await novoContextoAutenticado(browser)
    const page = await ctx.newPage()
    await abrirRelatorio(page, turma.classId)

    // 5 dá B1 = 2.5, abaixo do mínimo de 3; 2 dá 1.
    await expect(page.getByRole('row').filter({ hasText: 'ANA PRIMEIRA' })).toContainText('Em risco')
    await expect(page.getByRole('row').filter({ hasText: 'BRUNO SEGUNDO' })).toContainText('Em risco')

    await ctx.close()
  })

  test('com o semestre fechado volta a dizer aprovado e reprovado', async ({ browser }) => {
    const turma = await turmaCincoMaisCinco(['ANA PRIMEIRA', 'BRUNO SEGUNDO'])
    await db.grade.createMany({
      data: [
        // Ana: 8 e 8 -> 4 + 4 = 8.
        { enrollmentId: turma.enrollmentIdPorNome['ANA PRIMEIRA'], activityId: turma.b1, value: 8 },
        { enrollmentId: turma.enrollmentIdPorNome['ANA PRIMEIRA'], activityId: turma.b2, value: 8 },
        // Bruno: 4 e 4 -> 2 + 2 = 4.
        { enrollmentId: turma.enrollmentIdPorNome['BRUNO SEGUNDO'], activityId: turma.b1, value: 4 },
        { enrollmentId: turma.enrollmentIdPorNome['BRUNO SEGUNDO'], activityId: turma.b2, value: 4 },
      ],
    })

    const ctx = await novoContextoAutenticado(browser)
    const page = await ctx.newPage()
    await abrirRelatorio(page, turma.classId)

    await expect(page.getByRole('row').filter({ hasText: 'ANA PRIMEIRA' })).toContainText('Aprovado')
    await expect(page.getByRole('row').filter({ hasText: 'BRUNO SEGUNDO' })).toContainText('Reprovado')
    await expect(page.getByText(/Alunos Aprovados \(≥ 6\)/i)).toBeVisible()

    await ctx.close()
  })
})
