'use client'

/**
 * Preferências visuais do professor: cor de destaque, fonte e tema.
 *
 * A cor e a fonte moram no localStorage (são por navegador); o tema mora no
 * banco, porque o professor espera encontrá-lo igual em qualquer dispositivo.
 *
 * Antes essa lógica estava copiada em três lugares — ThemeProvider, layout do
 * dashboard e a tela de configurações — cada um relendo o localStorage num
 * `useEffect` e reconvertendo hex para rgb na mão. Além da duplicação, mudar a
 * cor nas configurações não atualizava o layout até recarregar a página.
 *
 * Aqui é um store externo simples, lido via `useSyncExternalStore`: qualquer
 * componente que use `usePreferences()` reage na hora a uma mudança, e nenhum
 * deles precisa de `useEffect` para inicializar estado.
 */

import { useSyncExternalStore } from 'react'

export type Theme = 'dark' | 'light'

export type Preferences = {
  accent: string
  font: string
  theme: Theme
}

const ACCENT_KEY = 'professoros_accent_color'
const FONT_KEY = 'professoros_font_family'

export const DEFAULT_PREFERENCES: Preferences = {
  accent: '#6366f1',
  font: "'Inter', sans-serif",
  theme: 'dark',
}

/** Converte "#6366f1" em { r, g, b }. Devolve null se o valor não for um hex. */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const limpo = hex.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(limpo)) return null
  return {
    r: parseInt(limpo.substring(0, 2), 16),
    g: parseInt(limpo.substring(2, 4), 16),
    b: parseInt(limpo.substring(4, 6), 16),
  }
}

// ---- Store ----

// Referência estável: useSyncExternalStore entra em laço infinito se
// getSnapshot devolver um objeto novo a cada chamada.
let snapshot: Preferences = DEFAULT_PREFERENCES

const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function update(patch: Partial<Preferences>) {
  snapshot = { ...snapshot, ...patch }
  emit()
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function getSnapshot(): Preferences {
  return snapshot
}

export function getServerSnapshot(): Preferences {
  return DEFAULT_PREFERENCES
}

/** Lê as preferências do navegador e aplica no documento. Chamar uma vez, no boot. */
export function hydrateFromBrowser(): void {
  if (typeof window === 'undefined') return

  let accent = DEFAULT_PREFERENCES.accent
  let font = DEFAULT_PREFERENCES.font

  try {
    accent = localStorage.getItem(ACCENT_KEY) || accent
    font = localStorage.getItem(FONT_KEY) || font
  } catch {
    // Modo privado ou storage bloqueado: seguimos com os padrões.
  }

  const attr = document.documentElement.getAttribute('data-theme')
  const theme: Theme = attr === 'light' ? 'light' : DEFAULT_PREFERENCES.theme

  update({ accent, font, theme })
  applyAccentToDocument(accent)
  applyFontToDocument(font)
}

// ---- Aplicação no documento ----

function applyAccentToDocument(color: string): void {
  const root = document.documentElement
  root.style.setProperty('--accent', color)
  const rgb = hexToRgb(color)
  if (rgb) {
    root.style.setProperty('--accent-glow', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`)
  }
}

function applyFontToDocument(font: string): void {
  document.documentElement.style.setProperty('--font-primary', font)
}

// ---- Escrita ----

export function setAccent(color: string): void {
  try {
    localStorage.setItem(ACCENT_KEY, color)
  } catch {
    // Sem persistência, mas a cor ainda vale para esta sessão.
  }
  applyAccentToDocument(color)
  update({ accent: color })
}

export function setFont(font: string): void {
  try {
    localStorage.setItem(FONT_KEY, font)
  } catch {
    // idem
  }
  applyFontToDocument(font)
  update({ font })
}

/**
 * Aplica o tema no documento e no store. A persistência no banco fica a cargo
 * de quem chama (`saveThemeAction`), para que este módulo continue sem
 * dependência de servidor.
 */
export function setTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
  update({ theme })
}

// ---- Hook ----

export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
