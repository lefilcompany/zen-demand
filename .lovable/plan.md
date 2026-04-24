## Problema

Ao mover uma **demanda principal** para um status de finalização (ex: "Aprovação do Cliente"), apenas a pai é atualizada. As subdemandas continuam no status anterior, exigindo atualização manual uma a uma — trabalhoso em demandas com muitas filhas.

Hoje o sistema já tem **propagação no sentido contrário** (filha → pai) implementada em `KanbanBoard.tsx` (`autoMoveParent`), mas não no sentido pai → filhas.

## Solução proposta

Implementar **propagação automática pai → filhas** quando o status da pai muda para um status de **finalização/revisão**:
- ✅ **Aprovação Interna** (`adjustment_type = 'internal'`)
- ✅ **Aprovação do Cliente** (`adjustment_type = 'external'`)
- ✅ **Entregue** (status de sistema)

Em status de execução (Fazendo, A Iniciar, Em Ajuste) **não há propagação** — preserva o controle granular do agente sobre cada subdemanda.

### Confirmação inteligente

Quando houver subdemandas com **timer ativo** ou em status **"Fazendo"/"Em Ajuste"**, o sistema pede confirmação antes de propagar (e parar timers). Caso contrário, propaga direto e mostra um toast informativo (`"3 subdemandas movidas para Aprovação do Cliente"`).

---

## Implementação

### 1. Backend — Migração SQL (nova)

Criar função RPC `propagate_status_to_subdemands(p_parent_id uuid, p_new_status_id uuid)`:

- **SECURITY DEFINER**, valida que o usuário é membro do quadro da demanda pai.
- Busca todas as subdemandas ativas (não arquivadas) do pai.
- Resolve o `status_id` equivalente no quadro (sempre o mesmo board, então é direto).
- Para cada subdemanda:
  - Se estiver com timer ativo (linha em `demand_time_entries` com `ended_at IS NULL`), encerra o timer (`ended_at = now()`, calcula `duration_seconds`).
  - Atualiza `status_id`, `status_changed_by = auth.uid()`, `status_changed_at = now()`.
  - Se o novo status for "Entregue", define `delivered_at = now()`.
- **Bypass do trigger `enforce_demand_dependency`**: como vamos para status de finalização (não "Fazendo"), o trigger atual já permite — não precisa alterar.
- Retorna `jsonb` com `{ updated_count: N, stopped_timers: M }`.

Também garantir que o trigger atual não bloqueie a propagação (já validado: ele só bloqueia "Fazendo").

### 2. Frontend — Hook utilitário

**Novo arquivo `src/lib/subdemandStatusPropagation.ts`**:
- `FINALIZATION_ADJUSTMENT_TYPES = ['internal', 'external']`
- `isFinalizationStatus(status, deliveredStatusId)` → true se for Entregue ou se `adjustment_type` for `internal`/`external`
- `getActiveSubdemandsInfo(subdemands, fazendoIds, ajusteIds)` → `{ activeCount, runningTimerCount }` para decidir se precisa confirmar

### 3. Frontend — Atualização em `src/pages/DemandDetail.tsx`

No dropdown de mudança de status (linha ~756), antes de chamar `updateDemand.mutate`:

```ts
// Só aplica quando: é demanda PAI, tem subdemandas, e novo status é de finalização
const isParent = !demand.parent_demand_id && (subdemands?.length ?? 0) > 0;
const targetBoardStatus = boardStatuses?.find(bs => bs.status_id === status.id);
const isFinalization = isFinalizationStatus(targetBoardStatus, deliveredStatusId);

if (isParent && isFinalization) {
  const { needsConfirmation, activeCount } = analyzeSubdemands(subdemands);
  
  if (needsConfirmation) {
    // Abre AlertDialog: "Esta demanda tem N subdemandas, sendo X em andamento.
    // Mover todas para [Status]? Os timers ativos serão encerrados."
    setPendingStatusChange({ statusId: status.id, statusName: status.name });
    setShowPropagateDialog(true);
    return;
  }
  
  // Sem confirmação: propaga direto
  await supabase.rpc('propagate_status_to_subdemands', {
    p_parent_id: demand.id,
    p_new_status_id: status.id,
  });
  toast.success(`${subdemands.length} subdemandas movidas para ${status.name}`);
}

// Sempre atualiza a pai (comportamento atual)
updateDemand.mutate({ id: demand.id, status_id: status.id, ... });
```

Adicionar:
- Estado `showPropagateDialog` + `pendingStatusChange`
- Componente `<AlertDialog>` com dois botões: **"Mover apenas a principal"** e **"Mover principal + subdemandas"**
- Invalidar query `["subdemands", demand.id]` após sucesso

### 4. Frontend — Atualização em `src/components/KanbanBoard.tsx`

Aplicar a mesma lógica no Kanban quando uma **demanda pai for movida** (apesar de hoje ser bloqueado, manter o comportamento; mas se no futuro permitirem, fica preparado). **Por ora, foco apenas no DemandDetail**, pois o Kanban bloqueia movimentação manual da pai.

### 5. Memória de projeto

Atualizar `mem://features/demands/sub-demands-system` adicionando seção:

> **Propagação pai → filhas**: Mover a demanda principal para status de finalização (Aprovação Interna, Aprovação do Cliente, Entregue) propaga automaticamente o novo status para todas as subdemandas via RPC `propagate_status_to_subdemands`. Timers ativos são encerrados automaticamente. Confirmação modal é exibida apenas quando houver subdemandas com timer ativo ou em "Fazendo"/"Em Ajuste".

---

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `supabase/migrations/<novo>.sql` | Criar RPC `propagate_status_to_subdemands` |
| `src/lib/subdemandStatusPropagation.ts` | Novo helper |
| `src/pages/DemandDetail.tsx` | Integrar lógica + AlertDialog |
| `mem://features/demands/sub-demands-system` | Documentar comportamento |

## Comportamento final

| Cenário | Comportamento |
|---|---|
| Pai → "Fazendo" / "A Iniciar" / "Em Ajuste" | Apenas a pai é atualizada (sem propagação) |
| Pai → "Aprovação Interna/Cliente/Entregue" sem subdemanda ativa | Propaga direto + toast |
| Pai → finalização com subdemandas em "Fazendo" ou com timer | Modal de confirmação antes de propagar |
| Subdemanda → "Fazendo" | Pai vai para "Fazendo" automaticamente (já existente) |
| Todas subdemandas → "Entregue" | Pai vai para "Entregue" automaticamente (já existente) |
