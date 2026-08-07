import prisma from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight, ArrowLeft, BookOpen, Users, Clock } from 'lucide-react'
import CreateClassForm from '../../../../CreateClassForm'

export default async function SemesterClassesPage({
  params
}: {
  params: Promise<{ institutionId: string; semesterId: string }>
}) {
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
    orderBy: { id: 'desc' }
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {classes.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
            <BookOpen size={48} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
            <p style={{ marginBottom: '8px' }}>Nenhuma turma neste semestre.</p>
            <p style={{ fontSize: '0.85rem' }}>Clique em "Nova Turma" para adicionar.</p>
          </div>
        ) : (
          classes.map((c) => (
            <Link key={c.id} href={`/dashboard/classes/${c.id}`} style={{ textDecoration: 'none' }}>
              <div className="glass-panel class-card" style={{
                padding: '20px 28px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '10px',
                    background: 'rgba(165, 180, 252, 0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--accent)', flexShrink: 0
                  }}>
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {c.subject.name}{c.turmaName ? ` — ${c.turmaName}` : ''}
                    </h3>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        <Users size={14} />
                        {c._count.enrollments} {c._count.enrollments === 1 ? 'aluno' : 'alunos'}
                      </span>
                      {c.schedule && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          <Clock size={14} />
                          {c.schedule}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight size={24} color="var(--text-secondary)" />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
