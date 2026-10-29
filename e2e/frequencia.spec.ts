import { expect, test, type Page } from '@playwright/test'
import * as XLSX from 'xlsx'
import {
  chamadaDaData,
  criarTurmaDeTeste,
  novoContextoAutenticado,
} from './helpers'

/** Abre a aba "Frequência Provisória" de uma turma. */
async function abrirFrequencia(page: Page, classId: string) {
  await page.goto(`/dashboard/classes/${classId}`)
  await page.getByRole('button', { name: /Frequência Provisória/i }).click()
  await expect(page.getByRole('button', { name: /Salvar Frequência/i })).toBeVisible()
}

/**
 * Os botões de presença da tabela, na ordem das linhas.
 *
 * A tabela ordena os alunos por nome, então os testes usam nomes já em ordem
 * alfabética — a linha N corresponde ao N-ésimo aluno informado.
 */
function botoesDePresenca(page: Page) {
  return page.locator('table.print-table tbody tr td.no-print button')
}

function campoDeData(page: Page) {
  return page.locator('input[type=date]')
}

async function salvar(page: Page) {
  await page.getByRole('button', { name: /Salvar Frequência/i }).click()
  await expect(page.getByRole('button', { name: /Salvar Frequência/i })).toBeEnabled()
}

test.describe('Frequência provisória', () => {
  test.beforeEach(async ({ page }) => {
    // A aba confirma o salvamento com um alert().
    page.on('dialog', dialog => dialog.accept())
  })

  test('a chamada salva reaparece ao recarregar a página', async ({ browser }) => {
    // Este era o bug relatado: a chamada era gravada em AttendanceRecord, mas
    // a página carregava a turma sem `attendances` no include, então ao voltar
    // na aba a turma inteira aparecia presente outra vez. Parecia que salvar
    // não tinha funcionado.
    const turma = await criarTurmaDeTeste(['ANA PRIMEIRA', 'BRUNO SEGUNDO', 'CARLA TERCEIRA'])

    const ctx = await novoContextoAutenticado(browser)
    const page = await ctx.newPage()
    await abrirFrequencia(page, turma.classId)

    const data = await campoDeData(page).inputValue()

    // Bruno faltou.
    await botoesDePresenca(page).nth(1).click()
    await salvar(page)

    const gravado = await chamadaDaData(turma.classId, data)
    expect(gravado[turma.enrollmentIdPorNome['BRUNO SEGUNDO']]).toBe(false)
    expect(gravado[turma.enrollmentIdPorNome['ANA PRIMEIRA']]).toBe(true)

    // O que importa: recarregar e a falta continuar na tela.
    await page.reload()
    await page.getByRole('button', { name: /Frequência Provisória/i }).click()
    await expect(page.getByText(/Chamada salva nesta data/i)).toBeVisible()

    // O botão de ausente é vermelho; o de presente, verde.
    await expect(botoesDePresenca(page).nth(1)).toHaveCSS('color', 'rgb(248, 113, 113)')
    await expect(botoesDePresenca(page).nth(0)).toHaveCSS('color', 'rgb(74, 222, 128)')

    await ctx.close()
  })

  test('trocar a data carrega a chamada daquele dia', async ({ browser }) => {
    const turma = await criarTurmaDeTeste(['ANA PRIMEIRA', 'BRUNO SEGUNDO'])

    const ctx = await novoContextoAutenticado(browser)
    const page = await ctx.newPage()
    await abrirFrequencia(page, turma.classId)

    // Dia 1: Bruno faltou.
    await campoDeData(page).fill('2026-03-10')
    await botoesDePresenca(page).nth(1).click()
    await salvar(page)

    // Dia 2: ninguém faltou — e a tela não deve herdar a falta do outro dia.
    await campoDeData(page).fill('2026-03-17')
    await expect(page.getByText(/Nenhuma chamada salva nesta data/i)).toBeVisible()
    await expect(botoesDePresenca(page).nth(1)).toHaveCSS('color', 'rgb(74, 222, 128)')
    await salvar(page)

    // Voltar ao dia 1 e a falta estar lá.
    await campoDeData(page).fill('2026-03-10')
    await expect(page.getByText(/Chamada salva nesta data/i)).toBeVisible()
    await expect(botoesDePresenca(page).nth(1)).toHaveCSS('color', 'rgb(248, 113, 113)')

    const dia1 = await chamadaDaData(turma.classId, '2026-03-10')
    const dia2 = await chamadaDaData(turma.classId, '2026-03-17')
    expect(dia1[turma.enrollmentIdPorNome['BRUNO SEGUNDO']]).toBe(false)
    expect(dia2[turma.enrollmentIdPorNome['BRUNO SEGUNDO']]).toBe(true)

    await ctx.close()
  })

  test('avisa que há alterações não salvas', async ({ browser }) => {
    // O botão de exportar fica ao lado do de salvar. Sem esse aviso não havia
    // como saber se o que está na tela já foi gravado.
    const turma = await criarTurmaDeTeste(['ANA PRIMEIRA', 'BRUNO SEGUNDO'])

    const ctx = await novoContextoAutenticado(browser)
    const page = await ctx.newPage()
    await abrirFrequencia(page, turma.classId)

    await expect(page.getByText(/Nenhuma chamada salva nesta data/i)).toBeVisible()

    await botoesDePresenca(page).nth(1).click()
    await expect(page.getByText(/Alterações não salvas/i)).toBeVisible()

    await salvar(page)
    await expect(page.getByText(/Chamada salva nesta data/i)).toBeVisible()

    await ctx.close()
  })

  test('a planilha exportada traz as faltas da chamada', async ({ browser }) => {
    // O relato do professor foi exatamente este: fazer a chamada, exportar, e
    // a planilha vir sem as faltas. A exportação lia `enrollment.absences`, um
    // contador que nenhum lugar do sistema escreve — saía 0 falta e 100% de
    // frequência para a turma inteira.
    const turma = await criarTurmaDeTeste(['ANA PRIMEIRA', 'BRUNO SEGUNDO', 'CARLA TERCEIRA'])

    const ctx = await novoContextoAutenticado(browser)
    const page = await ctx.newPage()
    await abrirFrequencia(page, turma.classId)

    await botoesDePresenca(page).nth(1).click()
    await salvar(page)

    const download = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Exportar XLSX/i }).click(),
    ]).then(([d]) => d)

    const caminho = await download.path()
    const wb = XLSX.readFile(caminho)

    const consolidado = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets['Frequência'])
    const bruno = consolidado.find(l => l['Nome'] === 'BRUNO SEGUNDO')
    const ana = consolidado.find(l => l['Nome'] === 'ANA PRIMEIRA')

    expect(bruno?.['Faltas']).toBe(1)
    expect(bruno?.['Presenças']).toBe(0)
    expect(bruno?.['Frequência (%)']).toBe(0)
    expect(bruno?.['Situação']).toBe('⚠ Abaixo de 75%')

    expect(ana?.['Faltas']).toBe(0)
    expect(ana?.['Frequência (%)']).toBe(100)

    // A segunda aba traz a chamada do dia como está na tela.
    const chamada = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets['Chamada do dia'])
    expect(chamada).toHaveLength(3)
    expect(chamada.find(l => l['Nome'] === 'BRUNO SEGUNDO')?.['Presente?']).toBe('Falta')
    expect(chamada.find(l => l['Nome'] === 'ANA PRIMEIRA')?.['Presente?']).toBe('Presente')

    await ctx.close()
  })

  test('marcar todos faltantes grava a turma inteira', async ({ browser }) => {
    const turma = await criarTurmaDeTeste(['ANA PRIMEIRA', 'BRUNO SEGUNDO', 'CARLA TERCEIRA'])

    const ctx = await novoContextoAutenticado(browser)
    const page = await ctx.newPage()
    await abrirFrequencia(page, turma.classId)

    const data = await campoDeData(page).inputValue()
    await page.getByRole('button', { name: 'Todos Faltantes' }).click()
    await salvar(page)

    const gravado = await chamadaDaData(turma.classId, data)
    expect(Object.values(gravado)).toHaveLength(3)
    expect(Object.values(gravado).every(presente => presente === false)).toBe(true)

    await ctx.close()
  })
})
