'use client'

import { useState, useRef } from 'react'
import { UploadCloud, CheckCircle, XCircle, AlertTriangle, Lock } from 'lucide-react'
import { importExcelAction, ImportResult } from '@/app/actions/import'

type ClassData = {
  id: string;
  institution: { name: string } | null;
  semester: { name: string };
  subject: { name: string };
  turmaName: string | null;
  schedule: string | null;
}

export default function ImportForm({ classes }: { classes: ClassData[] }) {
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '')
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls')) {
        setFile(droppedFile)
        setResult(null)
      } else {
        alert('Por favor, envie apenas arquivos Excel (.xlsx ou .xls)')
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
      setResult(null)
    }
  }

  /**
   * `confirmarRemocoes` só vai na segunda chamada, depois que o professor viu
   * quem sai da turma. A remoção apaga notas e chamadas em cascata, então o
   * arquivo é reenviado em vez de o servidor guardar a lista entre as duas
   * passadas — assim o que ele confirma é sempre o que acabou de ver.
   */
  const sincronizar = async (confirmarRemocoes: boolean) => {
    if (!file) return
    if (!selectedClassId) {
      alert('Selecione uma turma.')
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('classId', selectedClassId)
      if (confirmarRemocoes) formData.append('confirmarRemocoes', 'true')

      const response = await importExcelAction(formData)
      setResult(response)

      // O arquivo fica na tela enquanto houver remoção pendente: é ele que
      // será reenviado na confirmação.
      const aguardandoConfirmacao = (response.data?.pendingRemovals.length ?? 0) > 0
      if (response.success && !aguardandoConfirmacao) {
        setFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    } catch {
      setResult({ success: false, message: 'Ocorreu um erro inesperado.' })
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = () => {
    setResult(null)
    return sincronizar(false)
  }

  const pendingRemovals = result?.data?.pendingRemovals ?? []
  // Com remoção pendente a sincronização não terminou: o verde de "concluída"
  // contradiria o aviso logo abaixo.
  const tom = !result?.success
    ? { fundo: 'rgba(239, 68, 68, 0.1)', borda: 'rgba(239, 68, 68, 0.2)', cor: '#f87171' }
    : pendingRemovals.length > 0
      ? { fundo: 'rgba(245, 158, 11, 0.08)', borda: 'rgba(245, 158, 11, 0.25)', cor: '#f59e0b' }
      : { fundo: 'rgba(34, 197, 94, 0.1)', borda: 'rgba(34, 197, 94, 0.2)', cor: '#4ade80' }

  return (
    <div className="glass-panel" style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Selecione a Turma (Destino da Importação)</label>
        <select 
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          style={{ 
            width: '100%', 
            padding: '12px 16px', 
            borderRadius: '8px', 
            background: 'rgba(0, 0, 0, 0.2)', 
            border: '1px solid var(--surface-border)',
            color: 'var(--text-primary)',
            outline: 'none',
            fontSize: '1rem',
            cursor: 'pointer'
          }}
        >
          {classes.map(c => (
            <option key={c.id} value={c.id} style={{ background: '#111827' }}>
              {c.subject.name}{c.turmaName ? ` — ${c.turmaName}` : ''} | {c.semester.name}{c.schedule ? ` | ${c.schedule}` : ''}
            </option>
          ))}
        </select>
      </div>

      <div 
        className={`upload-zone ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileSelect} 
          accept=".xlsx, .xls"
          style={{ display: 'none' }} 
        />
        <UploadCloud size={48} color="var(--accent)" style={{ marginBottom: '16px' }} />
        <h3>Arraste sua planilha aqui</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '8px', marginBottom: '24px' }}>ou clique para selecionar o arquivo (.xlsx)</p>
        
        <button className="btn-primary" style={{ pointerEvents: 'none' }}>
          Selecionar Arquivo
        </button>
      </div>

      {file && (
        <div style={{ marginTop: '32px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'var(--accent)', color: '#000', padding: '8px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.8rem' }}>
              XLSX
            </div>
            <div>
              <p style={{ fontWeight: '500' }}>{file.name}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
          <button 
            className="btn-primary" 
            onClick={handleSubmit}
            disabled={isUploading}
          >
            {isUploading ? 'Sincronizando...' : 'Iniciar Sincronização'}
          </button>
        </div>
      )}

      {result && (
        <div style={{ marginTop: '32px', padding: '24px', borderRadius: '12px', background: tom.fundo, border: `1px solid ${tom.borda}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: result.success ? '16px' : '0' }}>
            {!result.success ? <XCircle color={tom.cor} />
              : pendingRemovals.length > 0 ? <AlertTriangle color={tom.cor} />
              : <CheckCircle color={tom.cor} />}
            <h3 style={{ color: tom.cor }}>{result.message}</h3>
          </div>
          
          {result.success && result.data && (
            <div style={{ paddingLeft: '36px' }}>
              <p><strong>Novos alunos cadastrados:</strong> {result.data.addedStudents}</p>
              <p><strong>Alunos já existentes na turma:</strong> {result.data.updatedStudents}</p>
              {result.data.lockedStudents > 0 && (
                <p style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lock size={14} color="#f87171" />
                  <span><strong>Trancados pela planilha:</strong> {result.data.lockedStudents} — saíram da chamada</span>
                </p>
              )}
              {result.data.unlockedStudents > 0 && (
                <p><strong>Destrancados:</strong> {result.data.unlockedStudents} — voltaram para a chamada</p>
              )}
              {result.data.removedStudents > 0 && (
                <p><strong>Removidos da turma:</strong> {result.data.removedStudents}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* A confirmação da remoção. Nada foi apagado até aqui: a lista mostra
          exatamente quem sai e o que se perde junto. */}
      {pendingRemovals.length > 0 && (
        <div data-testid="remocoes-pendentes" style={{ marginTop: '24px', padding: '24px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <AlertTriangle color="#f59e0b" />
            <h3 style={{ color: '#f59e0b' }}>
              {pendingRemovals.length === 1
                ? '1 aluno não consta na planilha'
                : `${pendingRemovals.length} alunos não constam na planilha`}
            </h3>
          </div>

          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.9rem' }}>
            Nada foi apagado ainda. Removê-los apaga junto as notas e as chamadas
            de cada um, <strong>sem possibilidade de desfazer</strong>. Confira a
            lista antes de confirmar — se a planilha estiver incompleta, é só
            fechar esta tela e sincronizar de novo com o arquivo certo.
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', marginBottom: '20px' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '8px 12px', borderBottom: '1px solid rgba(245, 158, 11, 0.25)' }}>Aluno</th>
                <th style={{ padding: '8px 12px', borderBottom: '1px solid rgba(245, 158, 11, 0.25)' }}>RGM</th>
                <th style={{ padding: '8px 12px', borderBottom: '1px solid rgba(245, 158, 11, 0.25)', textAlign: 'center' }}>Notas</th>
                <th style={{ padding: '8px 12px', borderBottom: '1px solid rgba(245, 158, 11, 0.25)', textAlign: 'center' }}>Chamadas</th>
              </tr>
            </thead>
            <tbody>
              {pendingRemovals.map(aluno => (
                <tr key={aluno.enrollmentId} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 500 }}>
                    {aluno.name}
                    {aluno.alsoDeletesStudent && (
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: '0.8rem' }}> · sai do cadastro</span>
                    )}
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{aluno.rgm || '—'}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', color: aluno.grades > 0 ? '#f87171' : 'var(--text-secondary)' }}>{aluno.grades}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', color: aluno.attendances > 0 ? '#f87171' : 'var(--text-secondary)' }}>{aluno.attendances}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={() => sincronizar(true)}
              disabled={isUploading}
              style={{ padding: '10px 18px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171', cursor: isUploading ? 'wait' : 'pointer', fontWeight: 500 }}
            >
              {isUploading ? 'Removendo...' : 'Confirmar e remover'}
            </button>
            <button
              onClick={() => setResult(null)}
              disabled={isUploading}
              style={{ padding: '10px 18px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              Manter todos
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .upload-zone {
          border: 2px dashed var(--surface-border);
          border-radius: 16px;
          padding: 60px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          background: rgba(0, 0, 0, 0.2);
        }
        .upload-zone:hover, .upload-zone.dragging {
          border-color: var(--accent);
          background: rgba(165, 180, 252, 0.05);
        }
      `}</style>
    </div>
  )
}
