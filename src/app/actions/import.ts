'use server'

import { revalidatePath } from 'next/cache'
import * as xlsx from 'xlsx'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { errorMessage } from '@/lib/errors'
import {
  ENROLLMENT_STATUS,
  parseRosterName,
  planRosterSync,
  type EnrolledStudent,
  type RosterEntry,
} from '@/lib/roster'

/** Um aluno que a planilha não lista mais, e o que se perde ao removê-lo. */
export type PendingRemoval = {
  enrollmentId: string
  name: string
  rgm: string | null
  /** Notas lançadas que serão apagadas junto. */
  grades: number
  /** Chamadas registradas que serão apagadas junto. */
  attendances: number
  /** O aluno sai do sistema inteiro por não estar em mais nenhuma turma. */
  alsoDeletesStudent: boolean
}

export type ImportResult = {
  success: boolean
  message: string
  data?: {
    addedStudents: number
    updatedStudents: number
    /** Matrículas trancadas por causa da marca na planilha. */
    lockedStudents: number
    /** Matrículas destrancadas por terem voltado sem a marca. */
    unlockedStudents: number
    /** Matrículas efetivamente removidas (só quando confirmado). */
    removedStudents: number
    /**
     * Alunos fora da planilha, aguardando confirmação.
     *
     * Enquanto esta lista vier preenchida, nada foi removido: a remoção apaga
     * notas e chamadas em cascata, então ela só acontece depois que o
     * professor vê quem sai e o que se perde.
     */
    pendingRemovals: PendingRemoval[]
  }
}

function parseExcelDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (typeof value === 'number') {
    // Excel starts at 1900-01-01, JS at 1970-01-01 (difference is 25569 days)
    return new Date((value - 25569) * 86400 * 1000);
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  return undefined;
}

/** Um RGM que vale a pena guardar — a planilha traz lixo em algumas linhas. */
function rgmValido(rgm: string): boolean {
  return rgm !== '' && rgm !== '0' && rgm !== 'NaN'
}

/** Lê a lista de alunos da planilha, já com a marca de trancamento separada. */
function lerPlanilha(buffer: ArrayBuffer): RosterEntry[] | { erro: string } {
  const workbook = xlsx.read(buffer, { type: 'buffer' })

  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rawData = xlsx.utils.sheet_to_json<unknown[]>(sheet, { header: 1 })

  if (rawData.length === 0) {
    return { erro: 'Planilha vazia.' }
  }

  // Localizar a tabela de alunos
  let headerRowIndex = -1
  let nameColIndex = -1
  let rgmColIndex = -1
  let dateColIndex = -1

  for (let i = 0; i < Math.min(20, rawData.length); i++) {
    const row = rawData[i] || []
    for (let j = 0; j < row.length; j++) {
      const cellValue = String(row[j] || '').toLowerCase().replace(/\s+/g, ' ').trim()
      if (cellValue.includes('nome aluno') || cellValue.includes('nome do aluno') || cellValue === 'nome' || cellValue.includes('aluno')) {
        headerRowIndex = i
        nameColIndex = j

        for (let k = 0; k < row.length; k++) {
          const potCol = String(row[k] || '').toLowerCase().replace(/\s+/g, ' ').trim()
          if (potCol === 'rgm' || potCol === 'ra' || potCol === 'matrícula' || potCol.includes('rgm')) {
            rgmColIndex = k
          } else if (potCol.includes('data') && potCol.includes('matrícula')) {
            dateColIndex = k
          }
        }
        break
      }
    }
    if (headerRowIndex !== -1) break
  }

  if (headerRowIndex === -1 || nameColIndex === -1) {
    return { erro: 'Não foi possível localizar a coluna "Nome Aluno" na planilha.' }
  }
  if (rgmColIndex === -1) rgmColIndex = nameColIndex + 1

  const alunos: RosterEntry[] = []

  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const row = rawData[i] || []
    const rawName = row[nameColIndex]
    const rawRGM = row[rgmColIndex]
    const rawDate = dateColIndex !== -1 ? row[dateColIndex] : null

    if (typeof rawName === 'string' && rawName.trim().length > 3) {
      // A marca "(Trancado)" é separada aqui, antes de qualquer comparação: o
      // nome guardado no banco é o limpo, senão o aluno deixaria de bater com
      // a planilha assim que destrancasse.
      const { name, locked } = parseRosterName(rawName)
      const rgm = rawRGM ? String(rawRGM).trim() : ''

      if (name && !name.toLowerCase().includes('nome do aluno') && !name.toLowerCase().includes('nome aluno') && name.toLowerCase() !== 'nome') {
        alunos.push({
          name,
          rgm,
          locked,
          date: parseExcelDate(rawDate),
        })
      }
    }
  }

  if (alunos.length === 0) {
    return { erro: 'Nenhum aluno válido encontrado após o cabeçalho.' }
  }

  return alunos
}

