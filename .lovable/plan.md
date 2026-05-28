## Problema

O hook `useCanCreateResource` existe mas **nunca é usado** nos fluxos de criação. Nenhum dos limites dos planos (boards, membros, demandas/mês, serviços, notas) nem feature flags (time tracking full, push/email, relatórios, AI, share externo, API, SLA, contratos) estão sendo aplicados. Por isso a equipe do `teste2@lefil.com.br` no Starter (limite 1 quadro) conseguiu criar 2.

## Plano

### 1. Enforcement no banco (camada forte e à prova de bypass)

Migração criando funções e triggers `BEFORE INSERT`:

- **`get_team_active_plan(team_id)`** — retorna o `plans` ativo (assinatura `active` ou `trialing` válida); fallback Starter.
- **`enforce_board_limit()`** trigger em `public.boards`: conta quadros da team, compara com `plan.max_boards` (`-1` = ilimitado), levanta `RAISE EXCEPTION` se exceder.
- **`enforce_team_member_limit()`** trigger em `public.team_members`: idem com `max_members`.
- **`enforce_demand_monthly_limit()`** trigger em `public.demands`: conta demandas do mês corrente (não-arquivadas), compara com `max_demands_per_month`.
- **`enforce_service_limit()`** trigger em `public.services` (ou board_services conforme arquitetura atual) com `max_services`.
- **`enforce_note_limit()`** trigger em `public.notes` com `max_notes`.

Cada trigger pula a verificação se o limite é `-1` ou se a operação vem de `service_role`.

### 2. Hook único de gating no frontend

Refatorar/usar `useCanCreateResource` consistentemente:

- Já calcula limite vs. uso. Vamos passar a usar contagens reais (não `usage_records`, que pode estar dessincronizado) — substituir a fonte para contar `boards`/`team_members` diretamente do banco filtrando pela team.
- Adicionar `usePlanFeature(featureKey)` retornando `{ enabled, plan, requiredPlan }` para gates de funcionalidade booleana.

### 3. UI: bloquear ações e mostrar upgrade

Aplicar gating onde há criação ou uso de feature:

- **Quadros** — `CreateBoardWizard` (e botões em `Boards.tsx`): desabilitar CTA quando `!canCreate`, mostrar tooltip "Limite do plano Starter atingido (1 quadro). Faça upgrade." com botão que abre o `PlansModal`.
- **Membros** — `AddBoardMemberDialog` e fluxo de aceitar `team_join_requests`: mesma checagem com `max_members`.
- **Demandas** — `CreateDemandQuickDialog`, `SideCreateDemandButton`, `TopbarCreateButton`, `FloatingCreateButton`, `CreateDemand` page: bloquear quando estoque mensal esgotado, mostrar contador "X/30 demandas usadas neste mês".
- **Serviços / Notas** — mesmo padrão nos fluxos de criação.

Feature gates (componentes existentes só renderizam se `usePlanFeature('xxx').enabled`, senão mostram "Disponível no plano Profissional ↑"):
- `time_tracking === "full"` → timer manual avançado, relatórios de tempo
- `notifications === "push_email"` → push/email (já existe; bloquear toggle no Starter)
- `reports` → página de relatórios PDF/CSV
- `ai_summary` → botão "Resumo IA" em `BoardSummary`
- `share_external` → botão "Compartilhar link público" em `DemandDetail`
- `api` → seção API Keys
- `sla` → configurações de SLA
- `contracts` → upload de contrato

### 4. Componente reutilizável

`<PlanLimitGate resource="boards" children={...} />` que encapsula o padrão "se bloqueado → renderiza CTA de upgrade com `PlansModal`".

### 5. Mensagens consistentes

Toast: `"O plano <Starter> permite até <1 quadro>. Faça upgrade para criar mais."` com botão **Ver planos** abrindo o `PlansModal`.

### Notas técnicas

- A migração precisa rodar com `SECURITY DEFINER` para ler `subscriptions`/`plans` ignorando RLS.
- Triggers retornam mensagens em pt-BR para serem exibidas no frontend via `error.message`.
- Verificar `time_in_progress_seconds` / `last_started_at` não impactados.
- Não tocar `src/integrations/supabase/{client,types}.ts`.
- Para a equipe que já tem 2 quadros no Starter: a trigger só bloqueia novas inserções; o segundo quadro permanecerá. Posso adicionar opcionalmente uma view/aviso para times "acima do limite" pedindo upgrade — confirmar se você quer isso.

### Pergunta antes de implementar

Você quer que eu inclua o aviso/bloqueio para times **já acima do limite** (ex.: a equipe atual com 2 quadros no Starter), pedindo upgrade ou desativando o quadro extra? Ou apenas impedir **novas** criações daqui pra frente?