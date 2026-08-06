import prisma from '@/lib/prisma'
import Link from 'next/link'
import { Users, ChevronRight } from 'lucide-react'
import CreateClassForm from './CreateClassForm'

export default async function ClassesPage() {
  const classes = await prisma.class.findMany({
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

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Turmas</h1>
          <p className="page-description">Gerencie suas disciplinas e semestres.</p>
        </div>
        <CreateClassForm />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {classes.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
            <p>Você ainda não tem nenhuma turma cadastrada.</p>
            <p style={{ fontSize: '0.9rem', marginTop: '8px' }}>Clique em "Nova Turma" para começar.</p>
          </div>
        ) : (
          classes.map((c) => (
            <Link key={c.id} href={`/dashboard/classes/${c.id}`} style={{ textDecoration: 'none' }}>
              <div className="glass-panel class-card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s ease', cursor: 'pointer' }}>
                <div>
                  <h2 style={{ fontSize: '1.3rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {c.subject.name}
                  </h2>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    {c.semester.name}
                  </p>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                      <Users size={16} />
                      <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                        {c._count.enrollments}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Alunos</span>
                  </div>
                  <ChevronRight size={24} color="var(--text-secondary)" />
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
