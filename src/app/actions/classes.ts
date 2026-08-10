'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'

export async function createInstitutionAction(formData: FormData) {
  try {
    const name = formData.get('name') as string
    if (!name?.trim()) return { success: false, message: 'Nome da instituição é obrigatório.' }
    const existing = await prisma.institution.findFirst({ where: { name: name.trim() } })
    if (existing) return { success: false, message: 'Esta instituição já existe.' }
    await prisma.institution.create({ data: { name: name.trim() } })
    revalidatePath('/dashboard/classes')
    return { success: true, message: 'Instituição criada com sucesso!' }
  } catch (error: any) {
    return { success: false, message: `Erro: ${error.message}` }
  }
}

export async function updateInstitutionAction(institutionId: string, formData: FormData) {
  try {
    const name = formData.get('name') as string
    if (!name?.trim()) return { success: false, message: 'Nome da instituição é obrigatório.' }
    await prisma.institution.update({ where: { id: institutionId }, data: { name: name.trim() } })
    revalidatePath('/dashboard/classes')
    return { success: true, message: 'Instituição atualizada com sucesso!' }
  } catch (error: any) {
    return { success: false, message: `Erro: ${error.message}` }
  }
}

export async function deleteInstitutionAction(institutionId: string) {
  try {
    // Desvincula as turmas antes de excluir
    await prisma.class.updateMany({ where: { institutionId }, data: { institutionId: null } })
    await prisma.institution.delete({ where: { id: institutionId } })
    revalidatePath('/dashboard/classes')
    return { success: true, message: 'Instituição excluída com sucesso!' }
  } catch (error: any) {
    return { success: false, message: `Erro: ${error.message}` }
  }
}

export async function createSemesterAction(name: string) {
  try {
    if (!name?.trim()) return { success: false, message: 'Nome do semestre é obrigatório.', semesterId: null }
    let semester = await prisma.semester.findFirst({ where: { name: name.trim() } })
    if (!semester) {
      semester = await prisma.semester.create({ data: { name: name.trim() } })
    }
    revalidatePath('/dashboard/classes')
    return { success: true, message: 'Semestre criado!', semesterId: semester.id }
  } catch (error: any) {
    return { success: false, message: `Erro: ${error.message}`, semesterId: null }
  }
}



export async function createClassAction(formData: FormData) {
  try {
    const institutionName = formData.get('institutionName') as string
    const semesterName = formData.get('semesterName') as string
    const subjectName = formData.get('subjectName') as string
    const turmaName = (formData.get('turmaName') as string)?.trim() || null
    const schedule = (formData.get('schedule') as string)?.trim() || null
    
    if (!institutionName || !semesterName || !subjectName) {
      return { success: false, message: 'Instituição, Semestre e Disciplina são obrigatórios.' }
    }

    // Professor is always Prof. Me. Davi Maxmillan
    const professor = 'Prof. Me. Davi Maxmillan'

    // Get or Create Institution
    let institution = await prisma.institution.findFirst({ where: { name: institutionName } })
    if (!institution) {
      institution = await prisma.institution.create({ data: { name: institutionName } })
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

    // Removed the duplicate check as requested by the user, so they can create classes freely

    await prisma.class.create({
      data: {
        institutionId: institution.id,
        semesterId: semester.id,
        subjectId: subject.id,
        turmaName,
        schedule,
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
    const institutionName = formData.get('institutionName') as string
    const semesterName = formData.get('semesterName') as string
    const subjectName = formData.get('subjectName') as string
    const turmaName = (formData.get('turmaName') as string)?.trim() || null
    const schedule = (formData.get('schedule') as string)?.trim() || null

    if (!institutionName || !semesterName || !subjectName) {
      return { success: false, message: 'Instituição, Semestre e Disciplina são obrigatórios.' }
    }

    // Get or Create Institution
    let institution = await prisma.institution.findFirst({ where: { name: institutionName } })
    if (!institution) {
      institution = await prisma.institution.create({ data: { name: institutionName } })
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
        institutionId: institution.id,
        semesterId: semester.id,
        subjectId: subject.id,
        turmaName,
        schedule
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
