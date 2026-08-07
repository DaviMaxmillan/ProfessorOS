import prisma from '@/lib/prisma'
import ImportForm from './ImportForm'
import Link from 'next/link'

export default async function ImportPage() {
  const classes = await prisma.class.findMany({
    include: {
      institution: true,
      semester: true,
      subject: true
    },
    orderBy: {
      id: 'desc'
    }
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Sincronizar Turma (Importação)</h1>
          <p className="page-description">Faça o upload da planilha para atualizar a lista de alunos de uma turma específica.</p>
        </div>
      </div>

      {classes.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Você precisa criar uma turma antes de importar alunos.</p>
          <Link href="/dashboard/classes" className="btn-primary" style={{ display: 'inline-block', marginTop: '16px', textDecoration: 'none' }}>
            Ir para Turmas
          </Link>
        </div>
      ) : (
        <ImportForm classes={classes} />
      )}
    </div>
  )
}
