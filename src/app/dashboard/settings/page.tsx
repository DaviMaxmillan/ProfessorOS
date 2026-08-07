'use client'

import { useState, useEffect } from 'react'
import { Palette, Type, Check, RefreshCw } from 'lucide-react'

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
  const [currentAccent, setCurrentAccent] = useState('#6366f1')
  const [currentFont, setCurrentFont] = useState("'Inter', sans-serif")
  const [showSavedMsg, setShowSavedMsg] = useState(false)

  useEffect(() => {
    const savedColor = localStorage.getItem('professoros_accent_color')
    if (savedColor) setCurrentAccent(savedColor)

    const savedFont = localStorage.getItem('professoros_font_family')
    if (savedFont) setCurrentFont(savedFont)
  }, [])

  const applyColor = (color: string) => {
    setCurrentAccent(color)
    localStorage.setItem('professoros_accent_color', color)
    document.documentElement.style.setProperty('--accent', color)
    
    // Convert hex to rgb for glow
    const hex = color.replace('#', '')
    const r = parseInt(hex.substring(0,2), 16)
    const g = parseInt(hex.substring(2,4), 16)
    const b = parseInt(hex.substring(4,6), 16)
    document.documentElement.style.setProperty('--accent-glow', `rgba(${r}, ${g}, ${b}, 0.3)`)
    
    showSaved()
  }

  const applyFont = (font: string) => {
    setCurrentFont(font)
    localStorage.setItem('professoros_font_family', font)
    document.documentElement.style.setProperty('--font-primary', font)
    showSaved()
  }

  const resetDefaults = () => {
    applyColor('#6366f1')
    applyFont("'Inter', sans-serif")
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
        
        {/* Cores */}
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
