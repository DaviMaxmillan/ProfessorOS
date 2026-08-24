'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'

export async function createSpecialNeedCategoryAction(data: { name: string, color: string, icon?: string }) {
  await requireAuth()

  try {
    const cat = await prisma.specialNeedCategory.create({
      data: {
        name: data.name,
        color: data.color,
        icon: data.icon || null
      }
    })
    revalidatePath('/dashboard/special-needs')
    return { success: true, category: cat }
  } catch (error: any) {
    console.error(error)
    return { success: false, message: error.message || 'Erro ao criar categoria' }
  }
}

export async function deleteSpecialNeedCategoryAction(id: string) {
  await requireAuth()

  try {
    await prisma.specialNeedCategory.delete({
      where: { id }
    })
    revalidatePath('/dashboard/special-needs')
    return { success: true }
  } catch (error: any) {
    console.error(error)
    return { success: false, message: error.message || 'Erro ao excluir categoria' }
  }
}

export async function ensureSpecialNeedCategoriesMigratedAction() {
  await requireAuth()

  try {
    const hardcoded = [
      { name: 'Saúde', color: '#ef4444', value: 'SAUDE', icon: '🔴' },
      { name: 'Pedagógica', color: '#f59e0b', value: 'PEDAGOGICA', icon: '🟡' },
      { name: 'Mobilidade', color: '#3b82f6', value: 'MOBILIDADE', icon: '🔵' },
      { name: 'Transporte / Ônibus', color: '#10b981', value: 'TRANSPORTE', icon: '🚌' },
      { name: 'Legal / Judicial', color: '#9ca3af', value: 'LEGAL', icon: '⚪' },
      { name: 'Outro', color: '#8b5cf6', value: 'OUTRO', icon: '🟣' },
    ]

    for (const h of hardcoded) {
      let dbCat = await prisma.specialNeedCategory.findUnique({ where: { name: h.name } })
      
      // Se não existe, criamos (ideal para inicialização).
      if (!dbCat) {
        dbCat = await prisma.specialNeedCategory.create({
          data: {
            name: h.name,
            color: h.color,
            icon: h.icon
          }
        })
      }

      // Agora migramos todos os `SpecialNeed` antigos que tenham category === h.value e categoryId null
      await prisma.specialNeed.updateMany({
        where: {
          category: h.value,
          categoryId: null
        },
        data: {
          categoryId: dbCat.id
        }
      })
    }

    return { success: true }
  } catch (error: any) {
    console.error("Migration error:", error)
    return { success: false, message: error.message }
  }
}
