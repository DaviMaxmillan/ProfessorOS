/**
 * A lista de alunos da planilha — fonte única de interpretação.
 *
 * A planilha da instituição é a lista oficial da turma. Sincronizar significa
 * fazer o sistema refletir essa lista:
 *
 *   - Nome com "(Trancado)" na frente vira matrícula inativa, e o aluno sai da
 *     chamada.
 *   - Nome que sumiu da planilha significa aluno que saiu da turma.
 *
 * As duas coisas dependem de comparar o nome da planilha com o nome no banco,
 * e nomes vêm de digitação humana: "JOSÉ DA SILVA", "Jose da  Silva" e
 * "josé da silva" são a mesma pessoa. A comparação é feita sobre uma forma
 * normalizada, nunca sobre o texto cru.
 *
 * Coberto por testes em `roster.test.ts`.
 */

/** Os status possíveis de uma matrícula. */
export const ENROLLMENT_STATUS = {
  ATIVO: 'ATIVO',
  /** Trancado. É o rótulo que a tela já usa: "Inativo (Trancado)". */
  INATIVO: 'INATIVO',
  DESISTENTE: 'DESISTENTE',
} as const

export type EnrollmentStatus = (typeof ENROLLMENT_STATUS)[keyof typeof ENROLLMENT_STATUS]

/**
 * O aluno entra na chamada?
 *
 * Quem trancou ou desistiu não é chamado. O histórico de presença dele
 * continua no banco — o que muda é só daqui para a frente.
 */
export function isActiveEnrollment(status: string | null | undefined): boolean {
  return !status || status === ENROLLMENT_STATUS.ATIVO
}

/**
 * Nome sem acento, em maiúsculas, com um espaço só entre as palavras.
 *
 * Serve só para comparar. O nome guardado no banco continua sendo o que veio
 * da planilha.
 */
export function normalizeStudentName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

/**
 * A marca de trancamento aceita pela sincronização.
 *
 * Entre parênteses ou colchetes, antes ou depois do nome, com ou sem acento,
 * em qualquer caixa. Também aceita a palavra solta separada por hífen, que é
 * como algumas secretarias escrevem.
 *
 * Exige delimitador de propósito: "TRANCADO" solto no meio de um nome não
 * deveria trancar ninguém por acidente.
 */
const MARCA_DE_TRANCAMENTO = /^\s*(?:[([]\s*trancad[oa]s?\s*[)\]]|trancad[oa]s?\s*[-–—])\s*|\s*(?:[([]\s*trancad[oa]s?\s*[)\]]|[-–—]\s*trancad[oa]s?)\s*$/giu

export type ParsedRosterName = {
  /** O nome limpo, sem a marca. */
  name: string
  /** A planilha marcou este aluno como trancado? */
  locked: boolean
}

/**
 * Separa a marca de trancamento do nome.
 *
 * Devolve o nome limpo para ser gravado: guardar "(Trancado) FULANO" como nome
 * do aluno faria a marca virar parte do cadastro, e o aluno nunca mais bateria
 * com a planilha depois que ele destrancasse.
 */
export function parseRosterName(rawName: string): ParsedRosterName {
  const semMarca = rawName.replace(MARCA_DE_TRANCAMENTO, ' ').replace(/\s+/g, ' ').trim()
  const locked = normalizeStudentName(semMarca) !== normalizeStudentName(rawName)

  return {
    // Se a linha só tinha a marca, não sobra nome: devolve o original para o
    // chamador decidir o que fazer, em vez de inventar um aluno sem nome.
    name: semMarca || rawName.replace(/\s+/g, ' ').trim(),
    locked,
  }
}

/** Uma linha da planilha, já interpretada. */
export type RosterEntry = {
  name: string
  rgm: string
  locked: boolean
  date?: Date
}

/** Uma matrícula do banco, no mínimo necessário para comparar com a planilha. */
export type EnrolledStudent = {
  enrollmentId: string
  studentId: string
  name: string
  rgm: string | null
  status: string | null
}

export type RosterPlan = {
  /** Matrículas que a planilha marcou como trancadas e ainda não estão. */
  toLock: EnrolledStudent[]
  /** Matrículas trancadas que voltaram a aparecer sem marca na planilha. */
  toUnlock: EnrolledStudent[]
  /** Matrículas que não constam na planilha, nem com a marca. */
  toRemove: EnrolledStudent[]
}

/**
 * O que precisa mudar para o sistema bater com a planilha.
 *
 * Só decide; não escreve nada. Assim a tela pode mostrar o que vai acontecer
 * antes de acontecer — importante porque remover uma matrícula apaga junto as
 * notas e as chamadas do aluno.
 */
export function planRosterSync(
  planilha: RosterEntry[],
  matriculados: EnrolledStudent[]
): RosterPlan {
  const porNome = new Map<string, RosterEntry>()
  const porRgm = new Map<string, RosterEntry>()

  for (const linha of planilha) {
    porNome.set(normalizeStudentName(linha.name), linha)
    if (linha.rgm) porRgm.set(linha.rgm.trim(), linha)
  }

  const toLock: EnrolledStudent[] = []
  const toUnlock: EnrolledStudent[] = []
  const toRemove: EnrolledStudent[] = []

  for (const matricula of matriculados) {
    // O RGM é o identificador confiável; o nome é o reserva, para quando a
    // planilha vem sem RGM ou o aluno foi cadastrado sem ele.
    const naPlanilha =
      (matricula.rgm ? porRgm.get(matricula.rgm.trim()) : undefined) ??
      porNome.get(normalizeStudentName(matricula.name))

    if (!naPlanilha) {
      toRemove.push(matricula)
      continue
    }

    if (naPlanilha.locked) {
      if (matricula.status !== ENROLLMENT_STATUS.INATIVO) toLock.push(matricula)
      continue
    }

    // Sem marca na planilha: destranca quem estava trancado.
    //
    // DESISTENTE fica como está. Desistência é uma avaliação do professor, que
    // a planilha da secretaria não expressa — sobrescrever apagaria algo que
    // ele digitou à mão.
    if (matricula.status === ENROLLMENT_STATUS.INATIVO) toUnlock.push(matricula)
  }

  return { toLock, toUnlock, toRemove }
}
