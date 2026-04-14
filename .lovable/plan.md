

## Implementação de Subdemandas com Dependências

### Conceito

Subdemandas são **demandas reais** (na tabela `demands`) vinculadas a uma demanda pai via `parent_demand_id`. Cada subdemanda pode ter uma **dependência** de outra subdemanda — só pode ser iniciada quando a dependência for concluída (status "Entregue").

### Parte 1 — Backend (Banco de Dados)

**Migration 1: Adicionar colunas e tabela de dependências**

```sql
-- Coluna parent_demand_id na tabela demands
ALTER TABLE public.demands ADD COLUMN parent_demand_id UUID REFERENCES public.demands(id) ON DELETE CASCADE;
CREATE INDEX idx_demands_parent ON public.demands(parent_demand_id) WHERE parent_demand_id IS NOT NULL;

-- Tabela de dependências entre subdemandas
CREATE TABLE public.demand_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id UUID NOT NULL REFERENCES public.demands(id) ON DELETE CASCADE,
  depends_on_demand_id UUID NOT NULL REFERENCES public.demands(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(demand_id, depends_on_demand_id),
  CHECK(demand_id != depends_on_demand_id)
);

ALTER TABLE public.demand_dependencies ENABLE ROW LEVEL SECURITY;

-- RLS: mesma lógica de board_members
CREATE POLICY "Board members can manage dependencies" ON public.demand_dependencies
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM demands d
    JOIN board_members bm ON bm.board_id = d.board_id AND bm.user_id = auth.uid()
    WHERE d.id = demand_dependencies.demand_id
  )
);
```

**Migration 2: RPC transacional para criar demanda com subdemandas**

Função `create_demand_with_subdemands` que recebe:
- Dados da demanda principal (title, board_id, status_id, etc.)
- Array de subdemandas (title, priority, service_id, etc.)
- Array de dependências (índice da subdemanda → índice da subdemanda dependente)

Tudo dentro de uma transação PL/pgSQL — se qualquer parte falhar, tudo é revertido automaticamente.

**Migration 3: Trigger para bloquear início de subdemanda com dependência não concluída**

Trigger `before update` em `demands` que verifica: se a demanda tem dependências não concluídas e está sendo movida para "Fazendo", bloqueia a operação.

### Parte 2 — Frontend: Hooks e Lógica

**Novo hook `useSubdemands.ts`** (substitui o atual `useSubtasks.ts`):
- `useSubdemands(parentDemandId)` — busca subdemandas reais (demands com parent_demand_id)
- `useDemandDependencies(demandId)` — busca dependências
- `useCreateDemandWithSubdemands()` — chama a RPC transacional

**Modificar `useDemands.ts`**:
- Filtrar demandas com `parent_demand_id IS NULL` nas listagens principais (Kanban, tabela) para não exibir subdemandas como demandas soltas

### Parte 3 — Frontend: Modal de Criação

**Modificar `CreateDemand.tsx`**:
- Seção "Subdemandas" com botão "Adicionar Subdemanda" (como nas imagens)
- Cada subdemanda: badge colorida com título, botão de editar/remover
- Campo "Pode iniciar quando [Subdemanda X] for concluída" — select para definir dependência
- Ao submeter: chama a RPC `create_demand_with_subdemands` em vez de `createDemand.mutate`

### Parte 4 — Frontend: Tela de Detalhe da Demanda

**Modificar `DemandDetail.tsx`**:
- Seção "Subdemandas" exibindo badges coloridas por status (verde=entregue, azul=fazendo, cinza=a iniciar, vermelho=ajuste)
- Clicável → navega para a subdemanda
- Botão para adicionar novas subdemandas
- Se a demanda atual é subdemanda: mostrar link "Dentro da demanda: #XXXX" para voltar à demanda pai

### Parte 5 — Frontend: Kanban

**Modificar `KanbanBoard.tsx`**:
- Filtrar `parent_demand_id IS NULL` para não mostrar subdemandas como cards separados
- No card da demanda pai: mostrar preview das subdemandas (como nas imagens — badges coloridas com "Ver mais")
- Indicar "Dentro da demanda: #XXXX" no card da subdemanda quando exibida em contexto

### Arquivos modificados/criados

| Arquivo | Ação |
|---------|------|
| Migration SQL (3 migrations) | Criar: colunas, tabela, RPC, trigger |
| `src/hooks/useSubdemands.ts` | Criar: hooks para subdemandas reais |
| `src/hooks/useDemands.ts` | Modificar: filtrar parent_demand_id IS NULL |
| `src/pages/CreateDemand.tsx` | Modificar: seção de subdemandas + RPC |
| `src/pages/DemandDetail.tsx` | Modificar: exibir/gerenciar subdemandas |
| `src/components/KanbanBoard.tsx` | Modificar: filtrar + preview de subdemandas |
| `src/components/SubdemandBadge.tsx` | Criar: badge colorida de subdemanda |
| `src/components/SubdemandSelector.tsx` | Criar: select para dependências |

### Fluxo transacional

```text
Usuário clica "Criar Demanda"
  ├── RPC create_demand_with_subdemands()
  │   ├── BEGIN TRANSACTION
  │   ├── INSERT demanda principal → OK
  │   ├── INSERT subdemanda 1 → OK
  │   ├── INSERT subdemanda 2 → OK
  │   ├── INSERT dependência (sub2 depende de sub1) → OK
  │   ├── COMMIT ✓
  │   └── Retorna IDs criados
  └── Frontend: toast sucesso + navega

Se qualquer INSERT falha → ROLLBACK automático → nenhum registro criado
```

### Regra de dependência

- Subdemanda com dependência pendente: status travado em "A Iniciar"
- Ao tentar mover para "Fazendo": trigger bloqueia + frontend mostra toast "Esta subdemanda depende de [#XXXX] que ainda não foi concluída"
- Quando a dependência é concluída (status "Entregue"): subdemanda pode ser iniciada normalmente

