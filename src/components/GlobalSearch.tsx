'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, BookOpen, Users, GraduationCap } from 'lucide-react'
import { useRouter } from 'next/navigation'

type SearchResult = {
  id: string
  type: 'class' | 'student'
  title: string
  subtitle: string
  href: string
}

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Open on Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(prev => !prev)
      }
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setResults([])
      setActiveIndex(0)
    }
  }, [isOpen])

  // Search with debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data)
        setActiveIndex(0)
      } finally {
        setIsLoading(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  const navigate = useCallback((href: string) => {
    setIsOpen(false)
    router.push(href)
  }, [router])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[activeIndex]) {
      navigate(results[activeIndex].href)
    }
  }

  if (!isOpen) return null

  return (
    <div
      onClick={() => setIsOpen(false)}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)', zIndex: 1000,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '15vh', animation: 'fadeIn 0.15s ease'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '580px', margin: '0 16px',
          background: 'var(--bg-color)', border: '1px solid var(--surface-border)',
          borderRadius: '16px', boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          overflow: 'hidden', animation: 'slideDown 0.2s ease'
        }}
      >
        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid var(--surface-border)' }}>
          <Search size={20} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar alunos, turmas..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text-primary)', fontSize: '1.05rem',
            }}
          />
          {isLoading && (
            <div style={{ width: '16px', height: '16px', border: '2px solid var(--surface-border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.6s linear infinite', flexShrink: 0 }} />
          )}
          {!isLoading && (
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)', borderRadius: '6px', padding: '2px 6px', cursor: 'pointer', fontSize: '0.75rem' }}>
              ESC
            </button>
          )}
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {results.map((result, i) => (
              <button
                key={result.id}
                onClick={() => navigate(result.href)}
                onMouseEnter={() => setActiveIndex(i)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '14px 20px', background: i === activeIndex ? 'rgba(99,102,241,0.1)' : 'transparent',
                  border: 'none', borderBottom: '1px solid var(--surface-border)', cursor: 'pointer',
                  textAlign: 'left', transition: 'background 0.1s', color: 'var(--text-primary)'
                }}
              >
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                  background: i === activeIndex ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: i === activeIndex ? 'var(--accent)' : 'var(--text-secondary)'
                }}>
                  {result.type === 'class' ? <BookOpen size={18} /> : <GraduationCap size={18} />}
                </div>
                <div>
                  <p style={{ fontWeight: 500, fontSize: '0.95rem', marginBottom: '2px' }}>{result.title}</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{result.subtitle}</p>
                </div>
                <div style={{ marginLeft: 'auto', color: 'var(--text-secondary)', fontSize: '0.75rem', flexShrink: 0 }}>
                  {result.type === 'class' ? 'Turma' : 'Aluno'}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {query.trim() && !isLoading && results.length === 0 && (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Search size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
            <p>Nenhum resultado para "<strong>{query}</strong>"</p>
          </div>
        )}

        {/* Hint when empty */}
        {!query.trim() && (
          <div style={{ padding: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {[
              { icon: <GraduationCap size={14} />, label: 'Alunos por nome ou RGM' },
              { icon: <BookOpen size={14} />, label: 'Turmas por disciplina' },
            ].map(hint => (
              <span key={hint.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--surface-border)', borderRadius: '8px', padding: '6px 12px', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                {hint.icon} {hint.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-16px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
