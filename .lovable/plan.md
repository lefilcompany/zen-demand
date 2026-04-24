
## Objetivo

Quando um usuário for **adicionado**, **removido** ou tiver o **cargo alterado** em um quadro, ele deve receber notificação nos 3 canais:

1. **In-app** (sino de notificações dentro do sistema)
2. **E-mail** (via Resend / `send-email` edge function)
3. **Push (FCM)** (via `send-push-notification` edge function)

Cada notificação deve conter:
- **Nome do quadro** (`Quadro X`)
- **Quem realizou a ação** (nome do administrador/coordenador)
- **Cargo do usuário no quadro** (Administrador, Coordenador, Agente ou Solicitante)
- **Cargo anterior** (apenas no caso de promoção/alteração)
- Link direto para o quadro (`/boards/:boardId`)

---

## Análise do estado atual

- `useAddBoardMember`, `useUpdateBoardMemberRole` e `useRemoveBoardMember` em `src/hooks/useBoardMembers.ts` apenas inserem/atualizam/excluem linhas em `board_members`. **Não disparam nenhuma notificação.**
- `AddBoardMemberDialog` chama `useAddBoardMember` em loop para múltiplos membros.
- `BoardDetail.tsx` e `BoardMembers.tsx` chamam `useRemoveBoardMember` e `useUpdateBoardMemberRole`.
- A infraestrutura de notificações já existe e é robusta:
  - Tabela `notifications` (in-app) — gravar uma linha já dispara o realtime do sino.
  - Edge function `send-email` (template `notification`).
  - Edge function `send-push-notification` (com filtro por preferências do usuário).
  - Hook utilitário `src/hooks/useSendPushNotification.ts` com helpers tipados (vamos adicionar 3 novos: add/remove/role-change de membro de quadro).
- Preferência relevante para o filtro de push: **`teamUpdates`** (já existe e é o canal correto para mudanças de membros/cargos em equipe/quadro).

---

## Plano de implementação

### 1. Hook utilitário centralizado: `src/hooks/useBoardMemberNotifications.ts` (novo)

Centraliza o disparo dos 3 canais para evitar duplicação entre `useAddBoardMember`, `useUpdateBoardMemberRole`, `useRemoveBoardMember` e o fluxo em lote do `AddBoardMemberDialog`.

Função única `notifyBoardMemberChange({ event, userId, boardId, boardName, newRole, oldRole?, actorId, actorName })` que:

1. **Mapeia o cargo para label legível** (`admin → Administrador`, `moderator → Coordenador`, `executor → Agente`, `requester → Solicitante`) — reutilizar o mesmo mapeamento já usado em `AddBoardMemberDialog` (`teamRoleConfig`) movendo para `src/lib/boardRoleLabels.ts`.

2. **Insere notificação in-app** em `public.notifications` com:
   - `user_id`: usuário afetado
   - `title`:
     - added: `"Você foi adicionado a um quadro"`
     - removed: `"Você foi removido de um quadro"`
     - role_changed: `"Seu cargo foi atualizado"`
   - `message`: ex.: `"{ActorName} adicionou você ao quadro \"{BoardName}\" como {RoleLabel}."`
   - `type`: `info` (added/role_changed) ou `warning` (removed)
   - `link`: `/boards/{boardId}` (omitido em removed)

3. **Dispara push** via `sendPushNotification` (helper já existente) com:
   - `notificationType: "teamUpdates"` (respeita preferências do usuário)
   - Título com emoji e nome do quadro (`👥 [{BoardName}] Você foi adicionado ao quadro`, `🚪 [{BoardName}] Você foi removido do quadro`, `🔄 [{BoardName}] Seu cargo foi alterado`)
   - Body com ator + cargo (e cargo anterior em role_changed)

4. **Dispara e-mail** via `useSendEmail` / `supabase.functions.invoke("send-email")`:
   - `to`: userId (a função `send-email` já resolve UUID → e-mail via `auth.admin.getUserById`)
   - `template: "notification"`
   - `templateData`: `{ title, message, actionUrl: <baseUrl>/boards/<id>, actionText: "Abrir quadro", type }`
   - **Respeitar a preferência `emailNotifications`** do destinatário: antes de chamar `send-email`, ler `user_preferences` (key `notification_preferences`) do destinatário e pular se `emailNotifications === false` ou `teamUpdates === false`.
   - Para evitar muitas chamadas client-side em lote, fazer uma única `supabase.from("user_preferences").select(...).in("user_id", [...])` e filtrar.

5. **Tratamento de erros**: cada canal é independente — falha em um não bloqueia o outro (`Promise.allSettled`). Apenas loga no console; nunca toasta erro para o usuário, pois a operação principal (mutação) já teve sucesso.

### 2. Atualizar `src/hooks/useBoardMembers.ts`

- **`useAddBoardMember`**: após o `insert` bem-sucedido, retornar também `boardId`, `userId`, `role`. No `onSuccess`, **não** disparar notificação aqui (motivo abaixo) — a notificação será disparada pelo caller (`AddBoardMemberDialog`) que tem acesso ao nome do quadro e ao ator. Mas para simplificar, a melhor abordagem é: disparar dentro do `onSuccess` do hook, buscando o nome do quadro e o nome do ator (já temos `addedBy` e `boardId`).
  - Implementação: dentro do `mutationFn`, após o insert, fazer um `select` rápido em `boards (name)` e `profiles!added_by (full_name)` e retornar tudo no payload. No `onSuccess`, chamar `notifyBoardMemberChange({ event: "added", ... })`.

