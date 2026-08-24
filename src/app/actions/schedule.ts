'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { isHoliday } from '@/lib/holidays'
import { requireAuth } from '@/lib/auth'

export async function generateScheduleAction(classId: string, startDateStr: string, endDateStr: string, daysOfWeekStr: string) {
  await requireAuth()

  try {
    // Fix timezone offset by forcing noon UTC
    const startDate = new Date(startDateStr.includes('T') ? startDateStr : `${startDateStr}T12:00:00Z`)
    const endDate = new Date(endDateStr.includes('T') ? endDateStr : `${endDateStr}T12:00:00Z`)
    const daysOfWeek = JSON.parse(daysOfWeekStr) as number[] // [0,1,2,3,4,5,6] (0 = Sunday)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { success: false, message: 'Datas inválidas' }
    }

    // Save class settings
    await prisma.class.update({
      where: { id: classId },
      data: {
        startDate,
        endDate,
        daysOfWeek: daysOfWeekStr
      }
    })

    // Delete existing entries to regenerate
    await prisma.scheduleEntry.deleteMany({
      where: { classId }
    })

    const entries = []
    let currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      if (daysOfWeek.includes(currentDate.getDay())) {
        const holidayCheck = isHoliday(currentDate)
        
        entries.push({
          classId,
          date: new Date(currentDate),
          isHoliday: holidayCheck.isHoliday,
          holidayName: holidayCheck.name || null,
          content: holidayCheck.isHoliday ? `Feriado - ${holidayCheck.name}` : ''
        })
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    if (entries.length > 0) {
      await prisma.scheduleEntry.createMany({
        data: entries
      })
    }

    revalidatePath('/dashboard/classes/[id]', 'page')
    return { success: true, message: `${entries.length} dias gerados no cronograma.` }

  } catch (error: any) {
    return { success: false, message: `Erro ao gerar cronograma: ${error.message}` }
  }
}

export async function updateScheduleEntryAction(
  entryId: string, 
  data: { content: string; notes: string; rowColor: string | null; driveLink: string | null }
) {
  await requireAuth()

  try {
    await prisma.scheduleEntry.update({
      where: { id: entryId },
      data: {
        content: data.content,
        notes: data.notes,
        rowColor: data.rowColor,
        driveLink: data.driveLink
      }
    })
    revalidatePath('/dashboard/classes/[id]', 'page')
    return { success: true }
  } catch (error: any) {
    return { success: false, message: `Erro ao atualizar cronograma: ${error.message}` }
  }
}

export async function addSingleScheduleEntryAction(classId: string, dateStr: string) {
  await requireAuth()

  try {
    const date = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00Z`)
    if (isNaN(date.getTime())) return { success: false, message: 'Data inválida' }

    const holidayCheck = isHoliday(date)
    
    await prisma.scheduleEntry.create({
      data: {
        classId,
        date,
        isHoliday: holidayCheck.isHoliday,
        holidayName: holidayCheck.name || null,
        content: holidayCheck.isHoliday ? `Feriado - ${holidayCheck.name}` : ''
      }
    })

    revalidatePath('/dashboard/classes/[id]', 'page')
    return { success: true }
  } catch (error: any) {
    return { success: false, message: `Erro ao adicionar data: ${error.message}` }
  }
}

export async function deleteScheduleEntryAction(entryId: string) {
  await requireAuth()

  try {
    await prisma.scheduleEntry.delete({ where: { id: entryId } })
    revalidatePath('/dashboard/classes/[id]', 'page')
    return { success: true }
  } catch (error: any) {
    return { success: false, message: `Erro ao excluir data: ${error.message}` }
  }
}

export async function copyScheduleEntryAction(sourceEntryId: string, targetEntryId: string) {
  await requireAuth()

  try {
    const source = await prisma.scheduleEntry.findUnique({ where: { id: sourceEntryId } })
    if (!source) return { success: false, message: 'Aula de origem não encontrada.' }

    await prisma.scheduleEntry.update({
      where: { id: targetEntryId },
      data: {
        content: source.content,
        notes: source.notes,
        rowColor: source.rowColor,
        driveLink: source.driveLink,
      }
    })
    revalidatePath('/dashboard/classes/[id]', 'page')
    return { success: true }
  } catch (error: any) {
    return { success: false, message: `Erro ao copiar aula: ${error.message}` }
  }
}

export async function mirrorSchedulePlanAction(
  sourceClassId: string,
  targetClassId: string,
  overwrite: boolean
) {
  await requireAuth()

  try {
    const [sourceEntries, targetEntries] = await Promise.all([
      prisma.scheduleEntry.findMany({
        where: { classId: sourceClassId },
        orderBy: { date: 'asc' }
      }),
      prisma.scheduleEntry.findMany({
        where: { classId: targetClassId },
        orderBy: { date: 'asc' }
      })
    ])

    // Filter source entries that have content
    const sourceWithContent = sourceEntries.filter(e => e.content && e.content.trim() !== '')

    // Filter target entries to candidates (skip holidays unless overwrite)
    const targetCandidates = targetEntries.filter(e => {
      if (e.isHoliday) return false  // never overwrite holidays
      if (!overwrite && e.content && e.content.trim() !== '') return false  // skip non-empty if not overwriting
      return true
    })

    const updates = []
    for (let i = 0; i < Math.min(sourceWithContent.length, targetCandidates.length); i++) {
      updates.push(
        prisma.scheduleEntry.update({
          where: { id: targetCandidates[i].id },
          data: {
            content: sourceWithContent[i].content,
            notes: sourceWithContent[i].notes,
            rowColor: sourceWithContent[i].rowColor,
            driveLink: sourceWithContent[i].driveLink,
          }
        })
      )
    }

    await prisma.$transaction(updates)
    revalidatePath('/dashboard/classes/[id]', 'page')
    return { success: true, count: updates.length }
  } catch (error: any) {
    return { success: false, message: `Erro ao espelhar plano: ${error.message}` }
  }
}
