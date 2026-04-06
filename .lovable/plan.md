

## Adicionar seções do Admin ao Dashboard do Solicitante

### Problema
O dashboard do solicitante não mostra as seções de AI Insights, Análise por Membro e Atividades Recentes que existem no dashboard do administrador.

### Plano

**Arquivo: `src/pages/Index.tsx`** — Adicionar ao bloco `isRequester` (linhas 130-198):

1. **AI Insights** — Adicionar `<DashboardAIInsights boardId={selectedBoardId} />` logo após o `<DashboardBanner />`
2. **DemandsSectionCard** — Manter como está (gráfico de pizza por serviço + área cumulativa)
3. **Análise por Membro + Atividades Recentes** — Adicionar grid 2 colunas com `<MemberAnalysisSection>` e `<RecentActivities />` após o carrossel de requests
4. **DashboardCustomizer** — Adicionar o botão de personalizar no header do solicitante e respeitar as mesmas flags de `widgets` para controlar visibilidade

Layout final do requester:
```text
Header (título + filtros + personalizar)
Banner
AI Insights (condicional: widgets.aiInsights)
DemandsSectionCard (condicional: widgets.demandsSection)
RequesterRequestsCarousel
MemberAnalysis + RecentActivities (grid 2 cols, condicional)
ScopeOverviewCard (se houver limite)
```

Os componentes `MemberAnalysisSection` e `RecentActivities` já são independentes de role — usam `selectedBoardId` internamente. O `DashboardAIInsights` também funciona com qualquer board. Não há alterações em outros arquivos.

