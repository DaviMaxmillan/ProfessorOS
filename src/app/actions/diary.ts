'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'

export async function saveProvisionalAttendanceAction(classId: string, date: string, attendanceData: Record<string, boolean>) {
  try {
    const targetDate = new Date(date)

    // For each enrollment, save the attendance record
    const promises = Object.entries(attendanceData).map(async ([enrollmentId, isPresent]) => {
      // Upsert: update if it exists for that date, otherwise create
      await prisma.attendanceRecord.upsert({
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
    })

    await Promise.all(promises)

    revalidatePath(`/dashboard/classes/${classId}`)
    return { success: true, message: 'Frequência provisória salva com sucesso!' }
  } catch (error: any) {
    return { success: false, message: `Erro ao salvar frequência: ${error.message}` }
  }
}

export async function createActivityAction(formData: FormData) {
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
  } catch (error: any) {
    return { success: false, message: `Erro ao criar atividade: ${error.message}` }
  }
}

export async function saveGradesAction(classId: string, activityId: string, gradesData: Record<string, number>) {
  try {
    const promises = Object.entries(gradesData).map(async ([enrollmentId, value]) => {
      await prisma.grade.upsert({
        where: {
          enrollmentId_activityId: { enrollmentId, activityId }
        },
        update: { value },
        create: { enrollmentId, activityId, value }
      })
    })

    await Promise.all(promises)
    revalidatePath(`/dashboard/classes/${classId}`)
    return { success: true, message: 'Notas salvas com sucesso!' }
  } catch (error: any) {
    return { success: false, message: `Erro ao salvar notas: ${error.message}` }
  }
}


export async function updateClassCalculationMethod(classId: string, method: string) {
  try {
    await prisma.class.update({
      where: { id: classId },
      data: { calculationMethod: method }
    })
    revalidatePath(`/dashboard/classes/${classId}`)
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function deleteActivityAction(classId: string, activityId: string) {
  try {
    await prisma.activity.delete({
      where: { id: activityId }
    })
    revalidatePath(`/dashboard/classes/${classId}`)
    return { success: true, message: 'Atividade excluída!' }
  } catch (error: any) {
    return { success: false, message: `Erro ao excluir atividade: ${error.message}` }
  }
}

export async function updateStudentNameAction(studentId: string, newName: string) {
  try {
    await prisma.student.update({
      where: { id: studentId },
      data: { name: newName }
    })
    revalidatePath('/dashboard/classes/[id]', 'page')
    return { success: true }
  } catch (error: any) {
    return { success: false, message: `Erro ao atualizar nome: ${error.message}` }
  }
}
