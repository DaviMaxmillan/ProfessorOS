'use client'

import { useEffect } from 'react'
import { getThemeAction } from '@/app/actions/settings'
import { hydrateFromBrowser, setTheme } from '@/lib/preferences'

/**
 * Aplica as preferências visuais assim que a aplicação sobe: a cor de destaque
 * e a fonte vêm do localStorage; o tema vem do banco, porque é a única
 * preferência que acompanha o professor entre dispositivos.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    hydrateFromBrowser()

    let cancelado = false
    getThemeAction().then(theme => {
      if (cancelado) return
      setTheme(theme === 'light' ? 'light' : 'dark')
    })
    return () => { cancelado = true }
  }, [])

  return <>{children}</>
}
