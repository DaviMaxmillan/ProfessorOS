'use server'

import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'

export async function loginAction(prevState: any, formData: FormData) {
  const password = formData.get('password') as string

  if (!password) {
    return { error: 'A senha é obrigatória.' }
  }

  // Verificar se já existe uma senha configurada
  const settings = await prisma.settings.findFirst()

  if (!settings) {
    // Configuração inicial (primeiro acesso)
    const hashedPassword = await bcrypt.hash(password, 10)
    await prisma.settings.create({
      data: { password: hashedPassword }
    })
    
    // Set cookie
    const cookieStore = await cookies()
    cookieStore.set('auth_session', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 dias
      path: '/'
    })
    
    redirect('/dashboard')
  } else {
    // Verificar senha existente
    const isValid = await bcrypt.compare(password, settings.password)
    
    if (!isValid) {
      return { error: 'Senha incorreta.' }
    }
    
    // Set cookie
    const cookieStore = await cookies()
    cookieStore.set('auth_session', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 dias
      path: '/'
    })
    
    redirect('/dashboard')
  }
}

export async function checkHasPassword() {
  const settings = await prisma.settings.findFirst()
  return !!settings
}

export async function logoutAction() {
  const cookieStore = await cookies()
  cookieStore.delete('auth_session')
  redirect('/login')
}
