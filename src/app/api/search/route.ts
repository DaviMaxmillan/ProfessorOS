import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { isAuthenticated } from '@/lib/auth'

export async function GET(request: NextRequest) {
  // Segunda linha de defesa: o proxy já barra requisições sem sessão, mas a
  // rota expõe nome e RGM de alunos e valida por conta própria.
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''

  if (!q || q.length < 2) {
    return NextResponse.json([])
  }

  const [students, classes] = await Promise.all([
    prisma.student.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { rgm: { contains: q, mode: 'insensitive' } },
        ]
      },
      take: 5,
    }),
    prisma.class.findMany({
      where: {
        OR: [
          { subject: { name: { contains: q, mode: 'insensitive' } } },
          { turmaName: { contains: q, mode: 'insensitive' } },
        ]
      },
      include: { semester: true, subject: true },
      take: 5,
    }),
  ])

  const results = [
    ...students.map(s => ({
      id: s.id,
      type: 'student' as const,
      title: s.name,
      subtitle: s.rgm ? `RGM: ${s.rgm}` : 'RGM não informado',
      href: `/dashboard/students/${s.id}`,
    })),
    ...classes.map(c => ({
      id: c.id,
      type: 'class' as const,
      title: `${c.subject.name}${c.turmaName ? ` — ${c.turmaName}` : ''}`,
      subtitle: `${c.semester.name}${c.schedule ? ` • ${c.schedule}` : ''}`,
      href: `/dashboard/classes/${c.id}`,
    })),
  ]

  return NextResponse.json(results)
}
