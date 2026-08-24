'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { errorMessage } from '@/lib/errors'
import type { NoteCreateInput, NoteInput } from '@/lib/types'

export async function createNoteAction(classId: string, data: NoteCreateInput) {
  await requireAuth()

  try {
    // Devolve o recado criado para que a tela use o id real. Antes a action
    // respondia apenas { success: true } e o cliente inventava um id
    // provisório ("temp-..."), que ia parar em editar/excluir se o professor
    // mexesse no recado antes de a página recarregar.
    const note = await prisma.classNote.create({
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
    return { success: true, note }
  } catch (error) {
    return { success: false, message: errorMessage(error) }
  }
}

export async function updateNoteAction(noteId: string, data: NoteInput) {
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
