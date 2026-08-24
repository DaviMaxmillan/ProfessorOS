'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { errorMessage } from '@/lib/errors'

export async function createGroupWorkAction(classId: string, name: string, description: string, weight: number, createActivity: boolean) {
  await requireAuth()

  try {
    let activityId = null
    
    if (createActivity) {
      const activity = await prisma.activity.create({
        data: {
          classId,
          name,
          weight,
          bimester: 1 // default, user can edit in grades tab
        }
      })
      activityId = activity.id
    }

    await prisma.groupWork.create({
      data: {
        classId,
        name,
        description,
        activityId
      }
    })

    revalidatePath('/dashboard/classes/[id]', 'page')
    return { success: true }
  } catch (error) {
    return { success: false, message: `Erro ao criar trabalho em grupo: ${errorMessage(error)}` }
  }
}

export async function updateGroupWorkAction(groupWorkId: string, name: string, description: string, weight: number) {
  await requireAuth()

  try {
    const gw = await prisma.groupWork.findUnique({ where: { id: groupWorkId }, include: { activity: true } })
    if (!gw) return { success: false, message: 'Trabalho não encontrado' }

    if (gw.activity) {
      await prisma.activity.update({
        where: { id: gw.activity.id },
        data: { name, weight }
      })
    }

    await prisma.groupWork.update({
      where: { id: groupWorkId },
      data: { name, description }
    })

    revalidatePath('/dashboard/classes/[id]', 'page')
    return { success: true }
  } catch (error) {
    return { success: false, message: `Erro ao atualizar: ${errorMessage(error)}` }
  }
}

export async function deleteGroupWorkAction(groupWorkId: string) {
  await requireAuth()

  try {
    const gw = await prisma.groupWork.findUnique({ where: { id: groupWorkId } })
    if (gw?.activityId) {
      // Deleting activity will cascade delete grades
      await prisma.activity.delete({ where: { id: gw.activityId } })
    }
    
    await prisma.groupWork.delete({ where: { id: groupWorkId } })
    
    revalidatePath('/dashboard/classes/[id]', 'page')
    return { success: true }
  } catch (error) {
    return { success: false, message: `Erro ao excluir: ${errorMessage(error)}` }
  }
}

export async function createGroupAction(groupWorkId: string, name: string, theme: string) {
  await requireAuth()

  try {
    await prisma.group.create({
      data: {
        groupWorkId,
        name,
        theme
      }
    })
    revalidatePath('/dashboard/classes/[id]', 'page')
    return { success: true }
  } catch (error) {
    return { success: false, message: `Erro ao criar grupo: ${errorMessage(error)}` }
  }
}

export async function updateGroupAction(groupId: string, name: string, theme: string) {
  await requireAuth()

  try {
    await prisma.group.update({
      where: { id: groupId },
      data: { name, theme }
    })
    revalidatePath('/dashboard/classes/[id]', 'page')
    return { success: true }
  } catch (error) {
    return { success: false, message: `Erro ao atualizar grupo: ${errorMessage(error)}` }
  }
}

export async function deleteGroupAction(groupId: string) {
  await requireAuth()

  try {
    await prisma.group.delete({ where: { id: groupId } })
    revalidatePath('/dashboard/classes/[id]', 'page')
    return { success: true }
  } catch (error) {
    return { success: false, message: `Erro ao excluir grupo: ${errorMessage(error)}` }
  }
}

export async function addMemberToGroupAction(groupId: string, enrollmentId: string) {
  await requireAuth()

  try {
    await prisma.groupMember.create({
      data: {
        groupId,
        enrollmentId
      }
    })
    revalidatePath('/dashboard/classes/[id]', 'page')
    return { success: true }
  } catch (error) {
    return { success: false, message: `Erro ao adicionar aluno: ${errorMessage(error)}` }
  }
}

export async function removeMemberFromGroupAction(memberId: string) {
  await requireAuth()

  try {
    await prisma.groupMember.delete({ where: { id: memberId } })
    revalidatePath('/dashboard/classes/[id]', 'page')
    return { success: true }
  } catch (error) {
    return { success: false, message: `Erro ao remover aluno: ${errorMessage(error)}` }
  }
}

// Action to grade an entire group at once
export async function gradeGroupAction(groupId: string, gradeValue: number, notes: string) {
  await requireAuth()

  try {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: true,
        groupWork: true
      }
    })
    
    if (!group) return { success: false, message: 'Grupo não encontrado' }
    
    const activityId = group.groupWork.activityId
    if (!activityId) return { success: false, message: 'Este trabalho não gera notas no diário.' }
    
    // Update group notes
    await prisma.group.update({
      where: { id: groupId },
      data: { notes }
    })
    
    // Upsert grades for all members
    for (const member of group.members) {
      await prisma.grade.upsert({
        where: {
          enrollmentId_activityId: {
            enrollmentId: member.enrollmentId,
            activityId: activityId
          }
        },
        update: {
          value: gradeValue
        },
        create: {
          enrollmentId: member.enrollmentId,
          activityId: activityId,
          value: gradeValue
        }
      })
    }
    
    revalidatePath('/dashboard/classes/[id]', 'page')
    return { success: true }
  } catch (error) {
    return { success: false, message: `Erro ao lançar notas: ${errorMessage(error)}` }
  }
}

// Action to generate random groups
export async function generateRandomGroupsAction(groupWorkId: string, groupCount: number, availableEnrollmentIds: string[]) {
  await requireAuth()

  try {
    if (groupCount <= 0 || availableEnrollmentIds.length === 0) {
      return { success: false, message: 'Quantidade inválida ou sem alunos.' }
    }
    
    // Shuffle students
    const shuffled = [...availableEnrollmentIds].sort(() => Math.random() - 0.5)
    
    // Get existing groups count to name the new ones correctly
    const existingGroups = await prisma.group.count({ where: { groupWorkId } })
    
    const newGroups = []
    for (let i = 0; i < groupCount; i++) {
      newGroups.push(await prisma.group.create({
        data: {
          groupWorkId,
          name: `Grupo ${existingGroups + i + 1}`
        }
      }))
    }
    
    // Distribute students
    let currentGroupIndex = 0
    for (const studentId of shuffled) {
      await prisma.groupMember.create({
        data: {
          groupId: newGroups[currentGroupIndex].id,
          enrollmentId: studentId
        }
      })
      currentGroupIndex = (currentGroupIndex + 1) % groupCount
    }
    
    revalidatePath('/dashboard/classes/[id]', 'page')
    return { success: true }
  } catch (error) {
    return { success: false, message: `Erro ao sortear grupos: ${errorMessage(error)}` }
  }
}
