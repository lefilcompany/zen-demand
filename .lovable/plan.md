

## Atualizar Dashboard do Solicitante com Componentes do Admin + Carrossel de Histórico

### Contexto
O dashboard do solicitante (requester) usa um layout antigo com stats cards simples e gráficos básicos. O admin já tem componentes modernos (ProductivitySection, DemandsSectionCard). O pedido é: (1) aplicar os mesmos componentes visuais do admin e (2) adicionar um carrossel horizontal com as 10 últimas solicitações mostrando status (aprovada/devolvida/pendente), serviço, e para as aprovadas o status atual da demanda.

### Plano

**1. Criar componente `RequesterRequestsCarousel`**
- Novo arquivo: `src/components/RequesterRequestsCarousel.tsx`
- Busca as 10 últimas `demand_requests` do usuário logado (usando `useAuth` + query direta, sem depender de board selecionado - busca por `team_id`)
- Para requests aprovadas, busca também a demanda vinculada (`demand_id` no request ou título correspondente) para mostrar o status atual
- Layout: container com scroll horizontal (`overflow-x-auto`, `flex`, `gap-3`, `snap-x`)
- Cada card mostra: titulo, serviço, data, badge colorido (Pendente=amarelo, Aprovada=verde, Devolvida=laranja, Rejeitada=vermelho), e para aprovadas mostra o status da demanda com a cor do status

**2. Refatorar o bloco `isRequester` no `Index.tsx`**
- Remover os stats cards manuais e os gráficos antigos (DeliveryStatusChart, lista de recent demands)
- Substituir por:
  - Header com título + PeriodFilter + botão Nova Solicitação (manter)
  - `DemandsSectionCard` com as demandas do período (gráfico de pizza por serviço + área cumulativa)
  - `RequesterRequestsCarousel` - carrossel com as 10 últimas solicitações
  - `ScopeOverviewCard` (manter, condicional)
- O requester não terá ProductivitySection (não faz sentido para cliente) nem MemberAnalysisSection, mas terá o DemandsSectionCard e o carrossel

**3. Alimentar DemandsSectionCard com dados do requester**
- O `useDemandsByPeriod` já busca demands do board selecionado; para o requester, as demands retornadas já incluem as dele
- Passar `demandData?.demands` convertido para o formato esperado pelo `DemandsSectionCard`

### Detalhes Técnicos

- **RequesterRequestsCarousel**: Query em `demand_requests` com `eq("created_by", user.id)`, join em `services(name)`, `boards(name)`, e para status `approved` um join opcional na tabela `demands` pelo campo que vincula request->demand. Se não houver link direto, buscar por título + board_id
- **Scroll horizontal**: `overflow-x-auto scrollbar-hide flex gap-3 snap-x snap-mandatory`, cada card `min-w-[260px] snap-start`
- **Cores de status do request**: `pending` → amber, `approved` → green, `rejected` → red, `returned` → orange
- Responsivo: cards com `min-w-[240px] md:min-w-[280px]`