/** Monta a frase do resultado a partir do que de fato mudou. */
function resumo(data: NonNullable<ImportResult['data']>): string {
  if (data.pendingRemovals.length > 0) {
    const n = data.pendingRemovals.length
    return n === 1
      ? 'Sincronização concluída. 1 aluno não consta na planilha e aguarda sua confirmação.'
      : `Sincronização concluída. ${n} alunos não constam na planilha e aguardam sua confirmação.`
  }
  return 'Sincronização concluída com sucesso!'
}

export async function importExcelAction(formData: FormData): Promise<ImportResult> {
  await requireAuth()

  try {
    const classId = formData.get('classId') as string
    const file = formData.get('file') as File
    // A remoção apaga notas e chamadas em cascata, então ela nunca acontece na
    // primeira passada: o professor precisa ver a lista e confirmar.
    const confirmarRemocoes = formData.get('confirmarRemocoes') === 'true'

    if (!classId) return { success: false, message: 'Selecione uma Turma primeiro.' }
    if (!file) return { success: false, message: 'Nenhum arquivo enviado.' }

    const dbClass = await prisma.class.findUnique({
      where: { id: classId }
    })

    if (!dbClass) return { success: false, message: 'Turma não encontrada.' }

    const lido = lerPlanilha(await file.arrayBuffer())
    if ('erro' in lido) return { success: false, message: lido.erro }
    const studentsToImport = lido

    let addedStudents = 0
    let updatedStudents = 0

    // O Professor pediu para sincronizar.
    // Pegar as matrículas atuais da turma
    const currentEnrollments = await prisma.enrollment.findMany({
      where: { classId: dbClass.id },
      include: { student: true }
    })

    const existingStudentIds = currentEnrollments.map(e => e.student.id)

    for (const st of studentsToImport) {
      let dbStudent

      // Busca por RGM primeiro
      if (rgmValido(st.rgm)) {
        dbStudent = await prisma.student.findUnique({ where: { rgm: st.rgm } })
      }

      // Busca por Nome se não achou
      if (!dbStudent) {
        dbStudent = await prisma.student.findFirst({ where: { name: st.name } })
      }

      if (!dbStudent) {
        // Cria aluno
        dbStudent = await prisma.student.create({
          data: {
            name: st.name,
            rgm: rgmValido(st.rgm) ? st.rgm : null
          }
        })
      } else {
        // Se aluno já existe mas sem RGM, atualiza o RGM
        if (!dbStudent.rgm && rgmValido(st.rgm)) {
          await prisma.student.update({
            where: { id: dbStudent.id },
            data: { rgm: st.rgm }
          })
        }
      }

      // Matricular se não estiver
      if (!existingStudentIds.includes(dbStudent.id)) {
        await prisma.enrollment.create({
          data: {
            studentId: dbStudent.id,
            classId: dbClass.id,
            enrollmentDate: st.date,
            // Aluno novo que já chega marcado na planilha entra trancado.
            status: st.locked ? ENROLLMENT_STATUS.INATIVO : null,
          }
        })
        addedStudents++
      } else {
        // If already enrolled, update the enrollment date if we have a new one
        if (st.date) {
          const existingEnrollment = currentEnrollments.find(e => e.studentId === dbStudent.id)
          if (existingEnrollment) {
            await prisma.enrollment.update({
              where: { id: existingEnrollment.id },
              data: { enrollmentDate: st.date }
            })
          }
        }
        updatedStudents++
      }
    }

    // ---- Status e remoções ----
    //
    // Releitura: o laço acima acabou de criar matrículas, e o plano precisa
    // enxergar a turma como ela ficou.
    const depoisDaInclusao = await prisma.enrollment.findMany({
      where: { classId: dbClass.id },
      include: { student: true },
    })

    const matriculados: EnrolledStudent[] = depoisDaInclusao.map(e => ({
      enrollmentId: e.id,
      studentId: e.studentId,
      name: e.student.name,
      rgm: e.student.rgm,
      status: e.status,
    }))

    const plano = planRosterSync(studentsToImport, matriculados)

    // Trancar e destrancar num lote só: se uma falhar, nenhuma vale.
    const mudancasDeStatus = [
      ...plano.toLock.map(m =>
        prisma.enrollment.update({
          where: { id: m.enrollmentId },
          data: { status: ENROLLMENT_STATUS.INATIVO },
        })
      ),
      ...plano.toUnlock.map(m =>
        prisma.enrollment.update({
          where: { id: m.enrollmentId },
          data: { status: ENROLLMENT_STATUS.ATIVO },
        })
      ),
    ]
    if (mudancasDeStatus.length > 0) {
      await prisma.$transaction(mudancasDeStatus)
    }

    let removedStudents = 0
    let pendingRemovals: PendingRemoval[] = []

    if (plano.toRemove.length > 0) {
      // O que cada remoção leva junto. É o que a tela mostra antes de
      // confirmar: remover a matrícula apaga notas, chamadas, participação em
      // grupos e vínculos de necessidades especiais, tudo em cascata.
      const custos = await Promise.all(
        plano.toRemove.map(async m => {
          const [grades, attendances, outrasTurmas] = await Promise.all([
            prisma.grade.count({ where: { enrollmentId: m.enrollmentId } }),
            prisma.attendanceRecord.count({ where: { enrollmentId: m.enrollmentId } }),
            prisma.enrollment.count({
              where: { studentId: m.studentId, NOT: { id: m.enrollmentId } },
            }),
          ])

          return {
            enrollmentId: m.enrollmentId,
            studentId: m.studentId,
            name: m.name,
            rgm: m.rgm,
            grades,
            attendances,
            alsoDeletesStudent: outrasTurmas === 0,
          }
        })
      )

      if (confirmarRemocoes) {
        await prisma.$transaction([
          prisma.enrollment.deleteMany({
            where: { id: { in: custos.map(c => c.enrollmentId) } },
          }),
          // O aluno sai do cadastro só quando não sobra nenhuma outra turma.
          // Um aluno que o professor tem em duas disciplinas continua lá.
          prisma.student.deleteMany({
            where: {
              id: { in: custos.filter(c => c.alsoDeletesStudent).map(c => c.studentId) },
            },
          }),
        ])
        removedStudents = custos.length
      } else {
        // O `studentId` não vai para a tela: ela só precisa mostrar quem sai.
        pendingRemovals = custos.map(c => ({
          enrollmentId: c.enrollmentId,
          name: c.name,
          rgm: c.rgm,
          grades: c.grades,
          attendances: c.attendances,
          alsoDeletesStudent: c.alsoDeletesStudent,
        }))
      }
    }

    revalidatePath('/dashboard/classes')
    revalidatePath(`/dashboard/classes/${classId}`)
    revalidatePath('/dashboard/students')

    const data = {
      addedStudents,
      updatedStudents,
      lockedStudents: plano.toLock.length,
      unlockedStudents: plano.toUnlock.length,
      removedStudents,
      pendingRemovals,
    }

    return { success: true, message: resumo(data), data }
  } catch (error) {
    console.error('Erro na importação:', error)
    return { success: false, message: `Erro ao processar arquivo: ${errorMessage(error)}` }
  }
}
