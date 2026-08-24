/**
 * Extrai uma mensagem legível de um valor capturado num `catch`.
 *
 * Em TypeScript o valor de um `catch` é `unknown`: pode ser um Error, mas
 * também uma string, um objeto do Prisma ou qualquer outra coisa que tenha
 * sido lançada. Anotar o catch como `any` para poder ler `.message` esconde
 * exatamente esse risco — se o valor não for um Error, `.message` vem
 * `undefined` e a mensagem mostrada ao usuário fica vazia.
 */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error) {
    const { message } = error as { message: unknown }
    if (typeof message === 'string') return message
  }
  return 'Erro inesperado.'
}

/**
 * Testa se o erro é uma violação de constraint conhecida do Prisma.
 *
 * Códigos úteis: P2002 (registro duplicado), P2003 (chave estrangeira
 * inválida), P2025 (registro não encontrado).
 */
export function isPrismaErrorCode(error: unknown, code: string): boolean {
  return (
    !!error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code: unknown }).code === code
  )
}
