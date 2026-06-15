
# Projetos (antiga "Pastas de demandas")

Renomear o sistema atual de pastas para **Projetos**, mover a gestão para uma rota dedicada `/projects` (item novo no sidebar da equipe) e desenhar cards ricos inspirados na referência de "Personas", mantendo o modelo de compartilhamento atual (`view`/`edit`). Vou seguir TDD (testes primeiro) e prototipar a tela antes de implementar.

---

## 1. Banco de dados (1 migration)

Renomeação atômica das tabelas e dependências. Como ambos schema e código sobem juntos no publish, é seguro fazer em um único passo:

```text
demand_folders         → projects
demand_folder_items    → project_demands
demand_folder_shares   → project_shares
```

Renomear também:
- Índices, FKs e triggers (`update_updated_at_column`) para refletir o novo nome.
- Funções `has_folder_access`, `has_folder_edit_access`, `is_folder_owner` → `has_project_access`, `has_project_edit_access`, `is_project_owner` (mantendo wrappers temporários `has_folder_access` que delegam, evitando quebrar qualquer função/trigger remanescente).
- Atualizar **todas** as RLS policies das 3 tabelas para usarem os novos nomes de função.
- Reaplicar GRANTs (`authenticated`, `service_role`).

Modelo de permissão **inalterado**: `project_shares.permission` continua `view` | `edit`. Owner = `created_by`.

## 2. Frontend — nova rota e navegação

- **Rota:** `/projects` (lista) e `/projects/:projectId` (detalhe = atual `FolderDetail` reaproveitada).
- **Sidebar:** adicionar item "Projetos" no `AppSidebar` da equipe (ícone `FolderKanban`), entre "Meus Quadros" e "Participantes".
- **Página `Projects.tsx`:** título "Projetos", subtítulo "Organize demandas da equipe em projetos compartilháveis", busca por nome, botão primário `+ Novo projeto` (mesmo estilo `Button default` laranja já usado em Demandas).
  - **Empty state:** ícone + "Nenhum projeto ainda" + CTA "Criar primeiro projeto".
  - **Grid responsivo** (1 / 2 / 3 colunas) de `ProjectCard`.

### `ProjectCard` (inspirado na 3ª imagem)

```text
┌────────────────────────────────────────────┐
│ ●cor  Nome do projeto         ⋯ (menu)     │
│       Criado 12/06 · atualizado há 2d      │
├────────────────────────────────────────────┤
│ 12 demandas   • 5 em andamento  • 7 entreg │
│                                            │
│ 👥 [A][B][C] +2   [Gerenciar acesso]       │
└────────────────────────────────────────────┘
```

- Header: bolinha colorida (`project.color`) + nome + menu (editar/excluir/compartilhar).
- Métricas: total, em andamento, entregues (calculadas a partir de `project_demands` + `demands.status_id` ↔ status "Entregue").
- Stack de avatares: owner + shared users (até 4 + contador `+N`).
- Botão **"Gerenciar acesso"** abre o `ShareFolderDialog` existente (renomeado `ShareProjectDialog`) mostrando lista de membros da equipe com permissão atual e seletor `view`/`edit`.
- Click no card → `/projects/:id` (detalhe atual).

### Renomeações de UI (sem mudar comportamento)
- `CreateFolderDialog` → `CreateProjectDialog`, texto "Nova pasta" → "Novo projeto", "Editar pasta" → "Editar projeto".
- `FolderDetail` → `ProjectDetail`, breadcrumbs e toasts atualizados.
- Hook `useDemandFolders` → `useProjects` (e mutações).
- Remover a faixa de "pastas" da página `/demands` substituindo por um link discreto: "Organize em projetos →".
- Todas as strings PT-BR ("pasta(s)", "Nova pasta", "Pasta criada", etc.) revisadas em `Demands.tsx`, `MyDemands.tsx`, `TeamDemands.tsx`, `DemandRequests.tsx`, `CreateFolderDialog.tsx`, `FolderDetail.tsx`.

## 3. Skills aplicadas

### `/skill:prototype` — antes de codar
1. Capturar screenshot da tela `/demands` atual + referência "Personas" enviada.
2. Gerar 3 direções de design via `design--create_directions` para o `ProjectCard` + header de `/projects` (paleta SoMA já travada: laranja #F28705 / dark #1D1D1D / branco).
3. Apresentar como `ask_questions` tipo `prototype` para você escolher a direção.
4. Implementar a direção escolhida fielmente (composição, densidade, motion).

### `/skill:tdd` — disciplina de testes
Antes de cada bloco de código, escrever os testes:

| Arquivo de teste | Cobre |
|---|---|
| `src/hooks/useProjects.test.tsx` | listar, criar, editar, excluir, compartilhar; mapeamento `item_count`, `is_owner`, `shared_with` |
| `src/pages/Projects.test.tsx` | empty state, render de cards, busca, abertura do dialog |
| `src/components/ProjectCard.test.tsx` | métricas (total/andamento/entregue), stack de avatares com +N, botão "Gerenciar acesso" |
| `src/components/CreateProjectDialog.test.tsx` | validação de nome obrigatório, color picker, modo edição |
| `src/lib/projectMetrics.test.ts` | função pura que deriva contadores a partir de demands + status |
| `tests_selenium/tests/test_projects_flow.py` | E2E: login → /projects → criar → renomear → compartilhar → excluir |

Fluxo TDD por slice: **escrever teste → ver falhar → implementar mínimo → refatorar**. Rodar `bunx vitest run` ao fim de cada slice.

## 4. Detalhes técnicos

- **Métricas por projeto**: estender `useProjects` para `select("*, project_demands(demand:demand_id(status_id, demand_statuses(name)))")` e calcular `total / in_progress / delivered` no client (memoizado). Avatares vêm do join `project_shares → profiles` + owner via `profiles`.
- **Realtime**: canal `projects-${teamId}` escutando `projects`, `project_demands`, `project_shares` — nomes únicos para não conflitar com auditoria atual.
- **RLS**: mantém regras existentes (owner total, shared `view`/`edit`), apenas renomeadas.
- **Backwards compat**: nenhuma — a UI antiga de pastas deixa de existir; toda referência migra de uma vez no mesmo deploy.

## 5. Ordem de execução (após aprovação)

1. Migration (rename tabelas + funções + policies + grants).
2. Aguardar regeneração de `types.ts`.
3. `/skill:prototype` → escolher direção do card.
4. TDD slice 1: `useProjects` + testes.
5. TDD slice 2: `Projects.tsx` + `ProjectCard` + testes.
6. TDD slice 3: dialogs (criar/editar/compartilhar) + testes.
7. Renomear `FolderDetail` → `ProjectDetail`, ajustar rotas/sidebar.
8. Remover faixa antiga de pastas em `Demands.tsx` e demais páginas, traduzir strings.
9. E2E Selenium + smoke manual (`browser--view_preview /projects`).
10. Atualizar `mem://features/folders/*` → `mem://features/projects/*`.

---

**Riscos**: rename de tabela é destrutivo se o publish para Live falhar entre schema e código. Mitigação: migration roda em Test primeiro, validamos a UI, e só então publicamos — schema + código vão juntos para Live no mesmo publish.

Posso prosseguir?
