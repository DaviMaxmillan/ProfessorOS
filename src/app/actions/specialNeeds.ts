'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// ---- Special Needs (categories) ----

export async function getSpecialNeedsAction() {
  return prisma.specialNeed.findMany({
    include: {
      _count: { select: { studentNeeds: true } }
    },
    orderBy: { createdAt: 'asc' }
  })
}

export async function createSpecialNeedAction(data: {
  name: string
  description?: string
  category: string
  color: string
  actions?: string
}) {
  await prisma.specialNeed.create({ data })
  revalidatePath('/dashboard/special-needs')
  return { success: true }
}

export async function deleteSpecialNeedAction(id: string) {
  await prisma.specialNeed.delete({ where: { id } })
  revalidatePath('/dashboard/special-needs')
  return { success: true }
}

export async function updateSpecialNeedAction(id: string, data: {
  name?: string
  description?: string
  category?: string
  color?: string
  actions?: string
}) {
  await prisma.specialNeed.update({ where: { id }, data })
  revalidatePath('/dashboard/special-needs')
  return { success: true }
}

// ---- Student <-> Need associations (per enrollment/class) ----

export async function getStudentNeedsAction(specialNeedId?: string) {
  return prisma.studentSpecialNeed.findMany({
    where: specialNeedId ? { specialNeedId } : undefined,
    include: {
      student: true,
      specialNeed: true,
      enrollment: {
        include: {
          class: { include: { subject: true, semester: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
}

export async function addStudentNeedAction(data: {
  studentId: string
  specialNeedId: string
  enrollmentId: string
  notes?: string
  startDate?: string
  endDate?: string
}) {
  try {
    await prisma.studentSpecialNeed.create({
      data: {
        studentId: data.studentId,
        specialNeedId: data.specialNeedId,
        enrollmentId: data.enrollmentId,
        notes: data.notes || null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
      }
    })
    revalidatePath('/dashboard/special-needs')
    return { success: true }
  } catch (e: any) {
    if (e.code === 'P2002') return { success: false, message: 'Este aluno já está associado a essa necessidade nesta turma.' }
    return { success: false, message: 'Erro ao adicionar.' }
  }
}

export async function removeStudentNeedAction(id: string) {
  await prisma.studentSpecialNeed.delete({ where: { id } })
  revalidatePath('/dashboard/special-needs')
  return { success: true }
}

export async function toggleStudentNeedActiveAction(id: string, active: boolean) {
  await prisma.studentSpecialNeed.update({ where: { id }, data: { active } })
  revalidatePath('/dashboard/special-needs')
  return { success: true }
}

export async function searchEnrollmentsAction(query: string) {
  if (!query || query.length < 2) return []
  return prisma.enrollment.findMany({
    where: {
      student: {
        OR: [
          { name: { contains: query } },
          { rgm: { contains: query } },
        ]
      }
    },
    include: {
      student: true,
      class: { include: { subject: true, semester: true } }
    },
    take: 10
  })
}
