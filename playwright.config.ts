import { defineConfig } from '@playwright/test'

/**
 * Testes de ponta a ponta.
 *
 * Sobem a aplicação de produção real contra um PostgreSQL real — é a única
 * forma de validar de fato o proxy, os cookies e o fluxo de sessão, que não
 * existem num teste unitário.
 */
export default defineConfig({
  testDir: './e2e',
  // O estado de sessão e o rate limit são globais no servidor: rodar em
  // paralelo faria um teste interferir no outro.
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3300',
    trace: 'retain-on-failure',
    // Em ambientes que já trazem o Chromium instalado (containers de CI
    // pré-montados, por exemplo), aponte CHROMIUM_PATH para o executável em vez
    // de baixar outro. Sem a variável, usa o browser que o Playwright instalou.
    ...(process.env.CHROMIUM_PATH
      ? { launchOptions: { executablePath: process.env.CHROMIUM_PATH } }
      : {}),
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run start -- -p 3300',
        url: 'http://127.0.0.1:3300/login',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          AUTH_SECRET:
            process.env.AUTH_SECRET ?? 'segredo-de-teste-com-mais-de-32-caracteres-aqui',
        },
      },
})
