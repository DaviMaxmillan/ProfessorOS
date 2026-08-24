export const dynamic = 'force-dynamic'

import prisma from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight, ArrowLeft, BookOpen, Users, Clock } from 'lucide-react'
import CreateClassForm from '../../../../CreateClassForm'
import ClassSortableList from '../../../../ClassSortableList'
import { requireAuth } from '@/lib/auth'

export default async function SemesterClassesPage({
  params
}: {
  params: Promise<{ institutionId: string; semesterId: string }>
}) {
  await requireAuth()

  const { institutionId, semesterId } = await params

  const [semester, semesters, institutions] = await Promise.all([
    prisma.semester.findUnique({ where: { id: semesterId } }),
    prisma.semester.findMany({ orderBy: { name: 'desc' } }),
    prisma.institution.findMany({ orderBy: { name: 'asc' } }),
  ])

  if (!semester) notFound()

  const institution = institutionId !== 'none'
    ? await prisma.institution.findUnique({ where: { id: institutionId } })
    : null

  const classes = await prisma.class.findMany({
    where: {
      semesterId,
      institutionId: institutionId === 'none' ? null : institutionId
    },
    include: {
      subject: true,
      _count: { select: { enrollments: true } }
    },
    orderBy: { order: 'asc' }
  })

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
        <Link href="/dashboard/classes" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Turmas</Link>
        <ChevronRight size={14} />
        <Link href={`/dashboard/classes/inst/${institutionId}`} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
          {institution?.name || 'Sem Instituição'}
        </Link>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--text-primary)' }}>{semester.name}</span>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">{semester.name}</h1>
          <p className="page-description">
            {institution?.name || 'Sem Instituição'} • {classes.length} {classes.length === 1 ? 'turma' : 'turmas'}
          </p>
        </div>
        <CreateClassForm
          semesters={semesters}
          institutions={institutions}
          defaultInstitutionName={institution?.name}
          defaultSemesterName={semester.name}
        />
      </div>

      <ClassSortableList initialClasses={classes} />
    </div>
  )
}
