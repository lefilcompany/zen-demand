

## Reordenar subdemandas dentro do grupo no Kanban

Hoje, no Kanban, quando uma demanda principal está expandida (botão "X subdemandas"), as subdemandas aparecem como cartões completos abaixo da demanda pai. Porém, **não é possível reordená-las** ali — a alça de arraste (`GripVertical`) move o cartão entre colunas do Kanban, e não reordena dentro do grupo.

A reordenação só existe hoje no `KanbanSubdemandsList` (lista compacta dentro do cartão pai), o que é confuso e pouco descoberto. Vou trazer a reordenação para o lugar onde o usuário realmente espera: o grupo expandido de subdemandas no Kanban.

### Solução: setas + drag dedicado dentro do grupo

Adicionarei dois mecanismos complementares (sem quebrar o drag-and-drop entre colunas):

**1. Setas de reordenar (sempre visíveis ao passar o mouse)**

Em cada cartão de subdemanda dentro de um grupo expandido, no canto direito do cabeçalho, aparecerá um par discreto de setas `↑ ↓` (ChevronUp / ChevronDown):

- `↑` move a subdemanda uma posição acima entre as irmãs do mesmo pai.
- `↓` move uma posição abaixo.
- Botões ficam desabilitados quando a subdemanda já está na primeira/última posição.
- Validação automática contra dependências (uma subdemanda dependente nunca pode ficar antes da que ela depende) — se a troca violar, exibe toast amigável e não persiste.
- Persistência via RPC já existente `reorder_subdemands` (hook `useReorderSubdemands`).

**2. Drag-and-drop interno dedicado (opcional/visual)**

Adicionarei um pequeno handle de "reordenar grupo" (ícone `GripVertical` em opacidade reduzida) à esquerda de cada cartão filho expandido. Esse handle:

- Usa um MIME type customizado `application/x-subdemand-reorder` (igual ao padrão já adotado em `KanbanSubdemandsList`).
- Não interfere com o drag entre colunas, que continua usando o handle existente do cartão e o MIME `text/plain`.
- Mostra indicador visual (linha azul) entre cartões durante o hover.
- Aplica a mesma validação de dependências antes de persistir.

### Por que duas formas?

- **Setas** são o caminho mais confiável e descoberto, principalmente em telas de toque/trackpad onde drag preciso é difícil. Resolve "sem erros" para 100% dos casos.
- **Drag interno** é mais natural para quem está acostumado e mantém paridade com a lista compacta.

### Detalhes técnicos

Arquivos a alterar:

- **`src/components/KanbanBoard.tsx`**:
  - No bloco de renderização do grupo expandido (linhas ~1633–1656), envolver cada `renderDemandCard(child, ...)` com:
    - Um wrapper `<div>` com listeners `onDragOver` / `onDrop` que respondem somente a `application/x-subdemand-reorder`.
    - Um pequeno overlay no topo direito do cartão com botões `↑`/`↓` (somente quando `children.length > 1` e o usuário tem permissão de edição).
    - Um handle de drag à esquerda, ao lado da linha de conexão, com `draggable` e mime customizado.
  - Importar `useReorderSubdemands` e chamar `mutateAsync({ parentDemandId: demand.id, orderedIds })`.
  - Importar `useBatchDependencyInfo` e `validateSubdemandOrder` para validar a nova ordem.
  - Implementar `handleSubReorder(parentId, fromIndex, toIndex, siblings)` reutilizável pelos dois mecanismos.

- **`src/components/KanbanSubdemandsList.tsx`**: nenhuma mudança — segue funcional como visão compacta.

- **`src/hooks/useSubdemands.ts`**: nada a alterar (`useReorderSubdemands` + RPC `reorder_subdemands` já existem e fazem optimistic update).

### Permissões

Reordenar exige:
- Usuário ser membro do quadro com papel `admin`, `moderator` (Coordenador) ou `executor` (Agente), OU
- Ser o criador da demanda pai.

Se o usuário não tem permissão, as setas e o handle de reorder não são renderizados (mas ele continua vendo a lista normalmente).

### Comportamento esperado

```text
[ DEMANDA PAI #0065 ]
        │
        ├── ⋮⋮  [#0066] teste 2     ↑ ↓     ← setas + handle reorder
        │
        └── ⋮⋮  [#0067] teste 3     ↑ ↓
              🔒 Aguardando: teste 2
```

Ao clicar em `↑` no cartão "teste 3" tentando colocá-lo antes de "teste 2": toast "Não é possível mover: esta subdemanda depende de 'teste 2' e precisa vir depois dela." A operação não é persistida e a UI não muda.

Em caso de sucesso, a UI atualiza otimisticamente (sem flicker) e a nova ordem é confirmada pelo Realtime para todos os usuários conectados.