- **`useUpdateBoardMemberRole`**: igual — buscar `oldRole` ANTES do update (já recebemos `memberId`; precisamos do `user_id` e `role` antigos antes), executar o update, e disparar `notifyBoardMemberChange({ event: "role_changed", oldRole, newRole, ... })`.

- **`useRemoveBoardMember`**: ANTES do delete, buscar `user_id`, `role`, `board_id` + `boards.name` + `profiles` (do ator atual via `useAuth`/`auth.uid()`). Executar delete. Disparar `notifyBoardMemberChange({ event: "removed", role: <cargo que tinha>, ... })`.

### 3. Ajustar `AddBoardMemberDialog.tsx`

Nenhuma mudança de UI necessária. Como o disparo ficará dentro de `useAddBoardMember.onSuccess`, o loop atual de `addMember.mutateAsync` no `handleSubmit` automaticamente notificará cada membro adicionado. Bom para single + bulk.

### 4. Mover labels de cargo para arquivo compartilhado

Criar `src/lib/boardRoleLabels.ts` com:

```ts
export const BOARD_ROLE_LABELS = {
  admin: "Administrador",
  moderator: "Coordenador",
  executor: "Agente",
  requester: "Solicitante",
} as const;
```

E refatorar `AddBoardMemberDialog` para importar daqui (mantendo cores/icons locais).

### 5. Banco de dados

**Nenhuma migração necessária.** A tabela `notifications` já existe e o realtime já está ativo (o sino do app funciona automaticamente). As notificações serão criadas via cliente Supabase (com a sessão do ator) — as RLS atuais já permitem `INSERT` em `notifications` para admins do quadro inserirem em nome do membro afetado? **Verificação necessária:** se as policies do `notifications` exigirem `auth.uid() = user_id` no insert, precisaremos:

- **Opção A (preferida)**: criar migração com função SECURITY DEFINER `notify_board_member_change(p_user_id, p_title, p_message, p_type, p_link)` que insere em `notifications` validando que `auth.uid()` é admin/moderator do board envolvido. Mais seguro e mantém RLS estrita.
- **Opção B**: relaxar RLS — não recomendado.

**Decisão:** vou seguir a **Opção A** — criar a função `create_board_membership_notification(p_user_id uuid, p_board_id uuid, p_title text, p_message text, p_type text, p_link text)` SECURITY DEFINER que valida ator e insere. O hook chama via `supabase.rpc(...)`.

### 6. E-mail e Push — preferências do destinatário

- **Push**: o edge function `send-push-notification` já filtra por `notificationType: "teamUpdates"` automaticamente. ✅
- **E-mail**: o edge function `send-email` **não** filtra por preferências. Faremos a verificação no client (no helper) lendo `user_preferences` do destinatário e pulando se `emailNotifications === false`.

### 7. Localização (i18n)

Strings em pt-BR (consistente com o resto do sistema). Não vou adicionar chaves nos arquivos de locale neste momento — strings inline em pt-BR como já é o padrão das notificações existentes (ex.: `notify_demand_request_created`).

---

## Arquivos a serem criados/modificados

### Criados
- `src/lib/boardRoleLabels.ts` — constantes compartilhadas de labels de cargo
- `src/lib/boardMemberNotifications.ts` — função utilitária `notifyBoardMemberChange` (in-app via RPC + push + e-mail)
- **Migração SQL** — função SECURITY DEFINER `create_board_membership_notification`

### Modificados
- `src/hooks/useBoardMembers.ts` — três mutations agora buscam contexto (nome do quadro, ator, cargo antigo) e chamam `notifyBoardMemberChange` no `onSuccess`
- `src/components/AddBoardMemberDialog.tsx` — refatorar para importar labels de `boardRoleLabels.ts` (sem mudança funcional)

### Não modificados
- Edge functions `send-email` e `send-push-notification` já estão prontas para receber esses payloads.
- `BoardDetail.tsx` e `BoardMembers.tsx` continuam chamando os hooks da mesma forma; ganham o comportamento novo automaticamente.

---

## Exemplos de mensagens finais

**Adicionado:**
- In-app: `"Maria Silva adicionou você ao quadro \"Marketing 2026\" como Coordenador."`
- Push: `👥 [Marketing 2026] Você foi adicionado ao quadro` / body: `"Maria Silva adicionou você como Coordenador"`
- E-mail subject: `"Você foi adicionado ao quadro Marketing 2026"`

**Cargo alterado:**
- In-app: `"Maria Silva alterou seu cargo no quadro \"Marketing 2026\" de Agente para Coordenador."`
- Push: `🔄 [Marketing 2026] Seu cargo foi alterado` / body: `"Agora você é Coordenador (antes: Agente) — por Maria Silva"`

**Removido:**
- In-app: `"Maria Silva removeu você do quadro \"Marketing 2026\" (era Agente)."`
- Push: `🚪 [Marketing 2026] Você foi removido do quadro` / body: `"Maria Silva removeu você (era Agente)"`

---

## Riscos e mitigações

- **Loop em lote (AddBoardMemberDialog)** — adicionar 10 membros = 10 e-mails + 10 pushes. Aceitável; cada destinatário recebe apenas 1 notificação.
- **Falha de e-mail/push** — usar `Promise.allSettled` para não quebrar a UX da operação principal.
- **RLS em `notifications`** — resolvido via função SECURITY DEFINER com validação de permissão.
- **Self-notify** — se um admin alterar o próprio cargo (cenário raro), evitar notificar a si mesmo (`if userId === actorId, skip`).
