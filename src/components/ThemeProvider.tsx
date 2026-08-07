'use client'

import { useEffect } from 'react'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Load saved preferences
    const accentColor = localStorage.getItem('professoros_accent_color')
    const fontFamily = localStorage.getItem('professoros_font_family')
    
    if (accentColor) {
      document.documentElement.style.setProperty('--accent', accentColor)
    }
    
    if (fontFamily) {
      document.documentElement.style.setProperty('--font-primary', fontFamily)
    }
  }, [])

  return <>{children}</>
}
