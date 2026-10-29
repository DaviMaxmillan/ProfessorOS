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

## Nada é salvo sozinho — e a tela diz o que falta

O diário de notas e a chamada guardam o que está digitado antes de gravar. Duas
regras existem para esse rascunho não sumir:

**Ele vive no `ClassTabs`, não dentro da aba.** As abas são montadas por
condição (`activeTab === 'grades' && <GradesTab/>`), então sair da aba
desmontava o componente e descartava tudo o que não tinha sido salvo, sem
aviso. Com o rascunho no pai, trocar de aba não perde nada.

**A tela mostra o que falta gravar.** `src/lib/gradeDraft.ts` compara o
rascunho com o que veio do banco: as células diferentes ganham borda âmbar, e
uma barra no topo diz quantas notas faltam salvar, com um botão que grava todas
as atividades de uma vez (`saveAllGradesAction`, numa transação só). Antes
havia um "Salvar" por coluna e nada mais: quem lançava várias provas e clicava
num botão só perdia o resto calado, e descobria pela planilha exportada sair
vazia.

Fechar ou recarregar a página com nota por gravar pede confirmação ao
navegador.

**O que ainda não tem essa proteção:** o formulário de edição de uma aula no
Cronograma, o de um trabalho em Trabalhos em Grupo e o de uma anotação em
Notas. São formulários que o professor abre de propósito, com "Salvar" e
"Cancelar" à vista, mas trocar de aba com eles abertos ainda descarta o texto
sem avisar.

## Como a frequência é contada

A chamada da aba "Frequência Provisória" é a única fonte: cada registro é uma
matrícula numa data, presente ou ausente (tabela `AttendanceRecord`). Faltas e
frequência são derivadas desses registros em `src/lib/attendance.ts`, e todas as
telas usam esse cálculo — a própria aba, a visão geral, os relatórios e a
exportação em Excel.

A frequência é calculada sobre as **chamadas feitas**, não sobre as aulas
previstas no cronograma: enquanto o semestre corre, as duas coisas são
diferentes, e dividir pelas aulas previstas faria todo mundo parecer faltoso em
março. A planilha mostra as duas colunas para a comparação ficar à vista.

Sem chamada nenhuma a frequência é `null`, não 100% — "ninguém foi chamado" é
diferente de "todos presentes". A lista de alunos em risco da visão geral exige
pelo menos 4 chamadas antes de sinalizar alguém por falta
(`MIN_CALLS_FOR_RISK`), para a primeira chamada do semestre não acusar a turma
inteira. A planilha não aplica esse piso: ali a situação aparece ao lado da
porcentagem, e "Regular" ao lado de 0% seria contraditório.

O campo `Enrollment.absences` do schema não é mais lido por nada. Ele era um
contador que nenhum lugar do sistema escrevia, e era de onde a exportação, a
visão geral e os relatórios tiravam as faltas — por isso mostravam 0 falta e
100% de frequência mesmo com a chamada feita e salva.

## Como a sincronização da planilha funciona

A planilha da instituição é a lista oficial da turma. Sincronizar faz o sistema
refletir essa lista, em `src/lib/roster.ts`:

| Na planilha | No sistema |
| --- | --- |
| Nome novo | Aluno cadastrado e matriculado |
| Nome com `(Trancado)` | Matrícula fica `INATIVO` e o aluno sai da chamada |
| Nome sem a marca, estando trancado | Matrícula volta para `ATIVO` |
| Nome que não consta | Aguarda confirmação para ser removido |

A marca é reconhecida entre parênteses ou colchetes, antes ou depois do nome,
com ou sem acento, em qualquer caixa, e também separada por hífen. Ela é
retirada antes de gravar: guardar "(Trancado) FULANO" como nome do aluno faria
ele deixar de bater com a planilha assim que destrancasse.

`DESISTENTE` é preservado. A planilha da secretaria não expressa desistência —
é uma avaliação do professor, e sobrescrevê-la apagaria algo digitado à mão. A
marca de trancado, por ser um sinal explícito, vence.

**A remoção nunca acontece na primeira passada.** Remover uma matrícula apaga
em cascata as notas, as chamadas, a participação em grupos e os vínculos de
necessidades especiais do aluno. A tela lista quem sai e quanto cada um perde,
e só remove depois da confirmação. Se a planilha estiver incompleta — faltando
uma página, por exemplo — basta não confirmar.

O aluno sai do cadastro geral apenas quando não sobra nenhuma outra turma. Quem
o professor tem em duas disciplinas continua lá.

O aluno é identificado pelo RGM; o nome é o reserva, usado quando a planilha vem
sem RGM. A comparação por nome ignora acento, caixa e espaço repetido, mas dois
alunos homônimos sem RGM são indistinguíveis — nesse caso o RGM na planilha é o
que garante o acerto.

## Scripts

| Comando                | O que faz                             |
| ---------------------- | ------------------------------------- |
| `npm run dev`          | Servidor de desenvolvimento.          |
| `npm run build`        | Build de produção.                    |
| `npm run start`        | Sobe o build de produção.             |
| `npm run lint`         | ESLint.                               |
| `npm run typecheck`    | TypeScript sem gerar arquivos.        |
| `npm test`             | Testes unitários (Vitest).            |
| `npm run test:e2e`     | Testes de ponta a ponta (Playwright). |
| `npm run limpar-notas` | Remove notas lançadas (veja abaixo).  |

## Limpar notas de teste

Útil para zerar dados de teste antes de começar a lançar notas de verdade.

```bash
npm run limpar-notas                      # mostra o que existe, sem apagar
npm run limpar-notas -- --apenas-zeros    # só as notas iguais a zero
npm run limpar-notas -- --confirmar       # apaga de verdade
```

Repare nos **dois hifens soltos** antes das opções. Sem eles o npm trata
`--confirmar` como opção dele e não repassa ao script. O script detecta esse
caso e avisa, em vez de rodar em simulação silenciosamente.

Por segurança, o comando roda em simulação por padrão, imprime o banco alvo no
cabeçalho e agrupa as notas por turma e atividade — confira a lista antes de
confirmar.

## Testes

**Unitários** (`npm test`) cobrem a lógica pura: cálculo de notas, o rascunho
do diário, frequência, sincronização da lista de alunos, feriados, assinatura de sessão, rate limit e
tratamento de erros. Não precisam
de banco.

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
