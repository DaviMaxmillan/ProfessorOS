/**
 * Tipos do domínio derivados do schema do Prisma.
 *
 * A página de detalhe da turma busca a turma com um `include` grande, e esse
 * mesmo objeto é repassado para todas as abas e para a exportação em Excel.
 * Antes cada consumidor declarava o parâmetro como `any`, o que significava
 * que renomear um campo no schema não quebrava nada em tempo de compilação —
 * o erro só aparecia em produção, na tela.
 *
 * Aqui o `include` é declarado uma única vez e os tipos são gerados a partir
 * dele. Mudou o schema ou o include, o TypeScript aponta todos os lugares
 * afetados.
 */

import { Prisma } from '@prisma/client'

/** O `include` usado pela página de detalhe da turma. */
export const classDetailInclude = Prisma.validator<Prisma.ClassInclude>()({
  institution: true,
  semester: true,
  subject: true,
  activities: {
    orderBy: { createdAt: 'asc' },
  },
  scheduleEntries: {
    orderBy: { date: 'asc' },
  },
  enrollments: {
    include: {
      student: true,
      grades: true,
    },
    orderBy: {
      student: {
        name: 'asc',
      },
    },
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
                  student: true,
                },
              },
            },
          },
        },
      },
    },
  },
  classNotes: {
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
  },
} satisfies Prisma.ClassInclude)

/** Turma com todas as relações carregadas pela página de detalhe. */
export type ClassDetail = Prisma.ClassGetPayload<{
  include: typeof classDetailInclude
}>

/** Matrícula com o aluno e as notas — as linhas das abas de notas e frequência. */
export type EnrollmentDetail = ClassDetail['enrollments'][number]

/** Atividade avaliativa da turma. */
export type ActivityDetail = ClassDetail['activities'][number]

/** Uma aula do cronograma. */
export type ScheduleEntryDetail = ClassDetail['scheduleEntries'][number]

/** Trabalho em grupo com seus grupos e membros. */
export type GroupWorkDetail = ClassDetail['groupWorks'][number]

/** Um grupo dentro de um trabalho. */
export type GroupDetail = GroupWorkDetail['groups'][number]

/** Recado/anotação fixada na turma. */
export type ClassNoteDetail = ClassDetail['classNotes'][number]

/** O `include` das turmas listadas para copiar/espelhar cronograma. */
export const classSummaryInclude = Prisma.validator<Prisma.ClassInclude>()({
  subject: true,
  semester: true,
  scheduleEntries: { orderBy: { date: 'asc' } },
} satisfies Prisma.ClassInclude)

/** Turma reduzida, usada nos seletores de turma. */
export type ClassSummary = Prisma.ClassGetPayload<{
  include: typeof classSummaryInclude
}>

/** Como a turma calcula a média final. */
export type CalculationMethod = 'SUM' | 'AVERAGE'

/** Campos editáveis de um recado da turma. */
export type NoteInput = {
  title?: string
  content?: string
  color?: string
  label?: string
  fontSize?: number
  pinned?: boolean
}

/** Campos obrigatórios ao criar um recado. */
export type NoteCreateInput = NoteInput & { content: string }

/** O `include` das matrículas carregadas no painel inicial. */
export const enrollmentWithClassInclude = Prisma.validator<Prisma.EnrollmentInclude>()({
  student: true,
  grades: true,
  class: { include: { subject: true, semester: true, scheduleEntries: true } },
} satisfies Prisma.EnrollmentInclude)

/** Matrícula com aluno, notas e a turma — as linhas do painel inicial. */
export type EnrollmentWithClass = Prisma.EnrollmentGetPayload<{
  include: typeof enrollmentWithClassInclude
}>

// ---- Acompanhamento de necessidades especiais ----

/** Necessidade especial com a categoria e a contagem de alunos vinculados. */
export const specialNeedInclude = Prisma.validator<Prisma.SpecialNeedInclude>()({
  _count: { select: { studentNeeds: true } },
  categoryRef: true,
} satisfies Prisma.SpecialNeedInclude)

export type SpecialNeedDetail = Prisma.SpecialNeedGetPayload<{
  include: typeof specialNeedInclude
}>

/** Vínculo aluno <-> necessidade, com a turma em que ele vale. */
export const studentSpecialNeedInclude = Prisma.validator<Prisma.StudentSpecialNeedInclude>()({
  student: true,
  specialNeed: { include: { categoryRef: true } },
  enrollment: {
    include: {
      class: { include: { subject: true, semester: true } },
    },
  },
} satisfies Prisma.StudentSpecialNeedInclude)

export type StudentSpecialNeedDetail = Prisma.StudentSpecialNeedGetPayload<{
  include: typeof studentSpecialNeedInclude
}>

/** Turma com os alunos matriculados, usada na busca de matrícula. */
export const classWithStudentsInclude = Prisma.validator<Prisma.ClassInclude>()({
  subject: true,
  semester: true,
  enrollments: { include: { student: true } },
} satisfies Prisma.ClassInclude)

export type ClassWithStudents = Prisma.ClassGetPayload<{
  include: typeof classWithStudentsInclude
}>

/** Uma matrícula encontrada na busca, já com a turma a que pertence. */
export type EnrollmentSearchResult =
  ClassWithStudents['enrollments'][number] & { class: ClassWithStudents }

/** Categoria de necessidade especial. */
export type SpecialNeedCategory = Prisma.SpecialNeedCategoryGetPayload<object>

/** O `include` das turmas da lista ordenável por arrastar. */
export const classSortableInclude = Prisma.validator<Prisma.ClassInclude>()({
  subject: true,
  _count: { select: { enrollments: true } },
} satisfies Prisma.ClassInclude)

/** Turma como aparece na lista ordenável. */
export type ClassSortable = Prisma.ClassGetPayload<{
  include: typeof classSortableInclude
}>
