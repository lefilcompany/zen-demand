

## Redesign do Dashboard para Administradores, Coordenadores e Agentes

### Visão Geral
Reestruturar o dashboard principal (`src/pages/Index.tsx`) para seguir o layout da imagem de referência, organizando widgets em seções temáticas com cards agrupados e análises de IA automáticas.

### Layout Proposto (Desktop)

```text
┌──────────────────────────────────────────────────────┐
│ Banner (imagem existente) + BoardSelector + Personalizar │
├──────────────────────────────────────────────────────┤
│ [Análise IA 1] [Análise IA 2] [Análise IA 3] [CTA Resumo]│
├──────────────────────────────────────────────────────┤
│  PRODUTIVIDADE (Card grande)  │  DEMANDAS (Card grande) │
│  ┌─────────┬──────────┐       │  ┌────────┬──────────┐  │
│  │Tempo méd│Tempo ativ│       │  │Pie cat.│Line trend│  │
│  │conclusão│  (horas) │       │  │serviço │ visão ger│  │
│  └─────────┴──────────┘       │  └────────┴──────────┘  │
│  + seletor de período         │  + seletor de período   │
├──────────────────────────────────────────────────────┤
│  ANÁLISE POR MEMBRO           │  ATIVIDADES             │
│  ┌──────────┬──────────┐      │  (lista recente)        │
│  │Workload  │Member    │      │                         │
│  │chart+sum │list+rate │      │                         │
│  └──────────┴──────────┘      │                         │
└──────────────────────────────────────────────────────┘
```

### Plano Detalhado

**1. Criar Edge Function `dashboard-ai-insights`**
- Nova edge function que recebe `board_id` e retorna 3 análises curtas de IA
- Busca dados resumidos do quadro (status, prazos, carga) e gera 3 insights via Lovable AI (`google/gemini-2.5-flash`)
- Cada insight: título curto + descrição de 2 linhas + 2 links de ação (ex: "ver demandas atrasadas")
- Cache de 1h via query key para evitar chamadas excessivas

**2. Criar componente `DashboardAIInsights`**
- Grid de 4 colunas (3 cards de insight + 1 CTA "Gerar Resumo Completo")
- Cards com fundo laranja claro (como na imagem), título bold, texto descritivo, links de ação
- CTA com botão laranja "Gerar Resumo Completo" que navega para `/board-summary`
- Mobile: stack vertical (1 coluna), tablet: 2 colunas

**3. Criar componente `ProductivitySection`**
- Card agrupado com título "PRODUTIVIDADE" + ícone de configuração (toggle via DashboardCustomizer)
- Dentro: 2 sub-cards lado a lado:
  - **Tempo médio de conclusão**: valor em dias + barra de progresso laranja com range (1- dias a 9+ dias) + "Média esperada" badge
  - **Tempo em atividade**: total de horas registradas + barra similar (1- horas a 15+ horas)
- Seletor de período embaixo (Este mês | 3 meses | 6 meses | 1 ano | Tudo)
- Dados: reutilizar `useBoardTimeStats` + `AverageCompletionTime` logic

**4. Criar componente `DemandsSectionCard`**
- Card agrupado com título "DEMANDAS" + ícone de configuração
- Dentro: 2 sub-cards:
  - **Por categoria**: Pie chart colorido de demandas por serviço/categoria (usando `useServices` + demands)
  - **Visão geral**: Line chart multi-série (Solicitadas, A Iniciar, Em Andamento, Entregue) por tempo
- Seletor de período embaixo
- Dados: demands agrupados por `service_id` para categorias

**5. Criar componente `MemberAnalysisSection`**  
- Card agrupado com título "ANÁLISE POR MEMBRO" + ícone de configuração
- Dentro: layout 2 colunas:
  - Esquerda: `WorkloadDistributionChart` existente (reutilizar)
  - Direita: lista de membros com avatar, nome, % entrega, breakdown (Ini/And/Ent)
- Seletor de período

**6. Refatorar `src/pages/Index.tsx` (view admin/coordenador/agente)**
- Remover os stat cards atuais (5 cards) 
- Reorganizar a ordem: Banner → AI Insights → Produtividade + Demandas → Análise por Membro + Atividades
- Manter `DashboardCustomizer` para toggle de cada seção
- Atualizar `useDashboardWidgets` com novas keys: `aiInsights`, `productivitySection`, `demandsSection`, `memberAnalysis`

**7. Responsividade**
- **Desktop (lg+)**: layout 2 colunas para seções Produtividade/Demandas e Membro/Atividades
- **Tablet (md)**: seções empilham verticalmente, sub-cards mantêm lado a lado
- **Mobile (sm)**: tudo empilha, gráficos com altura reduzida, textos menores

### Arquivos Impactados
- `supabase/functions/dashboard-ai-insights/index.ts` (novo)
- `src/components/DashboardAIInsights.tsx` (novo)
- `src/components/ProductivitySection.tsx` (novo)
- `src/components/DemandsSectionCard.tsx` (novo)
- `src/components/MemberAnalysisSection.tsx` (novo)
- `src/pages/Index.tsx` (refatorar layout admin)
- `src/hooks/useDashboardWidgets.ts` (adicionar novas keys)
- `src/components/DashboardCustomizer.tsx` (labels novas)
- `src/components/DashboardBanner.tsx` (adicionar BoardSelector inline)

