

## Plano: Melhorar carrossel de solicitações e unificar telas

### Resumo
Melhorar os cards do carrossel no dashboard do solicitante com ícones, datas e informações mais claras. Remover a página `/my-requests` (MyDemandRequests) e unificar tudo na página `/demand-requests` (DemandRequests), adicionando uma aba "Minhas Solicitações" para solicitantes. Cada card do carrossel levará diretamente à solicitação específica via dialog.

### Alterações

**1. `src/components/RequesterRequestsCarousel.tsx`** — Melhorar cards do carrossel
- Trocar emojis (🏷️, 📋) por ícones Lucide (`Tag`, `Layout`)
- Adicionar label "Status Atual:" antes do status da demanda vinculada
- Mostrar data de criação com ícone `CalendarDays`
- Mostrar data de aprovação (responded_at) quando aprovada, com ícone `CheckCircle`
- Buscar `responded_at` na query do Supabase
- Ao clicar, navegar para `/demand-requests?highlight={requestId}` para abrir diretamente a solicitação

**2. `src/pages/DemandRequests.tsx`** — Unificar com "Minhas Solicitações"
- Adicionar aba "Minhas" visível para solicitantes (role requester), que exibe as solicitações criadas pelo usuário com filtros de status e data (funcionalidade do antigo MyDemandRequests)
- Incluir edição/reenvio inline para solicitações devolvidas/pendentes do próprio usuário
- Ler query param `highlight` da URL para abrir automaticamente o dialog de visualização da solicitação correspondente ao carregar a página
- Ajustar título e breadcrumb dinamicamente conforme o papel do usuário

**3. `src/components/AppSidebar.tsx`** — Atualizar navegação
- Mudar URL de "Minhas Solicitações" de `/my-requests` para `/demand-requests`
- Manter ícone e badge de pendentes/devolvidas

**4. `src/App.tsx`** — Remover rota
- Remover import e rota `/my-requests` (MyDemandRequests)

**5. `src/components/CreateRequestQuickDialog.tsx` e `src/pages/CreateDemandRequest.tsx`**
- Mudar navegação pós-criação de `/my-requests` para `/demand-requests`

**6. `src/pages/MyDemandRequests.tsx`** — Remover arquivo
- Excluir o arquivo (funcionalidade migrada para DemandRequests)

### Detalhes técnicos

- Query do carrossel adicionará `responded_at` ao select do Supabase
- Highlight param: `useSearchParams` para ler `?highlight=<id>` e auto-abrir o dialog `setViewing(request)` no mount
- A aba "Minhas" no DemandRequests usará o hook `useMyDemandRequests` já existente, com filtros de status/data incorporados
- Para solicitantes, as abas visíveis serão: "Pendentes", "Aprovadas", "Devolvidas", "Rejeitadas" (todas filtradas por `created_by = user.id`)
- Para admins/coordenadores, mantém as abas atuais + visualização de todas as solicitações

