'use server'

import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function getFiltersAction() {
  await requireAuth()

  const semesters = await prisma.semester.findMany()
  const subjects = await prisma.subject.findMany()
  const classes = await prisma.class.findMany({
    include: {
      semester: true,
      subject: true
    }
  })
  
  return { semesters, subjects, classes }
}

export async function getClassReportAction(classId: string) {
  await requireAuth()

  const classData = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      semester: true,
      subject: true,
      activities: true,
      enrollments: {
        include: {
          student: true,
          grades: true,
          attendances: true
        }
      }
    }
  })
  
  return classData
}
