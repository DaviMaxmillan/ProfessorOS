'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

async function getOrCreateSettings() {
  let settings = await prisma.settings.findFirst()
  if (!settings) {
    settings = await prisma.settings.create({
      data: { password: '', theme: 'dark' }
    })
  }
  return settings
}

export async function getThemeAction(): Promise<string> {
  const settings = await getOrCreateSettings()
  return settings.theme
}

export async function saveThemeAction(theme: string) {
  const settings = await getOrCreateSettings()
  await prisma.settings.update({
    where: { id: settings.id },
    data: { theme }
  })
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function getAccentColorAction(): Promise<string | null> {
  // Accent color still uses localStorage (client-side only, already working)
  return null
}
