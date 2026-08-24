export const dynamic = 'force-dynamic'

import prisma from '@/lib/prisma'
import { BookOpen, Users, Calendar, AlertTriangle, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import { enrollmentWithClassInclude, type EnrollmentWithClass } from '@/lib/types'

export default async function DashboardPage() {
  await requireAuth()

  const [totalStudents, totalClasses, totalSemesters, recentClasses, allEnrollments] = await Promise.all([
    prisma.student.count({ where: { enrollments: { some: {} } } }),
    prisma.class.count(),
    prisma.semester.count({ where: { classes: { some: {} } } }),
    prisma.class.findMany({
      take: 5,
      include: {
        semester: true,
        subject: true,
        _count: { select: { enrollments: true } }
      },
      orderBy: { id: 'desc' }
    }),
    prisma.enrollment.findMany({
      include: enrollmentWithClassInclude
    })
  ])

  // --- Risk Detection ---
  const atRiskStudents: { name: string; rgm: string | null; classLabel: string; classId: string; reason: string }[] = []

  allEnrollments.forEach(enrollment => {
    const totalAulas = enrollment.class.scheduleEntries.filter(se => !se.isHoliday).length
    const absenceRate = totalAulas > 0 ? enrollment.absences / totalAulas : 0
    const hasAbsenceRisk = absenceRate >= 0.25 && totalAulas > 0

    const gradeSum = enrollment.grades.reduce((s, g) => s + g.value, 0)
    const gradeAvg = enrollment.grades.length > 0
      ? (enrollment.class.calculationMethod === 'AVERAGE' ? gradeSum / enrollment.grades.length : gradeSum)
      : null
    const hasGradeRisk = gradeAvg !== null && gradeAvg < 6

    if (hasAbsenceRisk || hasGradeRisk) {
      let reason = ''
      if (hasAbsenceRisk && hasGradeRisk) reason = '🔴 Faltas + Nota baixa'
      else if (hasAbsenceRisk) reason = '🟠 Faltas excessivas'
      else reason = '🟡 Nota abaixo da média'

      atRiskStudents.push({
        name: enrollment.student.name,
        rgm: enrollment.student.rgm,
        classLabel: `${enrollment.class.subject.name}${enrollment.class.turmaName ? ` — ${enrollment.class.turmaName}` : ''}`,
        classId: enrollment.classId,
        reason,
      })
    }
  })

  // --- Chart Data: students per class (top 7) ---
  const chartClasses = recentClasses.slice(0, 7)
  const maxStudents = Math.max(...chartClasses.map(c => c._count.enrollments), 1)

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

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {[
          { label: 'Total de Alunos', value: totalStudents, icon: <Users size={24} /> },
          { label: 'Turmas Ativas', value: totalClasses, icon: <BookOpen size={24} /> },
          { label: 'Semestres', value: totalSemesters, icon: <Calendar size={24} /> },
          { label: 'Alunos em Risco', value: atRiskStudents.length, icon: <AlertTriangle size={24} />, danger: atRiskStudents.length > 0 },
        ].map(stat => (
          <div key={stat.label} className="glass-panel" style={{ padding: '22px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0,
              background: stat.danger ? 'rgba(239,68,68,0.1)' : 'rgba(165, 180, 252, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: stat.danger ? '#ef4444' : 'var(--accent)'
            }}>
              {stat.icon}
            </div>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{stat.label}</p>
              <h2 style={{ fontSize: '1.9rem', fontWeight: '700', color: stat.danger && stat.value > 0 ? '#ef4444' : 'var(--text-primary)' }}>{stat.value}</h2>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px' }}>
        {/* Bar Chart: Alunos por Turma */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} color="var(--accent)" /> Alunos por Turma
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '20px' }}>Turmas mais recentes</p>
          {chartClasses.length === 0
            ? <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 0' }}>Sem dados ainda.</p>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {chartClasses.map(c => {
                  const pct = (c._count.enrollments / maxStudents) * 100
                  return (
                    <Link key={c.id} href={`/dashboard/classes/${c.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', width: '100px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.subject.name}{c.turmaName ? ` ${c.turmaName}` : ''}
                        </span>
                        <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: '4px', transition: 'width 0.6s ease' }} />
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', width: '24px', textAlign: 'right', flexShrink: 0 }}>
                          {c._count.enrollments}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )
          }
        </div>

        {/* Donut Chart: Estimativa de Aprovação */}
        <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>📊 Estimativa de Aprovação</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '20px' }}>Com base nas notas lançadas</p>
          <ApprovalDonut enrollments={allEnrollments} />
        </div>
      </div>

      {/* Risk Alert Panel */}
      {atRiskStudents.length > 0 && (
        <div className="glass-panel" style={{ padding: '28px', marginBottom: '28px', border: '1px solid rgba(239,68,68,0.2)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={20} color="#ef4444" />
            <span>Alunos em Risco <span style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '20px', padding: '2px 10px', fontSize: '0.85rem', marginLeft: '4px' }}>{atRiskStudents.length}</span></span>
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {atRiskStudents.slice(0, 8).map((s, i) => (
              <Link key={i} href={`/dashboard/classes/${s.classId}`} style={{ textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.1)', borderRadius: '10px', transition: 'background 0.2s' }}>
                <div>
                  <p style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{s.name}</p>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{s.classLabel}{s.rgm ? ` • RGM: ${s.rgm}` : ''}</p>
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 500, flexShrink: 0, marginLeft: '12px' }}>{s.reason}</span>
              </Link>
            ))}
            {atRiskStudents.length > 8 && (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                + {atRiskStudents.length - 8} outros alunos em risco
              </p>
            )}
          </div>
        </div>
      )}

      {/* Recent Classes */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '20px' }}>Turmas Recentes</h2>
        {recentClasses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
            <p>Nenhuma turma cadastrada ainda.</p>
            <Link href="/dashboard/import" style={{ color: 'var(--accent)', textDecoration: 'none', marginTop: '8px', display: 'inline-block' }}>
              Faça a primeira importação
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentClasses.map(c => (
              <Link key={c.id} href={`/dashboard/classes/${c.id}`} style={{ textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px', border: '1px solid var(--surface-border)', transition: 'border-color 0.2s' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--text-primary)' }}>{c.subject.name}{c.turmaName ? ` — ${c.turmaName}` : ''}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{c.semester.name}{c.schedule ? ` • ${c.schedule}` : ''}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: '1.2rem', fontWeight: '600' }}>{c._count.enrollments}</p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Alunos</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ApprovalDonut({ enrollments }: { enrollments: EnrollmentWithClass[] }) {
  let approved = 0
  let failed = 0
  let noData = 0

  enrollments.forEach(e => {
    if (!e.grades || e.grades.length === 0) { noData++; return }
    const sum = e.grades.reduce((s, g) => s + g.value, 0)
    const avg = e.class.calculationMethod === 'AVERAGE' ? sum / e.grades.length : sum
    if (avg >= 6) approved++
    else failed++
  })

  const total = approved + failed + noData
  if (total === 0) return <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 0' }}>Sem dados de notas ainda.</p>

  const approvedPct = Math.round((approved / total) * 100)

  // SVG donut
  const cx = 60, cy = 60, r = 50, strokeW = 14
  const circ = 2 * Math.PI * r
  const approvedDash = (approved / total) * circ
  const failedDash = (failed / total) * circ

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flex: 1 }}>
      <svg width="120" height="120" viewBox="0 0 120 120" style={{ flexShrink: 0 }}>
        {/* bg */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeW} />
        {/* no data */}
        {noData > 0 && (
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={strokeW}
            strokeDasharray={`${(noData / total) * circ} ${circ}`}
            strokeDashoffset={0}
            transform={`rotate(-90 ${cx} ${cy})`} />
        )}
        {/* failed */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ef4444" strokeWidth={strokeW}
          strokeDasharray={`${failedDash} ${circ}`}
          strokeDashoffset={-((noData / total) * circ)}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`} />
        {/* approved */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#10b981" strokeWidth={strokeW}
          strokeDasharray={`${approvedDash} ${circ}`}
          strokeDashoffset={-(((noData + failed) / total) * circ)}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`} />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="var(--text-primary)" fontSize="18" fontWeight="700">{approvedPct}%</text>
        <text x={cx} y={cy + 16} textAnchor="middle" dominantBaseline="middle" fill="var(--text-secondary)" fontSize="9">aprovados</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {[
          { color: '#10b981', label: 'Aprovados', value: approved },
          { color: '#ef4444', label: 'Em risco', value: failed },
          { color: 'rgba(255,255,255,0.15)', label: 'Sem nota', value: noData },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{item.label}</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginLeft: 'auto' }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
