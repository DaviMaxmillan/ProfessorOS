export const dynamic = 'force-dynamic'

import prisma from '@/lib/prisma'
import NeedsManager from './NeedsManager'
import { ensureSpecialNeedCategoriesMigratedAction } from '@/app/actions/specialNeedCategories'

export default async function SpecialNeedsPage() {
  await ensureSpecialNeedCategoriesMigratedAction()

  const [categories, specialNeeds, studentNeeds, allClasses] = await Promise.all([
    prisma.specialNeedCategory.findMany({
      orderBy: { name: 'asc' }
    }),
    prisma.specialNeed.findMany({
      include: { _count: { select: { studentNeeds: true } }, categoryRef: true },
      orderBy: { createdAt: 'asc' }
    }),
    prisma.studentSpecialNeed.findMany({
      include: {
        student: true,
        specialNeed: { include: { categoryRef: true } },
        enrollment: {
          include: {
            class: { include: { subject: true, semester: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.class.findMany({
      include: {
        subject: true,
        semester: true,
        enrollments: { include: { student: true } }
      },
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
