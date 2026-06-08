## Objetivo

Permitir que admins/coordenadores de um quadro criem um link de compartilhamento de demanda com a opção **"Adicionar automaticamente ao quadro como Agente"**. Quem acessar esse link, estando logado e pertencendo à equipe do quadro, é adicionado automaticamente como membro do quadro com role `executor` (Agente) e redirecionado para a demanda real.

## Regras de negócio

- Apenas **admin/coordenador do quadro** (board role `admin`/`moderator`) pode marcar a opção "auto-adicionar ao quadro" ao criar o link.
- A flag é por token: cada link tem ou não o auto-join habilitado.
- Ao acessar o link compartilhado:
  - **Não logado** → comportamento atual (modo leitura pública + CTA login).
  - **Logado, já membro do quadro** → redireciona para `/demands/:id` (já existe hoje).
  - **Logado, não-membro, token SEM auto-join** → continua no modo leitura (comportamento atual da última iteração).
  - **Logado, não-membro, token COM auto-join**:
    - Se **pertence à equipe** do quadro (`team_members`): insere em `board_members` com role `executor` e redireciona para `/demands/:id`.
    - Se **não pertence à equipe**: mostra mensagem clara ("Você precisa fazer parte da equipe deste quadro para entrar automaticamente"), mantém modo leitura.
- Operação é idempotente (ON CONFLICT DO NOTHING) — clicar duas vezes não duplica nem rebaixa cargo existente.

## Mudanças

### 1. Banco (migration)
- `ALTER TABLE demand_share_tokens ADD COLUMN auto_join_board boolean NOT NULL DEFAULT false;`
- Nova RPC `SECURITY DEFINER` `join_board_via_share_token(p_token text)` que:
  1. Resolve o token (ativo, não expirado, `auto_join_board = true`).
  2. Busca `board_id` + `team_id` da demanda.
  3. Confere `auth.uid()` autenticado.
  4. Confere que o usuário é membro de `team_members` (qualquer role) do `team_id` do quadro.
  5. `INSERT INTO board_members (board_id, user_id, role, added_by) VALUES (..., 'executor', criador_do_token) ON CONFLICT DO NOTHING`.
  6. Retorna `jsonb { success, demand_id, board_id, reason? }` com motivos: `not_authenticated`, `invalid_token`, `not_team_member`, `auto_join_disabled`, `success`, `already_member`.
- RLS: permitir admins/moderadores do quadro fazerem `UPDATE` da coluna `auto_join_board` no seu próprio token (já têm UPDATE nos próprios tokens; só validar).

### 2. Edge function `shared-demand`
- Incluir `auto_join_board` no payload retornado para o cliente saber que deve oferecer/disparar o join.

### 3. Frontend — `ShareDemandDialog.tsx`
- Mostrar **Switch "Adicionar automaticamente ao quadro como Agente"** apenas se o usuário atual for admin/moderador do quadro da demanda (usar `useBoardRole`).
- Passar `autoJoinBoard` no `createToken.mutateAsync`.
- Exibir, quando ativo, indicador visual no link existente ("Auto-join ativo — novos acessos viram Agentes do quadro").

### 4. Frontend — `useShareDemand.ts`
- Estender `ShareToken` com `auto_join_board`.
- `useCreateShareToken` aceita `autoJoinBoard?: boolean`.
- Novo hook `useJoinBoardViaToken()` que chama a RPC.

### 5. Frontend — `SharedDemand.tsx`
- Após receber payload e detectar usuário logado **não-membro**:
  - Se `auto_join_board === true` → chamar RPC `join_board_via_share_token`.
    - `success`/`already_member` → toast + `navigate('/demands/' + demand.id)`.
    - `not_team_member` → renderizar tela "Você não faz parte da equipe deste quadro. Peça ao administrador para adicioná-lo à equipe primeiro." (modo leitura mantido).
    - outros erros → modo leitura atual.
  - Se `auto_join_board === false` → comportamento da última iteração (modo leitura para logados não-membros).

## Detalhes técnicos

- Role inserida: `executor` (mapeada na UI como "Agente" via `BOARD_ROLE_LABELS`).
- `added_by` = `created_by` do token (admin que gerou o link), para auditoria.
- Não disparar notificações em massa para evitar spam quando vários entram pelo mesmo link (segue o padrão idempotente — só insere se ainda não é membro).
- Tokens antigos ficam com `auto_join_board = false` por default — comportamento atual preservado.

## Arquivos afetados

- Migration nova (coluna + RPC).
- `supabase/functions/shared-demand/index.ts` (devolve `auto_join_board`).
- `src/hooks/useShareDemand.ts`.
- `src/components/ShareDemandDialog.tsx`.
- `src/pages/SharedDemand.tsx`.
