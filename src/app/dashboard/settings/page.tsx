'use client'

import { useState } from 'react'
import { Palette, Type, Check, RefreshCw, Sun, Moon } from 'lucide-react'
import { saveThemeAction } from '@/app/actions/settings'
import {
  DEFAULT_PREFERENCES,
  setAccent,
  setFont,
  setTheme,
  usePreferences,
  type Theme,
} from '@/lib/preferences'

const ACCENT_COLORS = [
  { label: 'Roxo (Padrão)', value: '#6366f1' },
  { label: 'Azul Neon', value: '#3b82f6' },
  { label: 'Verde Esmeralda', value: '#10b981' },
  { label: 'Rosa Choque', value: '#ec4899' },
  { label: 'Laranja Solar', value: '#f97316' },
  { label: 'Vermelho Sangue', value: '#ef4444' }
]

const FONTS = [
  { label: 'Inter (Padrão)', value: "'Inter', sans-serif" },
  { label: 'Roboto', value: "'Roboto', sans-serif" },
  { label: 'Montserrat', value: "'Montserrat', sans-serif" },
  { label: 'Outfit', value: "'Outfit', sans-serif" }
]

export default function SettingsPage() {
  const {
    accent: currentAccent,
    font: currentFont,
    theme: currentTheme,
  } = usePreferences()
  const [showSavedMsg, setShowSavedMsg] = useState(false)

  const applyColor = (color: string) => {
    setAccent(color)
    showSaved()
  }

  const applyFont = (font: string) => {
    setFont(font)
    showSaved()
  }

  const applyTheme = async (t: Theme) => {
    setTheme(t)
    await saveThemeAction(t)
    showSaved()
  }

  const resetDefaults = () => {
    applyColor(DEFAULT_PREFERENCES.accent)
    applyFont(DEFAULT_PREFERENCES.font)
    applyTheme(DEFAULT_PREFERENCES.theme)
  }

  const showSaved = () => {
    setShowSavedMsg(true)
    setTimeout(() => setShowSavedMsg(false), 2000)
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: '40px' }}>
        <div>
          <h1 className="page-title">Configurações</h1>
          <p className="page-description">Personalize a aparência do ProfessorOS ao seu gosto.</p>
        </div>
        {showSavedMsg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', background: 'rgba(16, 185, 129, 0.1)', padding: '8px 16px', borderRadius: '8px', fontWeight: 500 }}>
            <Check size={18} /> Salvo!
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Tema */}
        <div className="glass-panel" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
            {currentTheme === 'dark' ? <Moon size={20} color="var(--accent)" /> : <Sun size={20} color="var(--accent)" />}
            Tema da Interface
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.95rem' }}>
            Alterne entre o tema escuro e o tema claro. A preferência é salva no banco de dados.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '400px' }}>
            {(['dark', 'light'] as const).map(t => {
              const isActive = currentTheme === t
              return (
                <button
                  key={t}
                  onClick={() => applyTheme(t)}
                  style={{
                    background: t === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.8)',
                    border: `2px solid ${isActive ? 'var(--accent)' : 'var(--surface-border)'}`,
                    padding: '20px 16px', borderRadius: '12px', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                    transition: 'all 0.2s',
                    boxShadow: isActive ? '0 0 0 1px var(--accent)' : 'none'
                  }}
                >
                  {t === 'dark'
                    ? <Moon size={28} color={isActive ? '#a5b4fc' : '#6b7280'} />
                    : <Sun size={28} color={isActive ? '#6366f1' : '#6b7280'} />
                  }
                  <span style={{ color: t === 'dark' ? (isActive ? '#a5b4fc' : '#9ca3af') : (isActive ? '#6366f1' : '#374151'), fontWeight: isActive ? 600 : 400 }}>
                    {t === 'dark' ? 'Escuro' : 'Claro'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
            <Palette size={20} color="var(--accent)" /> 
            Cor de Destaque
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.95rem' }}>
            Escolha a cor principal que será usada em botões, links e ícones por todo o sistema.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
            {ACCENT_COLORS.map(color => {
              const isActive = currentAccent === color.value
              return (
                <button
                  key={color.value}
                  onClick={() => applyColor(color.value)}
                  style={{
                    background: 'rgba(0,0,0,0.2)',
                    border: `1px solid ${isActive ? color.value : 'var(--surface-border)'}`,
                    padding: '16px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.2s',
                    boxShadow: isActive ? `0 0 0 1px ${color.value}` : 'none'
                  }}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: color.value }}></div>
                  <span style={{ color: isActive ? '#fff' : 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: isActive ? 600 : 400 }}>{color.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Fontes */}
        <div className="glass-panel" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
            <Type size={20} color="var(--accent)" /> 
            Tipografia
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.95rem' }}>
            Altere a fonte principal usada nos textos da plataforma.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
            {FONTS.map(font => {
              const isActive = currentFont === font.value
              return (
                <button
                  key={font.value}
                  onClick={() => applyFont(font.value)}
                  style={{
                    background: 'rgba(0,0,0,0.2)',
                    border: `1px solid ${isActive ? 'var(--accent)' : 'var(--surface-border)'}`,
                    padding: '20px 16px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                    fontFamily: font.value,
                    fontSize: '1.1rem',
                    boxShadow: isActive ? '0 0 0 1px var(--accent)' : 'none'
                  }}
                >
                  {font.label}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button onClick={resetDefaults} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'transparent', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)', borderRadius: '8px', cursor: 'pointer' }}>
            <RefreshCw size={16} /> Restaurar Padrões
          </button>
        </div>

      </div>
    </div>
  )
}
