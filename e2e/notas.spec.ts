import { expect, test, type Page } from '@playwright/test'
import {
  criarTurmaDeTeste,
  db,
  notasDaAtividade,
  novoContextoAutenticado,
} from './helpers'

/** Abre a aba "Diário de Notas" de uma turma. */
async function abrirDiarioDeNotas(page: Page, classId: string) {
  await page.goto(`/dashboard/classes/${classId}`)
  await page.getByRole('button', { name: /Diário de Notas/i }).click()
  await expect(page.getByRole('button', { name: 'Salvar' }).first()).toBeVisible()
}

/**
 * As células de nota da tabela, na ordem das linhas (uma atividade só).
 *
 * A tabela ordena os alunos por nome, então os testes usam nomes já em ordem
 * alfabética — assim a linha N corresponde ao N-ésimo aluno informado.
 */
function celulasDeNota(page: Page) {
  return page.locator('input[type=number][max="10"]')
}

test.describe('Lançamento de notas', () => {
  test('corrigir metade da turma não zera a outra metade', async ({ browser }) => {
    // Este era o bug: `handleSaveGrades` percorria todos os alunos e mandava
    // `gradesState[...] || 0`, então quem ainda não tinha nota recebia zero e
    // aparecia reprovado sem nunca ter sido corrigido.
    const turma = await criarTurmaDeTeste(['ANA PRIMEIRA', 'BRUNO SEGUNDO', 'CARLA TERCEIRA'])

    const ctx = await novoContextoAutenticado(browser)
    const page = await ctx.newPage()
    await abrirDiarioDeNotas(page, turma.classId)

    // Só o primeiro aluno é corrigido.
    await celulasDeNota(page).nth(0).fill('8')
    await page.getByRole('button', { name: 'Salvar' }).first().click()
    await expect(page.getByRole('button', { name: 'Salvar' }).first()).toBeEnabled()

    const notas = await notasDaAtividade(turma.activityId)

    expect(notas[turma.enrollmentIdPorNome['ANA PRIMEIRA']]).toBe(8)
    // Os outros dois seguem sem nota — nem zero, nem linha no banco.
    expect(notas[turma.enrollmentIdPorNome['BRUNO SEGUNDO']]).toBeUndefined()
    expect(notas[turma.enrollmentIdPorNome['CARLA TERCEIRA']]).toBeUndefined()
    expect(Object.keys(notas)).toHaveLength(1)

    await ctx.close()
  })

  test('zero digitado de propósito é gravado', async ({ browser }) => {
    // O contrário do teste acima: "sem nota" e "tirou zero" são coisas
    // diferentes, e o zero explícito precisa valer.
    const turma = await criarTurmaDeTeste(['ANA PRIMEIRA', 'BRUNO SEGUNDO'])

    const ctx = await novoContextoAutenticado(browser)
    const page = await ctx.newPage()
    await abrirDiarioDeNotas(page, turma.classId)

    await celulasDeNota(page).nth(0).fill('0')
    await page.getByRole('button', { name: 'Salvar' }).first().click()
    await expect(page.getByRole('button', { name: 'Salvar' }).first()).toBeEnabled()

    const notas = await notasDaAtividade(turma.activityId)

    expect(notas[turma.enrollmentIdPorNome['ANA PRIMEIRA']]).toBe(0)
    expect(notas[turma.enrollmentIdPorNome['BRUNO SEGUNDO']]).toBeUndefined()

    await ctx.close()
  })

  test('apagar uma nota já lançada remove a linha em vez de virar zero', async ({ browser }) => {
    const turma = await criarTurmaDeTeste(['ANA PRIMEIRA', 'BRUNO SEGUNDO'])

    await db.grade.createMany({
      data: [
        { enrollmentId: turma.enrollmentIdPorNome['ANA PRIMEIRA'], activityId: turma.activityId, value: 7 },
        { enrollmentId: turma.enrollmentIdPorNome['BRUNO SEGUNDO'], activityId: turma.activityId, value: 9 },
      ],
    })

    const ctx = await novoContextoAutenticado(browser)
    const page = await ctx.newPage()
    await abrirDiarioDeNotas(page, turma.classId)

    await celulasDeNota(page).nth(0).fill('')
    await page.getByRole('button', { name: 'Salvar' }).first().click()
    await expect(page.getByRole('button', { name: 'Salvar' }).first()).toBeEnabled()

    const notas = await notasDaAtividade(turma.activityId)

    expect(notas[turma.enrollmentIdPorNome['ANA PRIMEIRA']]).toBeUndefined()
    expect(notas[turma.enrollmentIdPorNome['BRUNO SEGUNDO']]).toBe(9)

    await ctx.close()
  })

  test('uma nota inválida recusa o lote inteiro, sem gravar nada', async ({ browser }) => {
    // O contrato é tudo-ou-nada: gravar as notas boas e descartar a ruim em
    // silêncio deixaria o diário num estado que o professor não veria.
    const turma = await criarTurmaDeTeste(['ANA PRIMEIRA', 'BRUNO SEGUNDO', 'CARLA TERCEIRA'])

    const ctx = await novoContextoAutenticado(browser)
    const page = await ctx.newPage()

    const avisos: string[] = []
    page.on('dialog', async d => {
      avisos.push(d.message())
      await d.accept()
    })

    await abrirDiarioDeNotas(page, turma.classId)

    await celulasDeNota(page).nth(0).fill('8')
    await celulasDeNota(page).nth(1).fill('99') // fora da faixa
    await celulasDeNota(page).nth(2).fill('7')
    await page.getByRole('button', { name: 'Salvar' }).first().click()
    await expect(page.getByRole('button', { name: 'Salvar' }).first()).toBeEnabled()

    const notas = await notasDaAtividade(turma.activityId)

    expect(Object.keys(notas)).toHaveLength(0)
    expect(avisos.join(' ')).toMatch(/Nenhuma nota foi salva/i)

    await ctx.close()
  })

  test('notas anteriores continuam intactas quando um lote é recusado', async ({ browser }) => {
    const turma = await criarTurmaDeTeste(['ANA PRIMEIRA', 'BRUNO SEGUNDO'])

    await db.grade.create({
      data: { enrollmentId: turma.enrollmentIdPorNome['ANA PRIMEIRA'], activityId: turma.activityId, value: 6 },
    })

    const ctx = await novoContextoAutenticado(browser)
    const page = await ctx.newPage()
    page.on('dialog', d => d.accept())

    await abrirDiarioDeNotas(page, turma.classId)

    await celulasDeNota(page).nth(1).fill('-3') // fora da faixa
    await page.getByRole('button', { name: 'Salvar' }).first().click()
    await expect(page.getByRole('button', { name: 'Salvar' }).first()).toBeEnabled()

    const notas = await notasDaAtividade(turma.activityId)

    // A nota que já existia não pode ter sido tocada pelo lote recusado.
    expect(notas[turma.enrollmentIdPorNome['ANA PRIMEIRA']]).toBe(6)
    expect(notas[turma.enrollmentIdPorNome['BRUNO SEGUNDO']]).toBeUndefined()

    await ctx.close()
  })
})

test.afterAll(async () => {
  await db.$disconnect()
})
