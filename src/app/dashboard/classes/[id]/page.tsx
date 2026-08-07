export const dynamic = 'force-dynamic'

import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import ClassTabs from './ClassTabs'
import ClassHeader from './ClassHeader'

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const classData = await prisma.class.findUnique({
    where: { id },
    include: {
      institution: true,
      semester: true,
      subject: true,
      activities: {
        orderBy: { createdAt: 'asc' }
      },
      scheduleEntries: {
        orderBy: { date: 'asc' }
      },
      enrollments: {
        include: {
          student: true,
          grades: true
        },
        orderBy: {
          student: {
            name: 'asc'
          }
        }
      },
      groupWorks: {
        include: {
          activity: true,
          groups: {
            include: {
              members: {
                include: {
                  enrollment: {
                    include: {
                      student: true
                    }
                  }
                }
              }
            }
          }
        }
      },
      classNotes: {
        orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }]
      }
    }
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

      <ClassTabs classData={classData} />
    </div>
  )
}
