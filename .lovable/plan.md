

# Visualizador de Demandas Agendadas (Recorrentes)

## Resumo
Adicionar um botao/chip nas telas de **Demandas** e **Kanban** que abre um modal (dialog) mostrando todas as demandas recorrentes ativas do quadro atual. Cada item mostra as especificacoes em um dropdown expansivel, com possibilidade de edicao individual e garantia de que nenhuma data caia em fim de semana.

---

## Fluxo do Usuario

1. Na toolbar das telas Demandas e Kanban, aparece um botao "Agendadas" com badge indicando a quantidade
2. Ao clicar, abre um Dialog/Modal listando as demandas recorrentes ativas
3. Cada demanda agendada e um item expansivel (Collapsible/Accordion) que mostra:
   - Titulo, descricao, prioridade, frequencia
   - Proxima data de criacao (`next_run_date`)
   - Dias da semana (se semanal/quinzenal)
   - Dia do mes (se mensal)
   - Data de inicio e fim
   - Participantes (assignee_ids)
4. Botao "Editar" em cada item abre um formulario inline para alterar os campos
5. Botao "Desativar" para cancelar a recorrencia
6. Ao salvar edicao, o `next_run_date` e recalculado garantindo dia util

---

## Detalhes Tecnicos

### 1. Novo componente: `ScheduledDemandsModal.tsx`

Componente Dialog que:
- Recebe `boardId` e `teamId` como props
- Usa `useRecurringDemands(boardId)` para listar demandas agendadas
- Renderiza cada item como um `Collapsible` com detalhes expandiveis
- Modo edicao inline por item (titulo, descricao, prioridade, frequencia, weekdays, dayOfMonth, datas)
- Usa `useUpdateRecurringDemand()` para salvar e `useDeleteRecurringDemand()` para desativar

### 2. Novo hook: `useUpdateRecurringDemand` (em `useRecurringDemands.ts`)

```typescript
export function useUpdateRecurringDemand() {
  // useMutation que faz supabase.from("recurring_demands").update(...)
  // Recalcula next_run_date com adjustToBusinessDay
  // Invalida queryKey ["recurring-demands"]
}
```

### 3. Integracao na pagina Demands (`src/pages/Demands.tsx`)

- Importar `ScheduledDemandsModal` e `useRecurringDemands`
- Adicionar botao "Agendadas" na toolbar (ao lado dos filtros)
- Botao mostra badge com contagem de demandas recorrentes ativas
- Clicar abre o modal

### 4. Integracao na pagina Kanban (`src/pages/Kanban.tsx`)

- Mesma logica: botao "Agendadas" na barra de acoes
- Badge com contagem
- Modal identico

### 5. Recalculo de datas (business day enforcement)

Ao editar qualquer campo que afete datas (frequencia, weekdays, dayOfMonth, startDate), o `next_run_date` e recalculado no frontend usando a funcao `calculateInitialNextRunDate` ja existente, que aplica `adjustToBusinessDay` para garantir que nunca caia em sabado ou domingo.

### 6. Busca de dados complementares

A query de `useRecurringDemands` sera atualizada para trazer:
- Nomes dos participantes (join com profiles via assignee_ids)
- Nome do servico (join com services)
- Nome do status (join com demand_statuses)

### Arquivos a criar
- `src/components/ScheduledDemandsModal.tsx`

### Arquivos a editar
- `src/hooks/useRecurringDemands.ts` (adicionar `useUpdateRecurringDemand`, melhorar query com joins, exportar funcao de recalculo)
- `src/pages/Demands.tsx` (adicionar botao + modal)
- `src/pages/Kanban.tsx` (adicionar botao + modal)

### Sem alteracoes no banco de dados
As RLS policies ja permitem SELECT, UPDATE e DELETE na tabela `recurring_demands`. Nenhuma migracao necessaria.

