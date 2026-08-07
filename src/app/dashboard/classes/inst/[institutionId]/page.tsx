export const dynamic = 'force-dynamic'

import prisma from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight, ArrowLeft, Calendar } from 'lucide-react'
import CreateSemesterButton from '../../CreateSemesterButton'

export default async function InstitutionPage({ params }: { params: Promise<{ institutionId: string }> }) {
  const { institutionId } = await params

  let institutionName = 'Sem Instituição'
  let institution: { id: string; name: string } | null = null

  if (institutionId !== 'none') {
    institution = await prisma.institution.findUnique({ where: { id: institutionId } })
    if (!institution) notFound()
    institutionName = institution.name
  }

  // Busca semestres que têm turmas nesta instituição
  const semesterFilter = institutionId === 'none'
    ? { classes: { some: { institutionId: null } } }
    : { classes: { some: { institutionId } } }

  const semesters = await prisma.semester.findMany({
    where: semesterFilter,
    include: {
      _count: {
        select: {
          classes: {
            where: institutionId === 'none' ? { institutionId: null } : { institutionId }
          }
        }
      }
    },
    orderBy: { name: 'desc' }
  })

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ marginBottom: '8px' }}>
        <Link href="/dashboard/classes" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem' }}>
          <ArrowLeft size={14} /> Turmas
        </Link>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">{institutionName}</h1>
          <p className="page-description">
            {semesters.length === 0
              ? 'Ainda não há semestres. Clique em "Novo Semestre" para começar.'
              : 'Selecione um semestre para ver as turmas.'}
          </p>
        </div>
        {/* Só mostra o botão se for uma instituição real (não "Sem Instituição") */}
        {institutionId !== 'none' && (
          <CreateSemesterButton institutionId={institutionId} />
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {semesters.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
            <Calendar size={48} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
            <p style={{ marginBottom: '8px' }}>Nenhum semestre cadastrado ainda.</p>
            <p style={{ fontSize: '0.9rem' }}>Use o botão "Novo Semestre" para criar o primeiro semestre desta instituição.</p>
          </div>
        ) : (
          semesters.map((sem) => (
            <Link
              key={sem.id}
              href={`/dashboard/classes/inst/${institutionId}/sem/${sem.id}`}
              style={{ textDecoration: 'none' }}
            >
              <div className="glass-panel class-card" style={{
                padding: '22px 28px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '46px', height: '46px', borderRadius: '12px',
                    background: 'rgba(165, 180, 252, 0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--accent)'
                  }}>
                    <Calendar size={22} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '2px' }}>
                      {sem.name}
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {sem._count.classes} {sem._count.classes === 1 ? 'turma' : 'turmas'}
                    </p>
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
