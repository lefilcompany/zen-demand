## Problema

O flag `is_overdue` está correto no banco (verificado: demanda #0001 tem `is_overdue=true` + `delivered_at` setado), e a função `isDemandDeliveredLate()` já existe em `src/lib/dateUtils.ts`. Porém os componentes que **realmente** renderizam o status nas três telas não a utilizam:

- `/demands` (tabela) — usa `DemandHierarchyTable.tsx`, que tem renderização própria de status/data ignorando `is_overdue`. (O `columns.tsx` já corrigido não está em uso aqui.)
- `/demands` (grid) — `DemandHierarchyGrid.tsx` igualmente.
- `/kanban` — `KanbanBoard.tsx` mostra apenas o badge de status nativo no card, sem indicação de entrega tardia.
- `/demands/:id` (detalhe) — `DemandDetail.tsx` mostra somente `demand.demand_statuses.name` no botão de status, sem distinção.
- IA (`dashboard-ai-insights`) — não diferencia "entregue no prazo" de "entregue com atraso".

## Mudanças

### 1. Tabela `/demands` — `DemandHierarchyTable.tsx`
- Importar `isDemandDeliveredLate` e `isDemandOverdue` de `@/lib/dateUtils`.
- Na célula de **Status**: se `isDemandDeliveredLate(demand)` → renderizar badge âmbar com ícone `AlertTriangle` e texto "Entregue com atraso", caso contrário manter o badge atual.
- Na célula de **Data de Expiração**: substituir `isDateOverdue` por `isDemandOverdue(demand)` (que respeita o estado de entrega) para que a data não fique vermelha em demandas já entregues.

### 2. Grid `/demands` — `DemandHierarchyGrid.tsx`
- Mesma adição: badge âmbar "Entregue com atraso" sobrepondo o status verde quando aplicável; cor da data tratada com `isDemandOverdue`.

### 3. Kanban — `KanbanBoard.tsx`
- No header do card (linha ~1685, próximo ao título e ao código `#0001`), adicionar um pequeno chip âmbar "Entregue com atraso" com `AlertTriangle` quando `isDemandDeliveredLate(demand)` for verdadeiro. Visível mesmo com o accordion "Informações da demanda" recolhido.
- Tooltip explicativo no chip (padrão `delayDuration={300}`, conforme memória de Kanban Tooltips).

### 4. Detalhe da demanda — `DemandDetail.tsx`
- No `DropdownMenuTrigger` que mostra o status atual (linha ~856), quando `isDemandDeliveredLate(demand)` → trocar a aparência por um badge âmbar "Entregue com atraso" (mantendo o dropdown funcional para troca de status).
- Logo abaixo, exibir uma linha discreta indicando: "Entregue em DD/MM/AAAA, X dias após o prazo".

### 5. Insights da IA — `supabase/functions/dashboard-ai-insights/index.ts`
- Adicionar `is_overdue` ao `select`.
- Calcular três métricas separadas:
  - `deliveredOnTimeCount`: `delivered_at` presente e `is_overdue = false`.
  - `deliveredLateCount`: `delivered_at` presente e `is_overdue = true`.
  - `overdueCount`: não entregues e atrasadas (mantém atual, mas usando `is_overdue` quando disponível).
- Passar essas três contagens no prompt da IA com instruções claras: "Diferencie 'entregues no prazo', 'entregues com atraso' e 'vencidas (não entregues)' nos insights e recomendações."
- Aplicar o mesmo refinamento ao `board-summary/index.ts`: já distingue late × overdue por data, mas vamos preferir `is_overdue` (mais confiável) e reforçar a mesma terminologia no prompt.

### 6. Padrão visual unificado
Todos os badges de "Entregue com atraso" usarão a mesma classe (já em uso em `DemandCard` e `columns.tsx`):
```
bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-400
```
com ícone `AlertTriangle` para consistência visual.

## Resultado esperado
- Demanda #0001 aparecerá com badge âmbar "Entregue com atraso" no card do kanban, na linha da tabela `/demands`, no card do grid, e no topo da tela de detalhe.
- A data de expiração deixará de ficar em vermelho-de-alerta em demandas entregues; a indicação de "atraso na entrega" passa a ser exclusiva do badge âmbar.
- Resumos da IA passam a tratar entregas com atraso como categoria própria.

Sem mudanças no banco — toda a lógica já está persistida em `is_overdue`.
