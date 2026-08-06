'use server'

import { revalidatePath } from 'next/cache'
import * as xlsx from 'xlsx'
import prisma from '@/lib/prisma'

export type ImportResult = {
  success: boolean;
  message: string;
  data?: {
    addedStudents: number;
    updatedStudents: number;
  };
}

function parseExcelDate(value: any): Date | undefined {
  if (!value) return undefined;
  if (typeof value === 'number') {
    // Excel starts at 1900-01-01, JS at 1970-01-01 (difference is 25569 days)
    return new Date((value - 25569) * 86400 * 1000);
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  return undefined;
}

export async function importExcelAction(formData: FormData): Promise<ImportResult> {
  try {
    const classId = formData.get('classId') as string
    const file = formData.get('file') as File
    
    if (!classId) return { success: false, message: 'Selecione uma Turma primeiro.' }
    if (!file) return { success: false, message: 'Nenhum arquivo enviado.' }

    const dbClass = await prisma.class.findUnique({
      where: { id: classId }
    })
    
    if (!dbClass) return { success: false, message: 'Turma não encontrada.' }

    const buffer = await file.arrayBuffer()
    const workbook = xlsx.read(buffer, { type: 'buffer' })
    
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rawData = xlsx.utils.sheet_to_json<any[][]>(sheet, { header: 1 })
    
    if (rawData.length === 0) {
      return { success: false, message: 'Planilha vazia.' }
    }

    // Localizar a tabela de alunos
    let headerRowIndex = -1
    let nameColIndex = -1
    let rgmColIndex = -1
    let dateColIndex = -1

    for (let i = 0; i < Math.min(20, rawData.length); i++) {
      const row = rawData[i] || []
      for (let j = 0; j < row.length; j++) {
        const cellValue = String(row[j] || '').toLowerCase().replace(/\s+/g, ' ').trim()
        if (cellValue.includes('nome aluno') || cellValue.includes('nome do aluno') || cellValue === 'nome' || cellValue.includes('aluno')) {
          headerRowIndex = i
          nameColIndex = j
          
          for (let k = 0; k < row.length; k++) {
            const potCol = String(row[k] || '').toLowerCase().replace(/\s+/g, ' ').trim()
            if (potCol === 'rgm' || potCol === 'ra' || potCol === 'matrícula' || potCol.includes('rgm')) {
              rgmColIndex = k
            } else if (potCol.includes('data') && potCol.includes('matrícula')) {
              dateColIndex = k
            }
          }
          break
        }
      }
      if (headerRowIndex !== -1) break
    }

    if (headerRowIndex === -1 || nameColIndex === -1) {
      return { success: false, message: 'Não foi possível localizar a coluna "Nome Aluno" na planilha.' }
    }
    if (rgmColIndex === -1) rgmColIndex = nameColIndex + 1

    const studentsToImport: { name: string, rgm: string, date?: Date }[] = []
    
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const row = rawData[i] || []
      const rawName = row[nameColIndex]
      const rawRGM = row[rgmColIndex]
      const rawDate = dateColIndex !== -1 ? row[dateColIndex] : null
      
      if (typeof rawName === 'string' && rawName.trim().length > 3) {
        const name = rawName.replace(/\s+/g, ' ').trim()
        const rgm = rawRGM ? String(rawRGM).trim() : ''
        
        if (name && !name.toLowerCase().includes('nome do aluno') && !name.toLowerCase().includes('nome aluno') && name.toLowerCase() !== 'nome') {
          studentsToImport.push({ 
            name, 
            rgm,  
            date: parseExcelDate(rawDate)
          })
        }
      }
    }

    if (studentsToImport.length === 0) {
      return { success: false, message: 'Nenhum aluno válido encontrado após o cabeçalho.' }
    }

    let addedStudents = 0
    let updatedStudents = 0

    // O Professor pediu para sincronizar.
    // Pegar as matrículas atuais da turma
    const currentEnrollments = await prisma.enrollment.findMany({
      where: { classId: dbClass.id },
      include: { student: true }
    })

    const existingStudentIds = currentEnrollments.map(e => e.student.id)

    for (const st of studentsToImport) {
      let dbStudent
      
      // Busca por RGM primeiro
      if (st.rgm && st.rgm !== '0' && st.rgm !== 'NaN') {
        dbStudent = await prisma.student.findUnique({ where: { rgm: st.rgm } })
      }
      
      // Busca por Nome se não achou
      if (!dbStudent) {
        dbStudent = await prisma.student.findFirst({ where: { name: st.name } })
      }
      
      if (!dbStudent) {
        // Cria aluno
        dbStudent = await prisma.student.create({
          data: {
            name: st.name,
            rgm: st.rgm && st.rgm !== '0' && st.rgm !== 'NaN' ? st.rgm : null
          }
        })
      } else {
        // Se aluno já existe mas sem RGM, atualiza o RGM
        if (!dbStudent.rgm && st.rgm && st.rgm !== '0' && st.rgm !== 'NaN') {
          await prisma.student.update({
            where: { id: dbStudent.id },
            data: { rgm: st.rgm }
          })
        }
      }

      // Matricular se não estiver
      if (!existingStudentIds.includes(dbStudent.id)) {
        await prisma.enrollment.create({
          data: {
            studentId: dbStudent.id,
            classId: dbClass.id,
            enrollmentDate: st.date
          }
        })
        addedStudents++
      } else {
        // If already enrolled, update the enrollment date if we have a new one
        if (st.date) {
          const existingEnrollment = currentEnrollments.find(e => e.studentId === dbStudent.id)
          if (existingEnrollment) {
            await prisma.enrollment.update({
              where: { id: existingEnrollment.id },
              data: { enrollmentDate: st.date }
            })
          }
        }
        updatedStudents++
      }
    }

    revalidatePath('/dashboard/classes')
    revalidatePath(`/dashboard/classes/${classId}`)
    revalidatePath('/dashboard/students')

    return {
      success: true,
      message: 'Sincronização concluída com sucesso!',
      data: {
        addedStudents,
        updatedStudents
      }
    }
  } catch (error: any) {
    console.error('Erro na importação:', error)
    return { success: false, message: `Erro ao processar arquivo: ${error.message}` }
  }
}
