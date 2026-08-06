'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, BookOpen, Upload, LogOut, Settings } from 'lucide-react'
import { logoutAction } from '@/app/actions/auth'
import './dashboard.css'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const navItems = [
    { name: 'Visão Geral', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Turmas', href: '/dashboard/classes', icon: BookOpen },
    { name: 'Alunos', href: '/dashboard/students', icon: Users },
    { name: 'Importar', href: '/dashboard/import', icon: Upload },
    { name: 'Configurações', href: '/dashboard/settings', icon: Settings },
  ]

  return (
    <div className="dashboard-layout">
      <aside className="sidebar glass-panel">
        <div className="sidebar-header">
          <h2 className="logo-text">Professor<span>OS</span></h2>
        </div>
        
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <form action={logoutAction}>
            <button type="submit" className="nav-item logout-btn">
              <LogOut size={20} />
              <span>Sair</span>
            </button>
          </form>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  )
}
