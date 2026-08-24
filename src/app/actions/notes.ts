'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { errorMessage } from '@/lib/errors'

export async function createNoteAction(classId: string, data: {
  title?: string
  content: string
  color?: string
  label?: string
  fontSize?: number
}) {
  await requireAuth()

  try {
    await prisma.classNote.create({
      data: {
        classId,
        title: data.title || null,
        content: data.content,
        color: data.color || null,
        label: data.label || null,
        fontSize: data.fontSize || 14,
      }
    })
    revalidatePath('/dashboard/classes/[id]', 'page')
    return { success: true }
  } catch (error) {
    return { success: false, message: errorMessage(error) }
  }
}

export async function updateNoteAction(noteId: string, data: {
  title?: string
  content?: string
  color?: string
  label?: string
  fontSize?: number
  pinned?: boolean
}) {
  await requireAuth()

  try {
    await prisma.classNote.update({
      where: { id: noteId },
      data: {
        title: data.title !== undefined ? (data.title || null) : undefined,
        content: data.content !== undefined ? data.content : undefined,
        color: data.color !== undefined ? (data.color || null) : undefined,
        label: data.label !== undefined ? (data.label || null) : undefined,
        fontSize: data.fontSize !== undefined ? data.fontSize : undefined,
        pinned: data.pinned !== undefined ? data.pinned : undefined,
      }
    })
    revalidatePath('/dashboard/classes/[id]', 'page')
    return { success: true }
  } catch (error) {
    return { success: false, message: errorMessage(error) }
  }
}

export async function deleteNoteAction(noteId: string) {
  await requireAuth()

  try {
    await prisma.classNote.delete({ where: { id: noteId } })
    revalidatePath('/dashboard/classes/[id]', 'page')
    return { success: true }
  } catch (error) {
    return { success: false, message: errorMessage(error) }
  }
}
