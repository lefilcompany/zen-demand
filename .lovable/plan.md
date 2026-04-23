

## Subdemandas: Modal dedicado + edição de dependência

Atualmente o componente `DemandEditForm` é usado tanto para demandas pai quanto para subdemandas, exibindo o controle "Subdemandas (+/-)" mesmo quando estamos editando uma subdemanda — o que não faz sentido. Além disso, não há como remover/alterar a dependência ("Pode iniciar quando…") de uma subdemanda já existente.

A solução é separar os fluxos de edição em dois modais distintos e criar um seletor de dependência dentro do modal de subdemanda.

### O que será feito

**1. Criar `SubdemandEditForm` (novo componente)**
- Baseado em `DemandEditForm`, mas:
  - **Sem** o controle de "Subdemandas (+/-)" no header.
  - **Sem** o sistema de steps (não há criação de novas subdemandas).
  - **Sem** a seção de "Recorrência" (subdemandas não recorrem).
  - Mantém todos os demais campos: Título, Serviço, Responsáveis, Status, Prioridade, Data de Entrega, Descrição.
  - Adiciona uma nova seção **"Dependência"** com:
    - Select listando as outras subdemandas irmãs (mesmo `parent_demand_id`), com opção "Nenhuma" para remover.
    - Aviso visual mostrando a dependência atual (se houver) com o botão de remoção rápida.
- Header passa a ser "Editar Subdemanda" + descrição "Atualize os dados desta subdemanda".

**2. Lógica de dependência (CRUD)**
- Novo hook `useUpdateSubdemandDependency` em `src/hooks/useSubdemands.ts`:
  - Recebe `{ demandId, dependsOnDemandId | null }`.
  - Faz `delete from demand_dependencies where demand_id = X` e, se houver novo valor, faz `insert`.
  - Invalida queries: `subdemands`, `demand-dependencies`, `batch-dependency-info`, `demand-dependency-info`.

**3. Roteamento do modal em `DemandDetail.tsx`**
- Detectar se a demanda aberta é uma subdemanda (`demand.parent_demand_id !== null`).
- Se for subdemanda → renderizar `<SubdemandEditForm>` no Dialog de edição.
- Se for demanda pai → manter `<DemandEditForm>` como hoje.

**4. Limpeza em `DemandEditForm`**
- Sem mudanças funcionais grandes; apenas garantir que continua dedicado a demandas pai (nenhuma alteração no comportamento de subdemandas via steps de criação).

### Arquivos afetados

- **Criar**: `src/components/SubdemandEditForm.tsx`
- **Editar**: `src/hooks/useSubdemands.ts` (adicionar hook de update da dependência)
- **Editar**: `src/pages/DemandDetail.tsx` (escolher qual form renderizar com base em `parent_demand_id`)

### UX de remoção/alteração de dependência

Dentro do `SubdemandEditForm`, na seção "Dependência":

```
Dependência
┌──────────────────────────────────────────────┐
│ 🔒 Atualmente depende de: "teste 2"   [✕]   │
└──────────────────────────────────────────────┘
Pode iniciar quando: [ Selecionar subdemanda ▾ ]
                     [ Nenhuma (sem dependência) ]
```

O `[✕]` limpa o select para "Nenhuma" e a alteração é persistida ao clicar em "Salvar Alterações" (junto com os outros campos), garantindo uma única transação visual e evitando estados inconsistentes.

### Validação

- Não permitir selecionar a própria subdemanda como dependência.
- Não permitir ciclos simples (se A depende de B, B não pode depender de A) — validado no front-end com aviso amigável.
- Apenas subdemandas irmãs (mesmo `parent_demand_id`) aparecem no select.

