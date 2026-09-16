'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { errorMessage } from '@/lib/errors'
import {
  MAX_GRADE,
  MIN_GRADE,
  parseGradeInput,
  type GradeInput,
} from '@/lib/grades'

export async function saveProvisionalAttendanceAction(classId: string, date: string, attendanceData: Record<string, boolean>) {
  await requireAuth()

  try {
    const targetDate = new Date(date)
    if (isNaN(targetDate.getTime())) {
      return { success: false, message: 'Data inválida.' }
    }

    // Um lote só: ou a chamada inteira é gravada, ou nada é. Antes eram N
    // upserts soltos num Promise.all — uma falha no meio deixava parte da
    // turma salva e parte não, sem o professor saber quais.
    const operations = Object.entries(attendanceData).map(([enrollmentId, isPresent]) =>
      prisma.attendanceRecord.upsert({
        where: {
          enrollmentId_date: {
            enrollmentId,
            date: targetDate
          }
        },
        update: {
          present: isPresent
        },
        create: {
          enrollmentId,
          date: targetDate,
          present: isPresent
        }
      })
    )

    await prisma.$transaction(operations)

    revalidatePath(`/dashboard/classes/${classId}`)
    return { success: true, message: 'Frequência provisória salva com sucesso!' }
  } catch (error) {
    return { success: false, message: `Erro ao salvar frequência: ${errorMessage(error)}` }
  }
}

export async function createActivityAction(formData: FormData) {
  await requireAuth()

  try {
    const classId = formData.get('classId') as string
    const name = formData.get('name') as string
    const weight = parseFloat(formData.get('weight') as string)

    const bimester = parseInt(formData.get('bimester') as string) || 1

    if (!classId || !name || isNaN(weight)) {
      return { success: false, message: 'Dados inválidos.' }
    }

    await prisma.activity.create({
      data: { classId, name, weight, bimester }
    })

    revalidatePath(`/dashboard/classes/${classId}`)
    return { success: true, message: 'Atividade criada com sucesso!' }
  } catch (error) {
    return { success: false, message: `Erro ao criar atividade: ${errorMessage(error)}` }
  }
}

export async function saveGradesAction(
  classId: string,
  activityId: string,
  gradesData: Record<string, GradeInput>
) {
  await requireAuth()

  const parsed = parseGradeInput(gradesData)

  if (!parsed.ok) {
    const quantidade = parsed.invalid.length
    return {
      success: false,
      message:
        `${quantidade} nota${quantidade > 1 ? 's' : ''} fora da faixa de ` +
        `${MIN_GRADE} a ${MAX_GRADE}. Nenhuma nota foi salva.`,
    }
  }

  try {
    // Um lote só: ou todas as notas da atividade são gravadas, ou nenhuma.
    // Antes eram N upserts soltos num Promise.all — uma falha no meio deixava
    // parte da turma salva e parte não, sem o professor saber quais.
    const operations = [
      ...parsed.toSave.map(({ enrollmentId, value }) =>
        prisma.grade.upsert({
          where: { enrollmentId_activityId: { enrollmentId, activityId } },
          update: { value },
          create: { enrollmentId, activityId, value },
        })
      ),
      // Célula esvaziada volta a ser "sem nota": a linha é removida em vez de
      // virar zero. Um aluno ainda não corrigido não pode contar como zero.
      ...(parsed.toRemove.length > 0
        ? [
            prisma.grade.deleteMany({
              where: { activityId, enrollmentId: { in: parsed.toRemove } },
            }),
          ]
        : []),
    ]

    await prisma.$transaction(operations)

    revalidatePath(`/dashboard/classes/${classId}`)
    return { success: true, message: 'Notas salvas com sucesso!' }
  } catch (error) {
    return { success: false, message: `Erro ao salvar notas: ${errorMessage(error)}` }
  }
}


export async function updateClassCalculationMethod(classId: string, method: string) {
  await requireAuth()

  try {
    await prisma.class.update({
      where: { id: classId },
      data: { calculationMethod: method }
    })
    revalidatePath(`/dashboard/classes/${classId}`)
    return { success: true }
  } catch (error) {
    return { success: false, message: errorMessage(error) }
  }
}

export async function deleteActivityAction(classId: string, activityId: string) {
  await requireAuth()

  try {
    await prisma.activity.delete({
      where: { id: activityId }
    })
    revalidatePath(`/dashboard/classes/${classId}`)
    return { success: true, message: 'Atividade excluída!' }
  } catch (error) {
    return { success: false, message: `Erro ao excluir atividade: ${errorMessage(error)}` }
  }
}

export async function updateStudentNameAction(studentId: string, newName: string) {
  await requireAuth()

  try {
    await prisma.student.update({
      where: { id: studentId },
      data: { name: newName }
    })
    revalidatePath('/dashboard/classes/[id]', 'page')
    return { success: true }
  } catch (error) {
    return { success: false, message: `Erro ao atualizar nome: ${errorMessage(error)}` }
  }
}

export async function saveEnrollmentNotesAction(enrollmentId: string, notes: string) {
  await requireAuth()

  try {
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { notes: notes.trim() || null }
    })
    revalidatePath('/dashboard/classes/[id]', 'page')
    return { success: true }
  } catch (error) {
    return { success: false, message: `Erro ao salvar anotação: ${errorMessage(error)}` }
  }
}

export async function updateEnrollmentStatusAction(enrollmentId: string, status: string) {
  await requireAuth()

  try {
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status: status || null }
    })
    revalidatePath('/dashboard/classes/[id]', 'page')
    return { success: true }
  } catch (error) {
    return { success: false, message: `Erro ao atualizar status: ${errorMessage(error)}` }
  }
}

