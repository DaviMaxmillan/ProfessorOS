export const dynamic = 'force-dynamic'

import prisma from '@/lib/prisma'
import NeedsManager from './NeedsManager'
import { ensureSpecialNeedCategoriesMigratedAction } from '@/app/actions/specialNeedCategories'
import { requireAuth } from '@/lib/auth'
import {
  classWithStudentsInclude,
  specialNeedInclude,
  studentSpecialNeedInclude,
} from '@/lib/types'

export default async function SpecialNeedsPage() {
  await requireAuth()

  await ensureSpecialNeedCategoriesMigratedAction()

  const [categories, specialNeeds, studentNeeds, allClasses] = await Promise.all([
    prisma.specialNeedCategory.findMany({
      orderBy: { name: 'asc' }
    }),
    prisma.specialNeed.findMany({
      include: specialNeedInclude,
      orderBy: { createdAt: 'asc' }
    }),
    prisma.studentSpecialNeed.findMany({
      include: studentSpecialNeedInclude,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.class.findMany({
      include: classWithStudentsInclude,
      orderBy: { order: 'asc' }
    })
  ])

  return (
    <NeedsManager 
      initialCategories={categories}
      initialNeeds={specialNeeds} 
      initialStudentNeeds={studentNeeds} 
      allClasses={allClasses} 
    />
  )
}
