'use client'

import { useState } from 'react'
import { Plus, X, Building2 } from 'lucide-react'
import { createInstitutionAction } from '@/app/actions/classes'

export default function CreateInstitutionButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    const result = await createInstitutionAction(formData)
    setIsSubmitting(false)
    if (result.success) {
      setIsOpen(false)
    } else {
      alert(result.message)
    }
  }

  return (
    <>
      <button className="btn-primary" onClick={() => setIsOpen(true)}>
        <Plus size={20} />
        Nova Instituição
      </button>

      {isOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Building2 size={22} color="var(--accent)" />
                Nova Instituição
              </h2>
              <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Nome da Instituição
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  className="input-field"
                  placeholder="Ex: Fatec Franca, Unifran, UNAERP..."
                  autoFocus
                />
              </div>

              <div style={{ marginTop: '8px' }}>
                <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando...' : 'Criar Instituição'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          width: 100%;
          max-width: 420px;
          padding: 32px;
          animation: slideUp 0.3s ease;
        }
        .input-field {
          width: 100%;
          padding: 12px 16px;
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--surface-border);
          color: var(--text-primary);
          outline: none;
          font-family: inherit;
          box-sizing: border-box;
        }
        .input-field:focus {
          border-color: var(--accent);
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}
