import { checkHasPassword } from '@/app/actions/auth'
import LoginForm from './LoginForm'
import styles from './login.module.css'

export default async function LoginPage() {
  const hasPassword = await checkHasPassword()

  return (
    <div className={styles.container}>
      <div className={`glass-panel ${styles.loginCard}`}>
        <div className={styles.header}>
          <h1>ProfessorOS</h1>
          <p>
            {hasPassword 
              ? 'Digite sua senha mestre para acessar o painel.'
              : 'Bem-vindo! Crie uma senha mestre para o seu primeiro acesso.'}
          </p>
        </div>
        
        <LoginForm isFirstSetup={!hasPassword} />
      </div>
    </div>
  )
}
