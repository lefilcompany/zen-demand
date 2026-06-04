## Objetivo

Importar **todas as 16 skills** do repositório `mattpocock/skills` (opção D) para o workspace, ativá-las via `skills--apply_draft`, e **parar por aí** (opção i) — sem iniciar `/tdd` automaticamente. Você dispara `/tdd` na próxima mensagem para atacar o bug de demandas recorrentes.

## Escopo

### Skills a importar (16)

**Engenharia (10):** `tdd`, `diagnose`, `grill-with-docs`, `triage`, `improve-codebase-architecture`, `to-issues`, `to-prd`, `zoom-out`, `prototype`, `setup-matt-pocock-skills`

**Produtividade (4):** `caveman`, `grill-me`, `handoff`, `write-a-skill`

**Misc (2):** `git-guardrails-claude-code`, `migrate-to-shoehorn`

### Garantias para evitar erros

1. **Download via GitHub API** (`api.github.com/repos/mattpocock/skills/contents/...`) listando o conteúdo de cada pasta antes de baixar — evita assumir estrutura de arquivos.
2. **Validação de cada SKILL.md** antes de ativar: precisa ter frontmatter YAML com `name` e `description`. Skills sem isso recebem frontmatter mínimo gerado a partir do nome da pasta + primeira linha do README.
3. **Normalização de nome**: `name` no frontmatter deve ser lowercase com hífens, ≤64 chars, começar com letra. Ajusto se o original violar.
4. **Skills com dependências externas** (`git-guardrails-claude-code`, `migrate-to-shoehorn`, `setup-matt-pocock-skills`) são importadas como referência, mas o SKILL.md recebe um aviso no topo indicando que funcionam apenas em Claude Code / contextos específicos e podem não rodar 100% no Lovable. Isso evita você invocá-las achando que estão operacionais.
5. **Skills dependentes de GitHub Issues** (`to-issues`, `to-prd`, `triage`) recebem nota de pré-requisito: precisa conectar um issue tracker antes de executar. Ficam ativas mas com aviso claro.
6. **Cada skill é ativada individualmente** com `skills--apply_draft .agents/skills/<nome>`. Se uma falhar, as outras continuam — relato no final quais ativaram e quais falharam.
7. **Não toco no `.workspace/skills/`** diretamente — só via `apply_draft`, conforme regras do sistema.

## Passos de execução (em build mode)

```text
1. Criar .agents/skills/ se não existir
2. Para cada uma das 16 skills:
   a. GET api.github.com/.../contents/<nome>  → lista arquivos
   b. Baixar SKILL.md, references/*, scripts/*, assets/*
   c. Validar/corrigir frontmatter
   d. Adicionar aviso no topo se for skill com dependência externa
   e. Salvar em .agents/skills/<nome>/
3. Para cada skill criada: skills--apply_draft .agents/skills/<nome>
4. Listar resultado: ativadas ✓ / falhas ✗ com motivo
5. Parar — aguardar você chamar /tdd na próxima mensagem
```

## O que NÃO faço nesta tarefa

- Não inicio investigação/correção do bug de demandas recorrentes
- Não crio cron job nem GitHub Action ainda
- Não escrevo testes Deno ainda
- Não modifico nenhum código de produção (`src/`, `supabase/`)

Tudo isso fica para a próxima mensagem, quando você chamar `/tdd`.

## Resultado esperado

16 skills disponíveis no workspace, prontas para serem invocadas por `/nome-da-skill` ou por retrieval automático baseado em descrição. Confirmação final listando exatamente quais foram ativadas.
