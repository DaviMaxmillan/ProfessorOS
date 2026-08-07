export const dynamic = 'force-dynamic'

import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen, GraduationCap } from 'lucide-react'

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      enrollments: {
        include: {
          class: {
            include: {
              semester: true,
              subject: true
            }
          }
        },
        orderBy: {
          class: {
            semester: {
              name: 'desc'
            }
          }
        }
      }
    }
  })

  if (!student) {
    notFound()
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Link href="/dashboard/students" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', textDecoration: 'none' }}>
          <ArrowLeft size={16} /> Voltar para Alunos
        </Link>
      </div>

      <div className="page-header" style={{ alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>
            <GraduationCap size={40} />
          </div>
          <div>
            <h1 className="page-title">{student.name}</h1>
            <p className="page-description">RGM: {student.rgm || 'Não informado'}</p>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden', marginTop: '32px' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={20} color="var(--accent)" /> 
            Histórico de Turmas
          </h3>
        </div>
        
        {student.enrollments.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>Este aluno não está matriculado em nenhuma turma.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)', textAlign: 'left' }}>
                <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: '500', borderBottom: '1px solid var(--surface-border)' }}>Disciplina</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: '500', borderBottom: '1px solid var(--surface-border)' }}>Semestre</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: '500', borderBottom: '1px solid var(--surface-border)' }}>Status</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: '500', borderBottom: '1px solid var(--surface-border)', textAlign: 'center' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {student.enrollments.map((enrollment, index) => (
                <tr key={enrollment.id} style={{ borderBottom: '1px solid var(--surface-border)', background: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                  <td style={{ padding: '16px 20px', fontWeight: '500', color: 'var(--text-primary)' }}>
                    {enrollment.class.subject.name}
                  </td>
                  <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                    {enrollment.class.semester.name}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#4ade80', fontSize: '0.9rem' }}>
                      <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80' }}></span>
                      Matriculado
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <Link href={`/dashboard/classes/${enrollment.classId}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.9rem' }}>
                      Ver Turma
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
