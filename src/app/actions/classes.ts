'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'

export async function createClassAction(formData: FormData) {
  try {
    const semesterName = formData.get('semesterName') as string
    const subjectName = formData.get('subjectName') as string
    
    if (!semesterName || !subjectName) {
      return { success: false, message: 'Semestre e Disciplina são obrigatórios.' }
    }

    // Professor is always Prof. Me. Davi Maxmillan
    const professor = 'Prof. Me. Davi Maxmillan'

    // Get or Create Semester
    let semester = await prisma.semester.findFirst({ where: { name: semesterName } })
    if (!semester) {
      semester = await prisma.semester.create({ data: { name: semesterName } })
    }

    // Get or Create Subject
    let subject = await prisma.subject.findFirst({ where: { name: subjectName } })
    if (!subject) {
      subject = await prisma.subject.create({ data: { name: subjectName } })
    }

    // Check if class already exists
    const existingClass = await prisma.class.findFirst({
      where: {
        semesterId: semester.id,
        subjectId: subject.id,
        professor
      }
    })

    if (existingClass) {
      return { success: false, message: 'Esta turma já existe.' }
    }

    await prisma.class.create({
      data: {
        semesterId: semester.id,
        subjectId: subject.id,
        professor
      }
    })

    revalidatePath('/dashboard/classes')
    revalidatePath('/dashboard')
    
    return { success: true, message: 'Turma criada com sucesso!' }
  } catch (error: any) {
    return { success: false, message: `Erro ao criar turma: ${error.message}` }
  }
}

export async function deleteClassAction(classId: string) {
  try {
    await prisma.class.delete({
      where: { id: classId }
    })
    revalidatePath('/dashboard/classes')
    revalidatePath('/dashboard')
    return { success: true, message: 'Turma excluída com sucesso!' }
  } catch (error: any) {
    return { success: false, message: `Erro ao excluir turma: ${error.message}` }
  }
}

export async function updateClassAction(classId: string, formData: FormData) {
  try {
    const semesterName = formData.get('semesterName') as string
    const subjectName = formData.get('subjectName') as string

    if (!semesterName || !subjectName) {
      return { success: false, message: 'Semestre e Disciplina são obrigatórios.' }
    }

    // Get or Create Semester
    let semester = await prisma.semester.findFirst({ where: { name: semesterName } })
    if (!semester) {
      semester = await prisma.semester.create({ data: { name: semesterName } })
    }

    // Get or Create Subject
    let subject = await prisma.subject.findFirst({ where: { name: subjectName } })
    if (!subject) {
      subject = await prisma.subject.create({ data: { name: subjectName } })
    }

    await prisma.class.update({
      where: { id: classId },
      data: {
        semesterId: semester.id,
        subjectId: subject.id
      }
    })

    revalidatePath(`/dashboard/classes/${classId}`)
    revalidatePath('/dashboard/classes')
    revalidatePath('/dashboard')
    
    return { success: true, message: 'Turma atualizada com sucesso!' }
  } catch (error: any) {
    return { success: false, message: `Erro ao atualizar turma: ${error.message}` }
  }
}
