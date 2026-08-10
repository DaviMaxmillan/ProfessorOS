export const dynamic = 'force-dynamic'

import prisma from '@/lib/prisma'
import { BookOpen, Users, Calendar } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const [totalStudents, totalClasses, totalSemesters, recentClasses] = await Promise.all([
    prisma.student.count({
      where: {
        enrollments: { some: {} }
      }
    }),
    prisma.class.count(),
    prisma.semester.count({
      where: {
        classes: { some: {} }
      }
    }),
    prisma.class.findMany({
      take: 5,
      include: {
        semester: true,
        subject: true,
        _count: {
          select: { enrollments: true }
        }
      },
      orderBy: {
        id: 'desc'
      }
    })
  ])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Visão Geral</h1>
          <p className="page-description">Resumo das suas turmas e alunos.</p>
        </div>
        <Link href="/dashboard/import" className="btn-primary">
          Importar Planilha
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(165, 180, 252, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
            <Users size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Total de Alunos</p>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '700' }}>{totalStudents}</h2>
          </div>
        </div>
        
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(165, 180, 252, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
            <BookOpen size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Turmas Ativas</p>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '700' }}>{totalClasses}</h2>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(165, 180, 252, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
            <Calendar size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Semestres</p>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '700' }}>{totalSemesters}</h2>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '32px' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '24px' }}>Turmas Recentes</h2>
        
        {recentClasses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
            <p>Nenhuma turma cadastrada ainda.</p>
            <Link href="/dashboard/import" style={{ color: 'var(--accent)', textDecoration: 'none', marginTop: '8px', display: 'inline-block' }}>
              Faça a primeira importação
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {recentClasses.map(c => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '500', color: 'var(--text-primary)' }}>{c.subject.name}{c.turmaName ? ` — ${c.turmaName}` : ''}</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{c.semester.name}{c.schedule ? ` • ${c.schedule}` : ''}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '1.1rem', fontWeight: '600' }}>{c._count.enrollments}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Alunos</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
