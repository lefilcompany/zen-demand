

# Melhorar Notificações por Papel (Role-Based Notifications)

## Objetivo
Ajustar o sistema de notificações para que:
- **Admin**: receba TODAS as notificações do quadro
- **Coordenador/Agente (moderator/executor)**: receba apenas notificações de demandas onde estão como responsáveis (assignees)
- **Solicitante (requester)**: mantém o comportamento atual (notificações das demandas que criou)

## Funções de Notificação a Alterar

### 1. `notify_demand_created` (Trigger: INSERT em demands)
**Atual**: Notifica TODOS os membros do quadro (exceto o criador).
**Novo**: Notifica apenas os **admins** do quadro (exceto o criador). Coordenadores/Agentes nao recebem, pois ainda nao sao responsaveis.

### 2. `notify_demand_status_changed` (Trigger: UPDATE em demands)
**Atual**: Notifica o criador + assignees da demanda.
**Novo**: Notifica o criador + assignees + **admins do quadro** (sem duplicatas). Admins sempre recebem, independente de serem assignees ou criadores.

### 3. `notify_adjustment_completed` (Trigger: UPDATE em demands)
**Atual**: Notifica apenas o criador da demanda.
**Novo**: Notifica o criador + **admins do quadro** (sem duplicatas).

### Funcoes que NAO mudam
- `notify_assignee_added` - notifica o usuario atribuido (correto, e direcionado)
- `notify_demand_assigned` - notifica o usuario atribuido (correto)
- `notify_mention` - notifica o mencionado (correto, e direcionado)
- `notify_demand_request_created` - notifica admins/moderators (correto, e sobre solicitacoes)
- `notify_demand_request_status_changed` - notifica o solicitante (correto)
- `notify_request_comment_created` - ja tem logica correta
- `notify_team_join_request_*` - sobre equipe, nao demandas

### 4. Push Notifications (client-side)
Atualizar as funcoes em `useSendPushNotification.ts` que enviam push para "todos os membros do board" para filtrar por papel, enviando para admins sempre e para os demais apenas se forem assignees.

Tambem atualizar hooks que disparam push notifications (como criacao de demanda, mudanca de status) para respeitar a mesma logica.

## Detalhes Tecnicos

### Migracao SQL
Uma unica migracao que recria as 3 funcoes trigger:

1. **`notify_demand_created`**: Loop apenas em `board_members WHERE role = 'admin'`
2. **`notify_demand_status_changed`**: Apos notificar criador e assignees, adiciona loop para admins do board com verificacao `NOT IN` para evitar duplicatas
3. **`notify_adjustment_completed`**: Apos notificar criador, adiciona loop para admins do board (exceto criador)

### Client-side (Push Notifications)
- `sendNewDemandPushNotification`: Filtrar `teamMemberIds` no chamador para enviar apenas para admins (os hooks que chamam esta funcao precisam buscar apenas admin IDs do board)
- `sendStatusChangePushNotification`: Adicionar admin IDs aos `userIds` no chamador

### Arquivos a editar
- Nova migracao SQL (3 funcoes trigger reescritas)
- `src/hooks/useDemands.ts` ou hooks que chamam push notifications na criacao de demanda - ajustar para filtrar por role
- Possivelmente `src/pages/DemandDetail.tsx` ou `src/components/KanbanBoard.tsx` onde status changes disparam push

