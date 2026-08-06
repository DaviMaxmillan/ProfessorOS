import prisma from '@/lib/prisma'
import Link from 'next/link'
import { Search } from 'lucide-react'

export default async function StudentsPage({
  searchParams,
}: {
  searchParams?: {
    q?: string
  }
}) {
  const query = searchParams?.q || ''

  const students = await prisma.student.findMany({
    where: {
      OR: [
        { name: { contains: query } },
        { rgm: { contains: query } }
      ]
    },
    include: {
      _count: {
        select: { enrollments: true }
      }
    },
    orderBy: {
      name: 'asc'
    }
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Alunos</h1>
          <p className="page-description">Gerencie e pesquise o histórico de todos os seus alunos.</p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
        <form style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.2)', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
          <Search size={20} color="var(--text-secondary)" />
          <input 
            type="text" 
            name="q"
            defaultValue={query}
            placeholder="Buscar por nome ou RGM..." 
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text-primary)', 
              width: '100%', 
              outline: 'none',
              fontSize: '1rem'
            }} 
          />
          <button type="submit" style={{ display: 'none' }}>Buscar</button>
        </form>
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.2)', textAlign: 'left' }}>
              <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: '500', borderBottom: '1px solid var(--surface-border)' }}>Nome do Aluno</th>
              <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: '500', borderBottom: '1px solid var(--surface-border)' }}>RGM / Matrícula</th>
              <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: '500', borderBottom: '1px solid var(--surface-border)', textAlign: 'center' }}>Turmas Cursadas</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Nenhum aluno encontrado.
                </td>
              </tr>
            ) : (
              students.map((student, index) => (
                <tr key={student.id} style={{ borderBottom: '1px solid var(--surface-border)', background: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                  <td style={{ padding: '16px 20px', fontWeight: '500' }}>
                    {/* Futuramente link para a página de detalhes do aluno */}
                    <Link href={`/dashboard/students/${student.id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                      {student.name}
                    </Link>
                  </td>
                  <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>{student.rgm || 'Não informado'}</td>
                  <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '16px', fontSize: '0.9rem' }}>
                      {student._count.enrollments}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
