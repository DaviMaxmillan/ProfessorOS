import { expect, test } from '@playwright/test'
import {
  SENHA,
  cadastrarSenhaEEntrar,
  db,
  entrar,
  limparSenha,
  novoContexto,
  trocarSenhaNoBanco,
} from './helpers'

test.describe('Primeiro acesso', () => {
  test.beforeEach(async () => { await limparSenha() })

  test('recusa senha mestre com menos de 8 caracteres', async ({ browser }) => {
    const ctx = await novoContexto(browser)
    const page = await ctx.newPage()

    await page.goto('/login')
    await page.fill('#password', '123')
    await page.click('button[type=submit]')

    await expect(page.locator('.error-text')).toContainText('8 caracteres')
    expect(page.url()).toContain('/login')
    await ctx.close()
  })

  test('cadastra a senha e entra no dashboard', async ({ browser }) => {
    const ctx = await novoContexto(browser)
    const page = await ctx.newPage()

    await cadastrarSenhaEEntrar(page)
    expect(page.url()).toContain('/dashboard')
    await ctx.close()
  })
})

test.describe('Cookie de sessão', () => {
  test.beforeEach(async () => { await limparSenha() })

  test('é assinado, httpOnly e não é a string fixa do bypass antigo', async ({ browser }) => {
    const ctx = await novoContexto(browser)
    const page = await ctx.newPage()
    await cadastrarSenhaEEntrar(page)

    const cookie = (await ctx.cookies()).find(c => c.name === 'auth_session')!
    expect(cookie).toBeDefined()
    expect(cookie.value).not.toBe('authenticated')
    expect(cookie.value.split('.')).toHaveLength(2)
    expect(cookie.httpOnly).toBe(true)
    expect(cookie.sameSite).toBe('Lax')
    await ctx.close()
  })
})

test.describe('Bypass de autenticação (regressão)', () => {
  test.beforeEach(async () => { await limparSenha() })

  test('o cookie forjado "authenticated" não entra', async ({ browser }) => {
    const ctx = await novoContexto(browser)
    await ctx.addCookies([
      { name: 'auth_session', value: 'authenticated', domain: '127.0.0.1', path: '/' },
    ])
    const page = await ctx.newPage()

    await page.goto('/dashboard')
    expect(page.url()).toContain('/login')
    await ctx.close()
  })

  test('assinatura adulterada não entra', async ({ browser }) => {
    const ctx = await novoContexto(browser)
    const page = await ctx.newPage()
    await cadastrarSenhaEEntrar(page)

    const cookie = (await ctx.cookies()).find(c => c.name === 'auth_session')!
    const [payload, assinatura] = cookie.value.split('.')

    await ctx.clearCookies()
    await ctx.addCookies([{
      ...cookie,
      value: `${payload}.${assinatura.split('').reverse().join('')}`,
    }])

    await page.goto('/dashboard')
    expect(page.url()).toContain('/login')
    await ctx.close()
  })

  test('payload adulterado com validade esticada não entra', async ({ browser }) => {
    const ctx = await novoContexto(browser)
    const page = await ctx.newPage()
    await cadastrarSenhaEEntrar(page)

    const cookie = (await ctx.cookies()).find(c => c.name === 'auth_session')!
    const [payload, assinatura] = cookie.value.split('.')

    const dados = JSON.parse(Buffer.from(payload, 'base64url').toString())
    dados.exp += 999_999
    const forjado = Buffer.from(JSON.stringify(dados)).toString('base64url')

    await ctx.clearCookies()
    await ctx.addCookies([{ ...cookie, value: `${forjado}.${assinatura}` }])

    await page.goto('/dashboard')
    expect(page.url()).toContain('/login')
    await ctx.close()
  })
})

