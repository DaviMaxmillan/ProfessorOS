import { expect, test } from '@playwright/test'
import {
  abrirBusca,
  cadastrarSenhaEEntrar,
  db,
  limparSenha,
  novoContexto,
} from './helpers'

const TELAS = [
  ['/dashboard', 'Visão geral'],
  ['/dashboard/classes', 'Turmas'],
  ['/dashboard/students', 'Alunos'],
  ['/dashboard/special-needs', 'Atenção especial'],
  ['/dashboard/import', 'Importar'],
  ['/dashboard/reports', 'Relatórios'],
  ['/dashboard/settings', 'Configurações'],
] as const

test.describe('Todas as telas', () => {
  test.beforeEach(async () => { await limparSenha() })

  test('carregam sem erro de console', async ({ browser }) => {
    test.slow() // sete navegações completas em sequência
    const ctx = await novoContexto(browser)
    const page = await ctx.newPage()

    const erros: string[] = []
    page.on('console', m => { if (m.type() === 'error') erros.push(m.text()) })
    page.on('pageerror', e => erros.push(e.message))

    await cadastrarSenhaEEntrar(page)

    for (const [rota, nome] of TELAS) {
      const res = await page.goto(rota)
      expect(res?.status(), `${nome} (${rota})`).toBeLessThan(400)
      expect(page.url(), `${nome} (${rota})`).toContain(rota)
    }

    const relevantes = erros.filter(e => !/favicon|Failed to load resource/.test(e))
    expect(relevantes, `erros de console: ${relevantes.join(' | ')}`).toEqual([])
    await ctx.close()
  })
})

test.describe('Preferências visuais', () => {
  test.beforeEach(async () => { await limparSenha() })

  test('trocar a cor aplica na hora e sobrevive à navegação', async ({ browser }) => {
    const ctx = await novoContexto(browser)
    const page = await ctx.newPage()
    await cadastrarSenhaEEntrar(page)

    await page.goto('/dashboard/settings')
    await page.getByRole('button', { name: /Verde Esmeralda/i }).click()

    const accent = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
    )
    expect(accent).toContain('10b981')

    // A conversão hex -> rgb do brilho.
    const glow = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--accent-glow').trim()
    )
    expect(glow.replace(/\s/g, '')).toContain('rgba(16,185,129')

    // Antes do store compartilhado, a cor só aparecia em outra tela após recarregar.
    await page.goto('/dashboard')
    const noOutroLugar = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
    )
    expect(noOutroLugar).toContain('10b981')
    await ctx.close()
  })
})

test.describe('Busca global', () => {
  test.beforeEach(async () => { await limparSenha() })

  test('abre com Ctrl+K e lida com "nenhum resultado"', async ({ browser }) => {
    const ctx = await novoContexto(browser)
    const page = await ctx.newPage()
    await cadastrarSenhaEEntrar(page)

    const campo = await abrirBusca(page)
    await campo.fill('zzz-nao-existe')

    await expect(page.getByText('Nenhum resultado')).toBeVisible()
    await ctx.close()
  })

  test('não quebra quando a sessão expira durante a busca', async ({ browser }) => {
    const ctx = await novoContexto(browser)
    const page = await ctx.newPage()

    const erros: string[] = []
    page.on('pageerror', e => erros.push(e.message))

    await cadastrarSenhaEEntrar(page)
    const campo = await abrirBusca(page)

    // A rota passa a responder 401 com um objeto de erro no corpo. Sem checar
    // res.ok e Array.isArray, esse objeto virava o estado e o .map quebrava.
    await ctx.clearCookies()
    await campo.fill('ana')
    await page.waitForTimeout(1500)

    expect(erros.filter(e => /map is not a function|Cannot read/.test(e))).toEqual([])
    await ctx.close()
  })
})

test.afterAll(async () => {
  await db.$disconnect()
})
