

## Plano: Reestruturação de Permissões — Equipe como Contêiner, Quadro como Unidade de Permissão

### Resumo da Mudança

Atualmente, os papéis (admin, coordenador, agente, solicitante) são definidos na **equipe** e herdados pelos quadros. A nova lógica inverte isso:

- **Equipe**: apenas dois papéis — `owner` (dono/criador) e `member` (membro comum)
- **Quadro**: os 4 papéis (administrador, coordenador, agente, solicitante) ficam aqui
- **Sem quadro padrão**: novos membros entram na equipe sem nenhum quadro; o dono aloca manualmente
- **Interface dinâmica**: sidebar/menus mudam conforme o papel do usuário no quadro selecionado

---

### 1. Mudanças no Banco de Dados (Migrações)

**a) Alterar `team_members.role`**
- Criar novo enum ou adaptar: apenas `owner` e `member` no nível de equipe
- Migrar dados existentes: `admin` → `owner` (criador da equipe), demais → `member`
- Nota: o enum `team_role` atual é usado em `board_members` também. Será mantido lá para os 4 papéis de quadro. No `team_members`, o campo `role` será atualizado para aceitar apenas `owner`/`member`

**b) Remover trigger `add_member_to_default_board`**
- O trigger que adiciona novos membros ao quadro padrão será removido
- O trigger `sync_admin_to_all_boards` será removido (admins de equipe não existem mais)

**c) Remover restrição de quadro padrão obrigatório**
- Drop do índice único `idx_boards_default_per_team`
- Permitir que equipes existam sem quadro padrão

**d) Atualizar `create_board_with_services`**
- Não buscar mais "team admins" para adicionar automaticamente
- O criador do quadro é adicionado como `admin` do quadro
- Qualquer `owner` ou `member` da equipe pode criar quadro (se tiver permissão definida — apenas `owner` pode criar quadros)

**e) Atualizar RLS policies**
- Ajustar policies que referenciam `team_members.role` como `admin`/`moderator` para usar o novo modelo
- Funções `is_team_admin_or_moderator`, `has_team_role` precisam ser atualizadas ou substituídas
- Criar função `is_team_owner` para verificar se o usuário é dono da equipe

---

### 2. Mudanças no Frontend

**a) `useTeamRole` → simplificar**
- Retornar apenas `owner` | `member` | `null`
- Remover `useIsTeamAdminOrModerator`, `useCanInteractKanban` (substituir por equivalentes de board)

**b) `useBoardRole` → fonte principal de permissões**
- Já existe e retorna `admin | moderator | executor | requester`
- Criar hooks derivados: `useIsBoardAdminOrModerator`, `useCanInteractBoard`

**c) `AppSidebar.tsx`**
- Substituir verificações de `role` (equipe) por `boardRole` para decidir quais menus mostrar
- `isTeamAdminOrModerator` → usar `boardRole` para menus de demandas/kanban
- Manter acesso a "Participantes" e "Solicitações de entrada" apenas para `owner` da equipe

**d) `TeamRequests.tsx` (aprovação de entrada)**
- Remover seleção de cargo ao aprovar — todos entram como `member`
- Simplificar o fluxo: aprovar = inserir como `member` na equipe, sem quadro

**e) `TeamDetail.tsx` (lista de membros)**
- Remover seletor de cargo de equipe (só mostra `Dono` ou `Membro`)
- Remover capacidade de alterar role de equipe (exceto para o dono)

**f) `MemberCard.tsx`**
- Adaptar para mostrar apenas `Dono` / `Membro`
- Remover dropdown de roles de equipe

**g) `BoardSelector.tsx`**
- Já mostra o papel no quadro — manter e reforçar como principal indicador

**h) `FirstBoardModal.tsx`**
- Mostrar apenas para o `owner` da equipe (que precisa criar o primeiro quadro)
- Membros sem quadro verão uma tela de "Aguardando alocação"

**i) `Kanban.tsx`, `DemandDetail.tsx`, `Demands.tsx`**
- Substituir `useIsTeamAdminOrModerator` por verificação via `boardRole`
- Todas as decisões de permissão vêm do `boardRole`

**j) `FloatingCreateButton`, `CreateDemandQuickDialog`**
- Verificar permissão via `boardRole` em vez de team role

**k) Estado "sem quadro"**
- Criar componente `NoBoardAssigned` para membros sem nenhum quadro
- Exibido no lugar do dashboard quando `boards.length === 0` e usuário não é `owner`

---

### 3. Fluxo do Dono ao Criar Equipe

1. Dono cria equipe (GetStarted)
2. É inserido como `owner` na `team_members`
3. `FirstBoardModal` aparece (já existe) — dono cria o primeiro quadro
4. Dono vira `admin` do quadro automaticamente (já funciona no RPC)
5. Dono adiciona membros da equipe aos quadros via tela de membros do quadro

---

### 4. Arquivos Impactados (estimativa)

| Categoria | Arquivos |
|-----------|----------|
| **Database** | 1 nova migração SQL (enum, triggers, RLS, funções) |
| **Hooks** | `useTeamRole.ts`, `useTeamJoinRequests.ts`, `useTeamMembers.ts` |
| **Contextos** | Nenhum (BoardContext já correto) |
| **Páginas** | `TeamRequests.tsx`, `TeamDetail.tsx`, `Kanban.tsx`, `DemandDetail.tsx`, `Boards.tsx`, `TeamDemands.tsx`, `Reports.tsx`, `Index.tsx` |
| **Componentes** | `AppSidebar.tsx`, `MemberCard.tsx`, `FirstBoardModal.tsx`, `BoardSelector.tsx`, `FloatingCreateButton.tsx` + novo `NoBoardAssigned.tsx` |

---

### 5. Riscos e Cuidados

- O enum `team_role` é usado tanto em `team_members` quanto em `board_members`. Alterar o enum diretamente pode quebrar `board_members`. A abordagem será criar um novo tipo `team_membership_role` (`owner`, `member`) para `team_members`, mantendo `team_role` para `board_members`
- Todas as funções SQL `is_team_admin_or_moderator`, `has_team_role` que verificam role de equipe precisam ser atualizadas
- Dados existentes: membros atuais que eram `admin` da equipe devem virar `owner` se forem o criador, ou `member` caso contrário
- O `app_role` (admin do sistema) permanece intocado — continua no `user_roles` separado

