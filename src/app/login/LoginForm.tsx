'use client'

import { useActionState, useState } from 'react'
import { loginAction } from '@/app/actions/auth'
import styles from './login.module.css'
import { Loader2 } from 'lucide-react'

// Next.js 15 uses useActionState which replaces useFormState
export default function LoginForm({ isFirstSetup }: { isFirstSetup: boolean }) {
  const [state, action, isPending] = useActionState(loginAction, undefined)
  const [password, setPassword] = useState('')

  return (
    <form action={action} className={styles.form}>
      <div className={styles.inputGroup}>
        <label htmlFor="password">Senha Mestre</label>
        <input 
          type="password" 
          id="password" 
          name="password" 
          className="glass-input" 
          placeholder={isFirstSetup ? "Crie uma senha forte" : "Sua senha..."}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {state?.error && <p className="error-text">{state.error}</p>}
      </div>
      
      <button 
        type="submit" 
        className={`btn-primary ${styles.submitBtn}`}
        disabled={isPending || !password}
      >
        {isPending ? (
          <><Loader2 className={styles.spinner} /> Entrando...</>
        ) : (
          isFirstSetup ? 'Salvar e Entrar' : 'Entrar no Painel'
        )}
      </button>
    </form>
  )
}
