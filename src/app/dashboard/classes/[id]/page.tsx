export const dynamic = 'force-dynamic'

import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import ClassTabs from './ClassTabs'
import ClassHeader from './ClassHeader'
import { requireAuth } from '@/lib/auth'
import { classDetailInclude, classSummaryInclude } from '@/lib/types'

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth()

  const { id } = await params
  
  const classData = await prisma.class.findUnique({
    where: { id },
    include: classDetailInclude,
  })

  // All classes for copy/mirror feature
  const allClasses = await prisma.class.findMany({
    include: classSummaryInclude,
    orderBy: { order: 'asc' }
  })

  if (!classData) {
    notFound()
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Link href="/dashboard/classes" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', textDecoration: 'none' }}>
          <ArrowLeft size={16} /> Voltar para Turmas
        </Link>
      </div>

      <ClassHeader classData={classData} />

      <ClassTabs classData={classData} allClasses={allClasses} />
    </div>
  )
}
