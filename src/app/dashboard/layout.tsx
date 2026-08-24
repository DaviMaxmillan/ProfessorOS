'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, BookOpen, Upload, LogOut, Settings,
  ChevronLeft, ChevronRight, BarChart2, Search, Sun, Moon, HeartHandshake
} from 'lucide-react'
import { logoutAction } from '@/app/actions/auth'
import { saveThemeAction } from '@/app/actions/settings'
import { setTheme, usePreferences } from '@/lib/preferences'
import GlobalSearch from '@/components/GlobalSearch'
import './dashboard.css'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(true)
  const { theme } = usePreferences()

  const toggleTheme = async () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    await saveThemeAction(next)
  }

  const navItems = [
    { name: 'Visão Geral', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Turmas', href: '/dashboard/classes', icon: BookOpen },
    { name: 'Alunos', href: '/dashboard/students', icon: Users },
    { name: 'Atenção Especial', href: '/dashboard/special-needs', icon: HeartHandshake },
    { name: 'Importar', href: '/dashboard/import', icon: Upload },
    { name: 'Relatórios', href: '/dashboard/reports', icon: BarChart2 },
    { name: 'Configurações', href: '/dashboard/settings', icon: Settings },
  ]

  return (
    <div className="dashboard-layout">
      <aside className={`sidebar glass-panel ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between', paddingBottom: '32px' }}>
          <h2 className="logo-text">Professor<span>OS</span></h2>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '6px', cursor: 'pointer', display: 'flex' }}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Search button */}
        <button
          onClick={() => {
            // Trigger Ctrl+K event
            window.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: 'k', bubbles: true }))
          }}
          className="nav-item"
          style={{ marginBottom: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--surface-border)' }}
          title="Busca Global (Ctrl+K)"
        >
          <Search size={20} />
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
            <span>Buscar...</span>
            <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.08)', border: '1px solid var(--surface-border)', borderRadius: '4px', padding: '1px 5px', color: 'var(--text-secondary)' }}>⌃K</span>
          </span>
        </button>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
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
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="nav-item"
            title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
            style={{ marginBottom: '8px', color: 'var(--text-secondary)' }}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            <span>{theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}</span>
          </button>

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

      {/* Global Search Modal */}
      <GlobalSearch />
    </div>
  )
}
