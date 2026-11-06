# Pendências conhecidas

Coisas que foram encontradas e **não** corrigidas, com o que já se sabe sobre
cada uma. A intenção é que quem for mexer não precise redescobrir o problema.

Cada item diz onde está, por que ficou de fora e o que foi medido. Números e
caminhos foram conferidos no commit em que este arquivo entrou — se divergirem,
confie no código.

---

## 1. Três formulários perdem o texto ao trocar de aba

**Onde:** `ScheduleTab.tsx` (edição de uma aula), `GroupWorkTab.tsx` (formulário
de trabalho), `NotesTab.tsx` (anotação sendo escrita).

As abas da turma são montadas por condição em `ClassTabs.tsx`:

```tsx
{activeTab === 'schedule' && <ScheduleTab ... />}
```

Sair da aba desmonta o componente e descarta o que estava digitado, sem aviso.

O diário de notas e a chamada tinham o mesmo problema e já foram corrigidos: o
estado deles mora no `ClassTabs` e sobrevive à troca de aba. Esses três não.

**Confirmado no navegador**, digitando e trocando de aba em cada um. A exposição
é menor que a do diário — são formulários que a pessoa abre de propósito, com
"Salvar" e "Cancelar" à vista — mas o descarte é igualmente silencioso.

**Por que ficou de fora:** exige escolher entre duas saídas, e as duas mexem em
três componentes grandes que estão em uso:

- Manter as abas montadas e esconder as inativas com `display: none`. Resolve
  tudo de uma vez, inclusive abas futuras, mas passa a renderizar tudo sempre e
  precisa de atenção ao efeito de medição de largura do `GradesTab`, que lê
  `clientWidth` (zero enquanto escondido).
- Subir o estado de cada aba para o `ClassTabs`, como foi feito nas outras duas.
  Mais cirúrgico, mas é um por um.

---

## 2. A sincronização pega o primeiro aluno homônimo

**Onde:** `src/app/actions/import.ts`, a busca de reserva por nome.

```ts
dbStudent = await prisma.student.findFirst({ where: { name: st.name } })
```

Quando a planilha traz RGM, a busca por RGM resolve antes e o caminho seguro é o
que roda — que é o caso em produção. Sem RGM, dois alunos de mesmo nome são
indistinguíveis, e a sincronização pode matricular o errado.

**Como apareceu:** nos testes de ponta a ponta. O banco de teste acumulava
dezenas de alunos "BRUNO SEGUNDO" de execuções anteriores, e a sincronização
matriculou outro. Os testes passaram a usar RGM por isso.

O comportamento é anterior às mudanças recentes e não foi alterado.

---

## 3. 45 `alert()`, `confirm()` e `prompt()` travando a interface

Espalhados pelas telas do painel. Travam a aba do navegador, não combinam com o
visual do sistema e não dá para estilizar.

Alguns são confirmações de operação destrutiva (excluir turma, excluir
atividade) — esses precisam continuar existindo de alguma forma, só não como
diálogo nativo.

O padrão de substituição já existe no projeto: a confirmação de remoção de
alunos na tela de sincronização é um painel na própria página, com a lista do
que será perdido e dois botões. Ver `ImportForm.tsx`.

---

## 4. Campos com fundo escuro no tema claro

24 ocorrências de `rgba(0,0,0,0.3)` com `color: '#fff'` cravadas em estilos
inline, em 8 arquivos:

```
dashboard/classes/[id]/GradesTab.tsx
dashboard/classes/[id]/ScheduleTab.tsx
dashboard/classes/[id]/NotesTab.tsx
dashboard/classes/[id]/ClassTabs.tsx
dashboard/classes/[id]/ClassHeader.tsx
dashboard/classes/[id]/GroupWorkTab.tsx
dashboard/classes/[id]/AttendanceTab.tsx
dashboard/classes/InstitutionCard.tsx
```

No tema claro (`[data-theme="light"]` em `globals.css`) esses campos continuam
escuros com texto branco, destoando do resto da página.

A correção é trocar por variáveis CSS que já existem no tema
(`--surface-border`, `--text-primary`) ou criar uma para o fundo de campo. É
mecânico, mas são 24 pontos e convém conferir cada tela nos dois temas.

Defeito antigo, anterior a tudo que foi mexido recentemente.

---

## 5. Componentes grandes demais

```
620  dashboard/special-needs/NeedsManager.tsx
571  dashboard/classes/[id]/GradesTab.tsx
563  dashboard/classes/[id]/ScheduleTab.tsx
407  dashboard/classes/[id]/GroupWorkTab.tsx
401  dashboard/classes/[id]/NotesTab.tsx
```

Nenhum deles tem bug conhecido por causa do tamanho. O custo aparece na hora de
mexer: o `ScheduleTab` tem 22 `useState`, o `GroupWorkTab` tem 17.

Vale dividir quando houver motivo para mexer neles — não como tarefa isolada.

---

## 6. `dev.db` no histórico do Git

O commit inicial (`6935e56`) adicionou um `dev.db` com dados reais: nomes de
alunos, RGMs e o hash da senha mestra. O arquivo não está mais na árvore, mas
continua no histórico e pode ser recuperado por qualquer um que tenha acesso ao
repositório.

**Decisão tomada:** não reescrever o histórico. O repositório é privado e não
tem forks, e reescrever quebraria os clones existentes. Fica registrado para que
a decisão seja consciente, e para ser revista se o repositório algum dia for
aberto ou ganhar colaboradores.

Se for revista: `git filter-repo` é a ferramenta, e a senha mestra deve ser
trocada junto.

---

## 7. O banco dos testes de ponta a ponta acumula dados

Cada execução cria turmas, alunos e notas e não limpa nada. Depois de algumas
dezenas de execuções há centenas de alunos acumulados.

Duas consequências já observadas:

- Buscas por nome encontram o aluno errado (ver item 2).
- Asserções sobre telas globais ficam não determinísticas. A lista de "alunos em
  risco" do painel mostra só os 8 primeiros, então um aluno recém-criado não
  aparece. Por isso os testes de risco medem pelo relatório da turma, que é
  por turma, e não pelo painel.

Resolve com um banco descartável por execução, ou limpeza no final. Enquanto não
houver, vale saber: **asserção em tela global, no e2e, não é confiável.**

---

## Onde está documentado o que já foi resolvido

O `README.md` tem as regras de negócio com o porquê de cada decisão:

- como as notas são calculadas, e de onde sai o mínimo de aprovação
- como a frequência é contada
- como a sincronização da planilha interpreta `(Trancado)` e as ausências
- por que nada é salvo sozinho, e como a tela avisa o que falta gravar

As mensagens de commit guardam o detalhe de cada correção: o que foi medido
antes de mexer, o que foi decidido e por quê.
