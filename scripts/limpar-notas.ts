/**
 * Apaga notas lançadas — para limpar dados de teste antes do uso real.
 *
 * Por padrão só mostra o que seria apagado. Nada é removido sem `--confirmar`.
 *
 *   npm run limpar-notas                      # mostra o que existe hoje
 *   npm run limpar-notas -- --apenas-zeros    # só as notas iguais a zero
 *   npm run limpar-notas -- --confirmar       # apaga de verdade
 *
 * Respeita a DATABASE_URL do ambiente, então confira o banco impresso no
 * cabeçalho antes de confirmar.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const args = process.argv.slice(2)
const confirmar = args.includes('--confirmar')
const apenasZeros = args.includes('--apenas-zeros')

/**
 * `npm run limpar-notas --confirmar` não funciona: sem os dois hifens soltos
 * o npm trata a opção como dele e não repassa ao script. É um tropeço comum, e
 * silencioso — o script rodaria em simulação e a pessoa acharia que apagou.
 *
 * O npm deixa rastro: a opção engolida vira `npm_config_<nome>`, com os hifens
 * virando sublinhados.
 */
function engolidaPeloNpm(opcao: string): boolean {
  return process.env[`npm_config_${opcao.replace(/-/g, '_')}`] === 'true'
}

const engolidas = ['confirmar', 'apenas-zeros'].filter(
  opcao => !args.includes(`--${opcao}`) && engolidaPeloNpm(opcao)
)

/** Mostra o host e o banco, sem expor usuário e senha. */
function bancoAlvo(): string {
  const url = process.env.DATABASE_URL
  if (!url) return '(DATABASE_URL não definida)'
  try {
    const u = new URL(url)
    return `${u.hostname}:${u.port || '5432'}${u.pathname}`
  } catch {
    return '(DATABASE_URL malformada)'
  }
}

async function main() {
  if (engolidas.length > 0) {
    const escritas = engolidas.map(o => `--${o}`).join(' ')
    console.error('')
    console.error('  As opções não chegaram ao script.')
    console.error('')
    console.error(`  Você escreveu:   npm run limpar-notas ${escritas}`)
    console.error(`  O correto é:     npm run limpar-notas -- ${escritas}`)
    console.error('')
    console.error('  Repare nos dois hifens soltos antes das opções. Sem eles o npm')
    console.error('  trata "--confirmar" como opção dele e não repassa adiante.')
    console.error('')
    console.error('  Nada foi apagado.')
    console.error('')
    process.exitCode = 1
    return
  }

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL não definida. Aponte para o banco antes de rodar.')
    process.exitCode = 1
    return
  }

  const filtro = apenasZeros ? { value: 0 } : {}

  const notas = await prisma.grade.findMany({
    where: filtro,
    include: {
      activity: { include: { class: { include: { subject: true, semester: true } } } },
    },
  })

  console.log('')
  console.log('  Banco            : ' + bancoAlvo())
  console.log('  Escopo           : ' + (apenasZeros ? 'somente notas iguais a zero' : 'todas as notas'))
  console.log('  Modo             : ' + (confirmar ? 'APAGAR' : 'simulação (nada será apagado)'))
  console.log('')

  if (notas.length === 0) {
    console.log('  Nenhuma nota encontrada nesse escopo. Nada a fazer.')
    return
  }

  // Agrupa por turma e atividade para você reconhecer o que é seu.
  const porAtividade = new Map<string, { rotulo: string; total: number; zeros: number }>()

  for (const nota of notas) {
    const turma = nota.activity.class
    const rotulo =
      `${turma.subject.name}` +
      `${turma.turmaName ? ` — ${turma.turmaName}` : ''}` +
      ` | ${turma.semester.name} | ${nota.activity.name}`

    const atual = porAtividade.get(nota.activityId) ?? { rotulo, total: 0, zeros: 0 }
    atual.total++
    if (nota.value === 0) atual.zeros++
    porAtividade.set(nota.activityId, atual)
  }

  console.log(`  ${notas.length} nota(s) em ${porAtividade.size} atividade(s):`)
  console.log('')
  for (const { rotulo, total, zeros } of porAtividade.values()) {
    console.log(`    ${total.toString().padStart(4)} nota(s)  (${zeros} zero)  ${rotulo}`)
  }
  console.log('')

  if (!confirmar) {
    console.log('  Simulação: nada foi apagado.')
    console.log('  Para apagar de verdade, rode de novo com --confirmar')
    return
  }

  const { count } = await prisma.grade.deleteMany({ where: filtro })
  console.log(`  ${count} nota(s) apagada(s).`)
}

main()
  .catch(erro => {
    console.error('Falhou:', erro instanceof Error ? erro.message : erro)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
