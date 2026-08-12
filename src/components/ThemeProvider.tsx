'use client'

import { useEffect } from 'react'
import { getThemeAction } from '@/app/actions/settings'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Load accent color and font from localStorage
    const accentColor = localStorage.getItem('professoros_accent_color')
    const fontFamily = localStorage.getItem('professoros_font_family')

    if (accentColor) {
      document.documentElement.style.setProperty('--accent', accentColor)
      const hex = accentColor.replace('#', '')
      const r = parseInt(hex.substring(0, 2), 16)
      const g = parseInt(hex.substring(2, 4), 16)
      const b = parseInt(hex.substring(4, 6), 16)
      document.documentElement.style.setProperty('--accent-glow', `rgba(${r}, ${g}, ${b}, 0.3)`)
    }

    if (fontFamily) {
      document.documentElement.style.setProperty('--font-primary', fontFamily)
    }

    // Load theme from DB
    getThemeAction().then(theme => {
      document.documentElement.setAttribute('data-theme', theme)
    })
  }, [])

  return <>{children}</>
}
