export const dynamic = 'force-dynamic'

import prisma from '@/lib/prisma'
import NeedsManager from './NeedsManager'

export default async function SpecialNeedsPage() {
  const [specialNeeds, studentNeeds, allClasses] = await Promise.all([
    prisma.specialNeed.findMany({
      include: { _count: { select: { studentNeeds: true } } },
      orderBy: { createdAt: 'asc' }
    }),
    prisma.studentSpecialNeed.findMany({
      include: {
        student: true,
        specialNeed: true,
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

  return <NeedsManager
    initialNeeds={specialNeeds}
    initialStudentNeeds={studentNeeds}
    allClasses={allClasses}
  />
}