test.describe('API de busca', () => {
  test.beforeEach(async () => { await limparSenha() })

  test('responde 401 sem sessão', async ({ request }) => {
    const res = await request.get('/api/search?q=ana')
    expect(res.status()).toBe(401)
  })

  test('responde 401 com cookie forjado', async ({ browser }) => {
    const ctx = await novoContexto(browser)
    await ctx.addCookies([
      { name: 'auth_session', value: 'authenticated', domain: '127.0.0.1', path: '/' },
    ])
    const res = await ctx.request.get('/api/search?q=ana')
    expect(res.status()).toBe(401)
    await ctx.close()
  })

  test('responde 200 com sessão válida', async ({ browser }) => {
    const ctx = await novoContexto(browser)
    const page = await ctx.newPage()
    await cadastrarSenhaEEntrar(page)

    // Pelo caminho real da aplicação: fetch de dentro da página.
    const status = await page.evaluate(async () => (await fetch('/api/search?q=an')).status)
    expect(status).toBe(200)
    await ctx.close()
  })
})

test.describe('Rate limit do login', () => {
  test.beforeEach(async ({ browser }) => {
    await limparSenha()
    const ctx = await novoContexto(browser)
    const page = await ctx.newPage()
    await cadastrarSenhaEEntrar(page)
    await ctx.close()
  })

  test('bloqueia após tentativas repetidas e não solta nem com a senha certa', async ({ browser }) => {
    const ctx = await novoContexto(browser)
    const page = await ctx.newPage()
    await page.goto('/login')

    let bloqueou = false
    for (let i = 1; i <= 7; i++) {
      await page.fill('#password', `senha-errada-${i}`)
      await page.click('button[type=submit]')
      await page.waitForTimeout(400)
      const erro = (await page.locator('.error-text').textContent().catch(() => '')) ?? ''
      if (erro.includes('Muitas tentativas')) { bloqueou = true; break }
    }
    expect(bloqueou).toBe(true)

    // O IP bloqueado não entra nem com a senha correta.
    await page.fill('#password', SENHA)
    await page.click('button[type=submit]')
    await page.waitForTimeout(800)
    expect(page.url()).toContain('/login')
    await ctx.close()
  })

  test('o bloqueio é por IP — outro IP entra normalmente', async ({ browser }) => {
    const bloqueado = await novoContexto(browser)
    const pageA = await bloqueado.newPage()
    await pageA.goto('/login')
    for (let i = 1; i <= 6; i++) {
      await pageA.fill('#password', `errada-${i}`)
      await pageA.click('button[type=submit]')
      await pageA.waitForTimeout(300)
    }
    await bloqueado.close()

    const limpo = await novoContexto(browser)
    const pageB = await limpo.newPage()
    await entrar(pageB)
    await pageB.waitForURL('**/dashboard')
    expect(pageB.url()).toContain('/dashboard')
    await limpo.close()
  })
})

test.describe('Ciclo de vida da sessão', () => {
  test.beforeEach(async () => { await limparSenha() })

  test('logout apaga o cookie e volta ao login', async ({ browser }) => {
    const ctx = await novoContexto(browser)
    const page = await ctx.newPage()
    await cadastrarSenhaEEntrar(page)

    await page.click('button.logout-btn')
    await page.waitForURL('**/login')

    expect((await ctx.cookies()).find(c => c.name === 'auth_session')).toBeUndefined()
    await ctx.close()
  })

  test('trocar a senha invalida sessões antigas sem loop de redirect', async ({ browser }) => {
    const ctx = await novoContexto(browser)
    const page = await ctx.newPage()
    await cadastrarSenhaEEntrar(page)

    // Simula uma troca de senha por fora.
    await trocarSenhaNoBanco('outro-hash-completamente-diferente')

    // Sem a rota /logout isto entrava em ERR_TOO_MANY_REDIRECTS: o proxy via a
    // assinatura ainda válida e devolvia o usuário ao dashboard, que rejeitava.
    await page.goto('/dashboard')

    expect(page.url()).toContain('/login')
    expect((await ctx.cookies()).find(c => c.name === 'auth_session')).toBeUndefined()
    await ctx.close()
  })
})

test.afterAll(async () => {
  await db.$disconnect()
})
