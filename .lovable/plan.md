

# Plano: Destacar visualmente a Demanda Principal no Kanban

## Contexto
Atualmente, a demanda principal tem apenas um `bg-primary/10` e `ring-1 ring-primary/25` — diferença sutil demais. Precisamos de uma distinção clara entre os 3 tipos de card: **demanda principal**, **subdemanda** e **demanda normal**.

## Abordagem

Criar uma borda lateral esquerda colorida (left border accent) na demanda principal, similar a um padrão visual de "card com indicador lateral", que é elegante e não exagerado.

### Mudanças no `KanbanBoard.tsx`

**Demanda Principal — card com destaque refinado:**
- Adicionar `border-l-[3px] border-l-primary` — borda esquerda laranja sólida como indicador visual forte
- Manter `bg-primary/5` (tom bem leve) ao invés de `bg-primary/10`
- Remover o `ring-1 ring-primary/25` (redundante com a borda lateral)
- Trocar o label "Demanda Principal" por um ícone `Crown` (coroa) ou `Star` ao lado do código, em tom laranja — mais visual, menos textual
- Manter os chips de subdemandas e tempo como estão

**Subdemanda — sem mudança visual significativa:**
- Já possui o bloco "Vinculada a" na parte inferior, o que a diferencia
- Mantém o estilo atual compacto

**Demanda Normal — baseline sem indicadores:**
- Sem borda lateral, sem tint de fundo
- Comportamento atual

### Resumo visual

```text
┌─────────────────────┐
│ Demanda Normal      │  Sem borda, fundo neutro
│                     │
└─────────────────────┘

┌─────────────────────┐
│ Subdemanda          │  Sem borda, fundo neutro
│ ┌─ Vinculada a ───┐ │  + bloco de referência pai
│ └─────────────────┘ │
└─────────────────────┘

┃─────────────────────┐
┃ ★ #0045             │  Borda laranja esquerda 3px
┃ Título da demanda   │  bg-primary/5 (leve)
┃ Subdemandas: 2      │  Ícone estrela no header
┃─────────────────────┘
```

### Detalhes técnicos
1. Substituir as classes do Card para demanda principal:
   - De: `bg-primary/10 ring-1 ring-primary/25 shadow-sm`
   - Para: `border-l-[3px] border-l-primary bg-primary/5 dark:bg-primary/10`

2. Trocar o texto "Demanda Principal" por ícone `Star` com tamanho `h-3 w-3 text-primary fill-primary/30`

3. Manter os badges de código, prioridade e serviço com as cores originais (não mais forçar `bg-primary/15` em todos) — isso diferencia visualmente do card normal pelo contexto da borda, não pela cor dos badges

