'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'

export async function createNoteAction(classId: string, data: {
  title?: string
  content: string
  color?: string
  label?: string
  fontSize?: number
}) {
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
  } catch (error: any) {
    return { success: false, message: error.message }
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
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function deleteNoteAction(noteId: string) {
  try {
    await prisma.classNote.delete({ where: { id: noteId } })
    revalidatePath('/dashboard/classes/[id]', 'page')
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}
