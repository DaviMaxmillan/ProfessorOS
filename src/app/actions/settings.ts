'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'

const DEFAULT_THEME = 'dark'

/**
 * Lido pelo ThemeProvider, que envolve inclusive a tela de login — por isso é a
 * única action que não exige sessão. O tema não é um dado sensível.
 *
 * Somente leitura de propósito: criar o registro de Settings aqui gravaria uma
 * senha vazia e atrapalharia o fluxo de primeiro acesso.
 */
export async function getThemeAction(): Promise<string> {
  const settings = await prisma.settings.findFirst({ select: { theme: true } })
  return settings?.theme ?? DEFAULT_THEME
}

export async function saveThemeAction(theme: string) {
  await requireAuth()

  if (theme !== 'dark' && theme !== 'light') {
    return { success: false, error: 'Tema inválido.' }
  }

  const settings = await prisma.settings.findFirst({ select: { id: true } })
  if (!settings) {
    return { success: false, error: 'Configurações não encontradas.' }
  }

  await prisma.settings.update({
    where: { id: settings.id },
    data: { theme },
  })

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function getAccentColorAction(): Promise<string | null> {
  // A cor de destaque continua no localStorage (client-side apenas).
  return null
}
