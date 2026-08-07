'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { createClassAction } from '@/app/actions/classes'

type Semester = { id: string; name: string }
type Institution = { id: string; name: string }

export default function CreateClassForm({
  semesters,
  institutions,
  defaultInstitutionName,
  defaultSemesterName,
}: {
  semesters: Semester[]
  institutions: Institution[]
  defaultInstitutionName?: string
  defaultSemesterName?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newSemester, setNewSemester] = useState(false)
  const [newInstitution, setNewInstitution] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    const result = await createClassAction(formData)
    setIsSubmitting(false)
    if (result.success) {
      setIsOpen(false)
      setNewSemester(false)
      setNewInstitution(false)
    } else {
      alert(result.message)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setNewSemester(false)
    setNewInstitution(false)
  }

  return (
    <>
      <button className="btn-primary" onClick={() => setIsOpen(true)}>
        <Plus size={20} />
        Nova Turma
      </button>

      {isOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.4rem' }}>Cadastrar Nova Turma</h2>
              <button onClick={handleClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* INSTITUIÇÃO */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Instituição (Faculdade/Universidade)
                </label>
                {defaultInstitutionName ? (
                  <input type="hidden" name="institutionName" value={defaultInstitutionName} />
                ) : null}
                {!defaultInstitutionName && !newInstitution && institutions.length > 0 ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select name="institutionName" required className="input-field" style={{ flex: 1 }}>
                      {institutions.map(i => (
                        <option key={i.id} value={i.name} style={{ background: '#111827' }}>
                          {i.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setNewInstitution(true)}
                      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.85rem' }}
                    >
                      + Nova
                    </button>
                  </div>
                ) : !defaultInstitutionName ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      name="institutionName"
                      required
                      className="input-field"
                      placeholder="Ex: Fatec Franca"
                      style={{ flex: 1 }}
                    />
                    {institutions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setNewInstitution(false)}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}
                      >
                        ← Voltar
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: '10px 16px', borderRadius: '8px', background: 'rgba(165,180,252,0.08)', border: '1px solid rgba(165,180,252,0.2)', color: 'var(--accent)', fontSize: '0.95rem' }}>
                    {defaultInstitutionName}
                  </div>
                )}
              </div>

              {/* SEMESTRE */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Semestre
                </label>
                {defaultSemesterName ? (
                  <input type="hidden" name="semesterName" value={defaultSemesterName} />
                ) : null}
                {!defaultSemesterName && !newSemester && semesters.length > 0 ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select name="semesterName" required className="input-field" style={{ flex: 1 }}>
                      {semesters.map(s => (
                        <option key={s.id} value={s.name} style={{ background: '#111827' }}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setNewSemester(true)}
                      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.85rem' }}
                    >
                      + Novo
                    </button>
                  </div>
                ) : !defaultSemesterName ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      name="semesterName"
                      required
                      className="input-field"
                      placeholder="Ex: 2º Semestre/2026"
                      style={{ flex: 1 }}
                    />
                    {semesters.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setNewSemester(false)}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}
                      >
                        ← Voltar
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: '10px 16px', borderRadius: '8px', background: 'rgba(165,180,252,0.08)', border: '1px solid rgba(165,180,252,0.2)', color: 'var(--accent)', fontSize: '0.95rem' }}>
                    {defaultSemesterName}
                  </div>
                )}
              </div>

              {/* DISCIPLINA */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Disciplina
                </label>
                <input
                  type="text"
                  name="subjectName"
                  required
                  className="input-field"
                  placeholder="Ex: Redes de Computadores"
                />
              </div>

              {/* TURMA */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Turma <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>(opcional — ex: N1A, Turma A)</span>
                </label>
                <input
                  type="text"
                  name="turmaName"
                  className="input-field"
                  placeholder="Ex: N1A"
                />
              </div>

              {/* DIA/PERÍODO */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Dia / Período <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>(opcional — ex: Quinta de manhã)</span>
                </label>
                <input
                  type="text"
                  name="schedule"
                  className="input-field"
                  placeholder="Ex: Terça à noite, Seg e Qua 19h..."
                />
              </div>

              <div style={{ marginTop: '8px' }}>
                <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando...' : 'Salvar Turma'}
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
          max-width: 480px;
          max-height: 90vh;
          overflow-y: auto;
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
