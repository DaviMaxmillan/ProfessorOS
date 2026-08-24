export const dynamic = 'force-dynamic'

import prisma from '@/lib/prisma'
import { Building2 } from 'lucide-react'
import CreateInstitutionButton from './CreateInstitutionButton'
import InstitutionCard from './InstitutionCard'
import { requireAuth } from '@/lib/auth'
import Link from 'next/link'

export default async function ClassesPage() {
  await requireAuth()

  const institutions = await prisma.institution.findMany({
    include: {
      _count: { select: { classes: true } }
    },
    orderBy: { name: 'asc' }
  })

  const orphanClasses = await prisma.class.count({ where: { institutionId: null } })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Turmas</h1>
          <p className="page-description">Selecione uma instituição para ver os semestres e turmas.</p>
        </div>
        <CreateInstitutionButton />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {institutions.length === 0 && orphanClasses === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
            <Building2 size={48} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
            <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Nenhuma instituição cadastrada ainda.</p>
            <p style={{ fontSize: '0.9rem' }}>Clique em “Nova Instituição” para começar.</p>
          </div>
        ) : (
          <>
            {institutions.map((inst) => (
              <InstitutionCard key={inst.id} institution={inst} />
            ))}

            {orphanClasses > 0 && (
              <Link href="/dashboard/classes/inst/none" style={{ textDecoration: 'none' }}>
                <div className="glass-panel class-card" style={{
                  padding: '22px 28px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  opacity: 0.7
                }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                    📁 Sem Instituição ({orphanClasses} {orphanClasses === 1 ? 'turma' : 'turmas'})
                  </p>
                </div>
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  )
}
