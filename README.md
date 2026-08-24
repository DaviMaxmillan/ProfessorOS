# ProfessorOS

Sistema de gestão acadêmica de uso pessoal do professor: instituições, semestres,
turmas, alunos, notas, frequência, cronograma de aulas, trabalhos em grupo,
anotações e acompanhamento de necessidades especiais.

Construído com Next.js 16 (App Router), React 19, Prisma e PostgreSQL.

## Requisitos

- Node.js 20.9 ou superior
- PostgreSQL 15 ou superior (o `docker-compose.yml` já sobe um)

## Rodando localmente

```bash
# 1. Dependências
npm install

# 2. Banco de dados
docker compose up -d

# 3. Variáveis de ambiente
cp .env.example .env
# Abra o .env e gere a AUTH_SECRET:
#   openssl rand -base64 32

# 4. Esquema do banco
npx prisma db push

# 5. Servidor de desenvolvimento
npm run dev
```

Acesse http://localhost:3000. No primeiro acesso a tela de login pede que você
**crie** a senha mestre (mínimo de 8 caracteres); dali em diante ela é a senha
de entrada.

## Variáveis de ambiente

| Variável       | Obrigatória      | Descrição                                                        |
| -------------- | ---------------- | ---------------------------------------------------------------- |
| `DATABASE_URL` | sim              | String de conexão do PostgreSQL.                                  |
| `AUTH_SECRET`  | sim em produção  | Chave que assina o cookie de sessão. Mínimo de 32 caracteres.     |

Gere a `AUTH_SECRET` com:

```bash
openssl rand -base64 32
```

Em desenvolvimento, se ela não estiver definida a aplicação usa um segredo fixo
de teste e avisa no console. **Em produção a sessão não é criada sem ela** — o
login exibe uma mensagem pedindo a configuração.

Trocar a `AUTH_SECRET` invalida todas as sessões abertas, o que é justamente o
que se quer caso ela vaze.

## Como funciona a autenticação

O sistema tem um único usuário (o professor) e uma senha mestre, guardada como
hash bcrypt na tabela `Settings`.

A sessão é um cookie `httpOnly` com um payload assinado em HMAC-SHA256 — não é
possível forjá-lo sem a `AUTH_SECRET`. A validação acontece em duas camadas,
seguindo a recomendação do Next.js:

- **`src/proxy.ts`** faz a checagem otimista (assinatura e validade) em toda
  requisição, sem tocar no banco. Rotas de página redirecionam para `/login`;
  rotas de API respondem `401`.
- **`src/lib/auth.ts`** (Data Access Layer) faz a checagem definitiva. Toda
  Server Action, todo Route Handler e toda página renderizada no servidor chama
  `requireAuth()` antes de ler ou escrever qualquer dado.

O payload da sessão carrega uma impressão digital da senha vigente, então
**trocar a senha derruba todas as sessões antigas**.

O login é limitado a 5 tentativas por IP a cada 15 minutos, com um teto global
de 30, para conter ataque de força bruta contra a senha única.

## Como as notas são calculadas

A média final de um aluno é calculada num único lugar, `src/lib/grades.ts`, e
todas as telas usam esse cálculo — diário de notas, cabeçalho da turma, visão
geral, relatórios e a exportação em Excel.

A regra é: dentro de cada bimestre, a nota de cada atividade é multiplicada
pelo seu peso e a soma é dividida por 10 (os pesos de um bimestre somam 10).
Os dois bimestres são então somados (`SUM`) ou tem sua média tirada
(`AVERAGE`), conforme a configuração da turma. A AF (bimestre 3) só entra
quando o aluno está abaixo da média, e substitui o bimestre de menor nota.

Se essa regra precisar mudar, mude num lugar só e ajuste
`src/lib/__tests__/grades.test.ts` — os testes documentam cada caso.

## Scripts

| Comando             | O que faz                                          |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Servidor de desenvolvimento.                        |
| `npm run build`     | Build de produção.                                  |
| `npm run start`     | Sobe o build de produção.                           |
| `npm run lint`      | ESLint.                                             |
| `npm run typecheck` | TypeScript sem gerar arquivos.                      |
| `npm test`          | Testes unitários (Vitest).                          |
| `npm run test:e2e`  | Testes de ponta a ponta (Playwright).               |

## Testes

**Unitários** (`npm test`) cobrem a lógica pura: cálculo de notas, feriados,
assinatura de sessão, rate limit e tratamento de erros. Não precisam de banco.

**Ponta a ponta** (`npm run test:e2e`) sobem a aplicação de produção contra um
PostgreSQL real e cobrem o que não dá para testar isoladamente: o fluxo de
login, o cookie assinado, as tentativas de forjar sessão, o rate limit por IP e
o carregamento de todas as telas.

Para rodar os e2e localmente:

```bash
docker compose up -d
npx prisma db push
npm run build
npm run test:e2e
```

Os testes apagam a tabela `Settings` entre casos para reproduzir o primeiro
acesso — aponte `DATABASE_URL` para um banco de testes, nunca para o de uso
real.

Se o ambiente já tiver um Chromium instalado, aponte `CHROMIUM_PATH` para o
executável e o Playwright usa esse em vez de baixar outro.

O GitHub Actions (`.github/workflows/ci.yml`) roda lint, typecheck e testes
unitários em todo push e pull request, e os testes de ponta a ponta contra um
PostgreSQL de serviço.

## Deploy (Railway)

O `railway.json` já aplica o esquema e sobe a aplicação:

```
npx prisma db push && npm run start
```

Configure `DATABASE_URL` e `AUTH_SECRET` nas variáveis do serviço antes do
primeiro deploy.

## Estrutura

```
src/
  app/
    actions/      Server Actions (todas protegidas por requireAuth)
    api/search/   Busca global
    dashboard/    Telas do sistema
    login/        Tela de login
    logout/       Encerra a sessão e limpa o cookie
  components/     Componentes compartilhados
  lib/
    auth.ts       Data Access Layer de autenticação
    session.ts    Assinatura e verificação do cookie de sessão
    rateLimit.ts  Limite de tentativas de login
    prisma.ts     Cliente Prisma
    holidays.ts   Feriados usados no cronograma
    exportClass.ts Exportação de turma para Excel
prisma/
  schema.prisma   Modelo de dados
```
