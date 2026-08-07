'use server'

import prisma from '@/lib/prisma'

export async function getFiltersAction() {
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
