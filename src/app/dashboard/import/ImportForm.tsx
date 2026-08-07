'use client'

import { useState, useRef } from 'react'
import { UploadCloud, CheckCircle, XCircle } from 'lucide-react'
import { importExcelAction, ImportResult } from '@/app/actions/import'

type ClassData = {
  id: string;
  institution: { name: string } | null;
  semester: { name: string };
  subject: { name: string };
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

  const handleSubmit = async () => {
    if (!file) return
    if (!selectedClassId) {
      alert('Selecione uma turma.')
      return
    }

    setIsUploading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('classId', selectedClassId)

      const response = await importExcelAction(formData)
      setResult(response)
      if (response.success) {
        setFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    } catch (error) {
      setResult({ success: false, message: 'Ocorreu um erro inesperado.' })
    } finally {
      setIsUploading(false)
    }
  }

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
              {c.institution?.name ? `${c.institution.name} - ` : ''}{c.subject.name} - {c.semester.name}
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
        <div style={{ marginTop: '32px', padding: '24px', borderRadius: '12px', background: result.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${result.success ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: result.success ? '16px' : '0' }}>
            {result.success ? <CheckCircle color="#4ade80" /> : <XCircle color="#f87171" />}
            <h3 style={{ color: result.success ? '#4ade80' : '#f87171' }}>{result.message}</h3>
          </div>
          
          {result.success && result.data && (
            <div style={{ paddingLeft: '36px' }}>
              <p><strong>Novos alunos cadastrados:</strong> {result.data.addedStudents}</p>
              <p><strong>Alunos já existentes na turma:</strong> {result.data.updatedStudents}</p>
            </div>
          )}
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
