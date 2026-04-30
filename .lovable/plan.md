## Objetivo

Quando uma demanda for movida para uma coluna de aprovação (interna ou do cliente) — tanto pelo Kanban quanto pela tela de detalhe — abrir um **modal de seleção de quem deve ser notificado**. O usuário poderá:

1. Escolher destinatários específicos para aquela aprovação;
2. Marcar "notificar todos do quadro";
3. Salvar uma **preferência padrão na sua conta** para não precisar escolher toda vez (a regra padrão será aplicada automaticamente nas próximas mudanças).

## Regras por tipo de aprovação

- **Aprovação Interna** (`adjustmentType: "internal"` / status "Aprovação Interna"):
  - Destinatários elegíveis: membros do quadro com role `admin` (Owner), `moderator` (Coordenador) e `executor` (Agente).
  - Solicitantes do quadro **não** aparecem.

- **Aprovação do Cliente** (`adjustmentType: "external"` / status "Aprovação do Cliente"):
  - Destinatários elegíveis: membros do quadro com role `requester` (Solicitante).

Em ambos os casos: opção "Notificar todos os elegíveis do quadro" e opção "Notificar também o criador da demanda" (marcada por padrão).

## Comportamento e disparo

O modal aparece **apenas** quando a demanda transita PARA "Aprovação Interna" ou "Aprovação do Cliente" (não em outros movimentos). Se já estiver na coluna, não dispara.

Pontos de integração:
- `src/components/KanbanBoard.tsx` — em `handleStatusChange` (drag & drop) e `handleMobileStatusChange` (dropdown).
- `src/pages/DemandDetail.tsx` — no handler de troca de status no `Select` (junto à lógica que já existe para `approvalStatusId`).

Sequência:
1. Disparar a atualização de status normalmente (otimista, como já é hoje).
2. **Após** sucesso da atualização, se `behavior = "ask"`, abrir o modal `ApprovalNotifyDialog`.
3. Se `behavior = "auto"`, montar a lista a partir da preferência do usuário e enviar notificações sem abrir modal.
4. Se `behavior = "none"`, não notificar ninguém adicional (mantém apenas notificações já existentes do sistema).

## Modal `ApprovalNotifyDialog`

Novo componente em `src/components/ApprovalNotifyDialog.tsx`. Layout:

```text
┌─ Notificar sobre aprovação ─────────────────────┐
│  A demanda "<título>" foi movida para           │
│  <Aprovação Interna | Aprovação do Cliente>.    │
│                                                 │
│  Selecione quem será notificado:                │
│  ◉ Todos os elegíveis do quadro                 │
│  ○ Selecionar manualmente                       │
│     ☐ João (Owner)                              │
│     ☐ Maria (Coordenadora)                      │
│     ☐ Pedro (Agente)                            │
│  ☑ Notificar também o criador da demanda        │
│                                                 │
│  ─────────────────────────────────────────────  │
│  ☐ Salvar como padrão para futuras aprovações   │
│     (se marcado, aparece um seletor:            │
│      "Sempre perguntar / Notificar todos /       │
│       Não notificar")                            │
│                                                 │
│  [ Pular ]              [ Notificar (N) ]        │
└─────────────────────────────────────────────────┘
```

- Campo de busca acima da lista quando há mais de 8 membros.
- Mostra badge da role ao lado do nome (cores já existentes: laranja para Owner, etc).
- Botão "Notificar" desabilitado quando lista final está vazia.
- "Pular" fecha sem enviar notificações extras.

## Preferências do usuário

Estender `src/hooks/useNotificationPreferences.ts` (já usa `user_preferences` com `preference_key = 'notification_preferences'`) para incluir dois novos campos:

```ts
approvalNotifyMode: 'ask' | 'all' | 'none';   // padrão: 'ask'
approvalNotifyIncludeCreator: boolean;        // padrão: true
```

Adicionar nova seção em `src/pages/Settings.tsx` ("Aprovações"):
- Select: "Ao mover demanda para aprovação..." → `Sempre perguntar` / `Notificar todos os elegíveis automaticamente` / `Não notificar ninguém`.
- Switch: "Incluir criador da demanda nas notificações de aprovação".

Quando o usuário marca "Salvar como padrão" no modal, gravamos `approvalNotifyMode = 'all'` (se escolheu "Todos") ou `'none'` (se "Pular") via o mesmo hook.

## Notificações enviadas

Para cada usuário escolhido, criar:
1. Linha em `notifications` (in-app) — `type: 'info'`, link `/demands/<id>`.
2. Push notification via `send-push-notification` edge function (já existe).
3. Email via `send-email` edge function com template `notification` (igual ao padrão usado em `KanbanAdjustmentDialog.tsx`).

Título: `[<Board>] Aprovação <interna | do cliente> pendente`
Mensagem: `A demanda "<título>" aguarda sua aprovação.`

Excluir o `auth.uid()` atual da lista (não notificar a si mesmo). Usar `Set<string>` para deduplicar.

## Detalhes técnicos

**Arquivos novos:**
- `src/components/ApprovalNotifyDialog.tsx` — modal reutilizável. Props: `open`, `onOpenChange`, `demandId`, `demandTitle`, `boardId`, `boardName`, `approvalType: 'internal' | 'external'`, `demandCreatedBy`.

**Arquivos modificados:**
- `src/hooks/useNotificationPreferences.ts` — adicionar `approvalNotifyMode` e `approvalNotifyIncludeCreator` no `NotificationPreferences`, defaults e merge.
- `src/pages/Settings.tsx` — nova subseção "Aprovações" dentro do card de Notificações.
- `src/components/KanbanBoard.tsx` — após sucesso do `updateDemand.mutate` em `handleStatusChange` e `handleMobileStatusChange`, se `columnKey === "Aprovação Interna" || "Aprovação do Cliente"` e `previousStatusName !== columnKey`, aplicar lógica `ask | auto | none`.
- `src/pages/DemandDetail.tsx` — no handler do Select de status, mesma lógica.

**Detecção do tipo de aprovação:**
- Se status name = "Aprovação Interna" → `internal`.
- Se status name = "Aprovação do Cliente" → `external`.
- Alternativamente usar `board_statuses.adjustment_type` (`'internal'` / `'external'`) para suportar status customizados que herdem a semântica.

**Carregamento de membros elegíveis:**
- Utilizar `useBoardMembers(boardId)` (já existente) e filtrar por `role` conforme o tipo de aprovação. Carregar só quando o modal estiver aberto.

**Sem mudanças de schema/DB:** tudo cabe na coluna `preference_value` (jsonb) já existente em `user_preferences`. Sem migração SQL necessária.

## Fora do escopo

- Não alteramos a lógica do `KanbanAdjustmentDialog` (ajustes/retorno) — esse modal continua igual.
- Não criamos uma nova tabela de "notificação por demanda" — o disparo é pontual no momento da troca.
- Não mudamos a lógica de quem vê o chat interno/externo.
