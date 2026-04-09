

## Diagnóstico e correções

### Problema 1: Demandas agendadas não geram automaticamente

**Diagnóstico:** O cron job está rodando corretamente a cada minuto (status 200). A edge function `process-recurring-demands` também funciona — os logs mostram "Found recurring demands: 0". O problema é que **não existem demandas recorrentes ativas** no banco. As únicas duas entradas usam `frequency: "test_1min"`, que não é um valor válido no frontend (as opções são `daily`, `weekly`, `biweekly`, `monthly`).

**Bug real encontrado:** Quando a edge function processa uma demanda com `frequency: "test_1min"`, o `calculateNextRunDate` cai no fallback (próximo dia útil). Porém, como `next_run_date` permanece no mesmo dia, a edge function pode processar a mesma demanda **múltiplas vezes no mesmo dia** antes de atualizar o `next_run_date`. Isso é uma condição de corrida.

**Correção:**
- Na edge function `process-recurring-demands/index.ts`: Adicionar uma validação de frequência antes de processar. Se a frequência não for válida (`daily`, `weekly`, `biweekly`, `monthly`), logar um aviso e pular.
- Adicionar um campo `processing_lock` ou verificar `last_generated_at` para evitar processar a mesma demanda duas vezes no mesmo dia (se `last_generated_at` é hoje, pular).
- Garantir que o `next_run_date` é sempre no futuro após processamento.

### Problema 2: Demandas duplicadas ao marcar como "Entregue"

**Diagnóstico:** Não há duplicatas reais no banco de dados. O problema é visual — uma **condição de corrida entre optimistic updates e realtime**.

Fluxo do bug:
1. Usuário arrasta demanda para "Entregue" ou clica em "Marcar como concluída"
2. `optimisticUpdates` move o card visualmente para "Entregue"
3. O `updateDemand.mutate` envia o update ao banco
4. O trigger de realtime (`useRealtimeDemands`) detecta a mudança e invalida as queries
5. A query é refetchada, trazendo os dados atualizados do servidor
6. **Por um breve momento**, tanto o optimistic update quanto os dados do servidor mostram a demanda em "Entregue", mas como o `getDemandsForColumn` verifica primeiro o `optimisticUpdates`, não deveria duplicar...

**Na verdade**, o bug está na invalidação de queries: quando o realtime dispara `queryClient.invalidateQueries({ queryKey: ["demands", boardId] })`, a query refetcha e retorna dados atualizados. Mas o `onSuccess` da mutation TAMBÉM invalida queries. A combinação pode causar re-renders onde o optimistic update ainda está ativo enquanto os dados reais já foram atualizados.

Além disso, o `useRealtimeAllDemands` invalida `queryKey: ["demands"]` sem boardId, e `useRealtimeDemands` invalida `queryKey: ["demands", boardId]`. Ambos podem estar ativos simultaneamente na página `/demands`, causando múltiplas invalidações.

**Correção no `KanbanBoard.tsx`:**
- Limpar o optimistic update ANTES do refetch, não apenas no `onSuccess`. Usar `onMutate` para limpar assim que a resposta do servidor chegar (ou usar `onSettled` para garantir limpeza).
- Alternativamente, no `getDemandsForColumn`, adicionar deduplicação por ID para garantir que cada demanda apareça em apenas uma coluna.

**Correção no `useRealtimeDemands.ts`:**  
- Evitar invalidações redundantes entre `useRealtimeDemands` e `useKanbanRealtimeNotifications` que ambos invalidam `["demands", boardId]`.

### Alterações técnicas

**Arquivo: `supabase/functions/process-recurring-demands/index.ts`**
1. Adicionar validação: se `last_generated_at` é hoje, pular (evita dupla execução)
2. Validar frequência antes de processar
3. Garantir `next_run_date` é sempre estritamente futuro

**Arquivo: `src/components/KanbanBoard.tsx`**
1. No `getDemandsForColumn`: adicionar Set de IDs já vistos para deduplicação — se uma demanda já apareceu em outra coluna, não mostrar novamente
2. Usar `onSettled` ao invés de `onSuccess` para limpar optimistic updates (garante limpeza mesmo em caso de erro + realtime racing)

**Arquivo: `src/hooks/useRealtimeDemands.ts`**
1. Remover invalidação duplicada de `["demands", boardId]` no `useKanbanRealtimeNotifications` (já feita no `useRealtimeDemands`)

