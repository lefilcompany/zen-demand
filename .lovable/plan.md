
# Plano: Refatoração Completa da Tela de Resumo IA

## Objetivo
Refatorar completamente a tela de Resumo IA (BoardSummary) tanto no frontend quanto no backend para criar um agente de análise completo e inteligente que forneça insights precisos sobre:
- Performance de entregas e cumprimento de prazos
- Eficiência dos executores (admin, moderator, executor)
- Padrões de solicitações dos requesters
- Métricas de produtividade e tempo de trabalho
- Recomendações acionáveis baseadas em dados

---

## Resumo das Alterações

### Backend (Edge Function)
- Coletar dados completos do quadro incluindo métricas de tempo, prazos e performance
- Analisar padrões de solicitações por requester
- Calcular métricas de eficiência por executor
- Fornecer contexto rico para análise inteligente pela IA

### Frontend
- Novo design moderno e condizente com a identidade do sistema
- Seções organizadas com cards visuais de métricas antes da análise
- Renderização melhorada do resumo com seções expansíveis
- Indicadores visuais de performance (gauges, badges de status)

---

## Fase 1: Refatoração do Backend

### 1.1 Coleta de Dados Expandida

O edge function irá buscar:

```text
1. DEMANDAS COMPLETAS
   - Todas as demandas do quadro (últimos 90 dias)
   - Status atual e histórico de mudanças
   - Datas: created_at, due_date, delivered_at
   - Prioridade e serviço associado
   - Tempo em progresso (time_in_progress_seconds)

2. MÉTRICAS DE PRAZO
   - Demandas entregues no prazo vs atrasadas
   - Tempo médio de entrega
   - Demandas com prazo vencido ainda abertas

3. MEMBROS E ROLES
   - Lista de todos os membros com seus roles
   - Agrupamento: Administradores, Moderadores, Agentes, Solicitantes

4. PERFORMANCE POR EXECUTOR
   - Demandas atribuídas a cada executor
   - Taxa de conclusão
   - Tempo médio de execução
   - Demandas em atraso por executor

5. PADRÕES DE SOLICITAÇÃO
   - Frequência de solicitações por requester
   - Tipos de demandas mais solicitadas
   - Volume diário/semanal médio

6. TIME ENTRIES (Tempo de Trabalho)
   - Horas trabalhadas por executor
   - Produtividade (tempo/demanda)
```

### 1.2 Novo System Prompt para IA

O prompt será reformulado para incluir análise estruturada:

```text
SEÇÕES DO RESUMO:
1. RESUMO EXECUTIVO (2-3 frases)
2. MÉTRICAS DE PERFORMANCE
   - Taxa de entregas no prazo
   - Tempo médio de conclusão
   - Volume de demandas por período
3. ANÁLISE DA EQUIPE
   - Performance por role (Admin/Mod/Executor)
   - Destaques positivos
   - Oportunidades de melhoria
4. PADRÕES DE DEMANDA
   - Recorrência de solicitações
   - Tipos mais frequentes
   - Picos de demanda
5. ALERTAS E ATENÇÃO
   - Demandas críticas/atrasadas
   - Gargalos identificados
6. RECOMENDAÇÕES
   - Ações sugeridas
   - Otimizações possíveis
```

### 1.3 Estrutura de Dados para IA

```typescript
interface BoardAnalyticsContext {
  board: { name, description, monthly_limit };
  period: { start: Date, end: Date };
  
  demands: {
    total: number;
    byStatus: { status: string, count: number }[];
    byPriority: { priority: string, count: number }[];
    delivered: number;
    onTime: number;
    late: number;
    overdue: number; // com prazo vencido e não entregues
    avgDeliveryDays: number;
  };
  
  members: {
    admins: { name, demandCount, completedCount, avgTime }[];
    moderators: { name, demandCount, completedCount, avgTime }[];
    executors: { name, demandCount, completedCount, avgTime, activeHours }[];
    requesters: { name, requestCount, avgRequestsPerWeek }[];
  };
  
  timeTracking: {
    totalHours: number;
    byExecutor: { name, hours, demandCount }[];
    avgHoursPerDemand: number;
  };
  
  requests: {
    pending: number;
    approved: number;
    rejected: number;
    byRequester: { name, count }[];
  };
  
  trends: {
    demandsByWeek: { week: string, count: number }[];
    deliveriesByWeek: { week: string, count: number }[];
  };
}
```

---

## Fase 2: Refatoração do Frontend

### 2.1 Nova Estrutura da Página

```text
┌──────────────────────────────────────────────────────────────┐
│  PageBreadcrumb: Dashboard > Resumo IA                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ HEADER                                                   ││
│  │ [AI Icon] Análise Inteligente - "{Board Name}"          ││
│  │ Última análise: há 2 horas          [Gerar Nova Análise]││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Total    │ │ No Prazo │ │ Atrasadas│ │ Tempo    │       │
│  │ 47       │ │ 89%      │ │ 5        │ │ 3.2 dias │       │
│  │ demandas │ │ entregas │ │ pendente │ │ médio    │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ RESUMO EXECUTIVO (Card Principal)                        ││
│  │ ─────────────────────────────────────────────────────── ││
│  │ [Conteúdo da IA formatado em seções]                    ││
│  │                                                          ││
│  │ ▼ Performance da Equipe                                  ││
│  │   - Executores com melhor performance                    ││
│  │   - Áreas de atenção                                     ││
│  │                                                          ││
│  │ ▼ Padrões de Demanda                                     ││
│  │   - Frequência por solicitante                           ││
│  │   - Tipos mais comuns                                    ││
│  │                                                          ││
│  │ ▼ Recomendações                                          ││
│  │   - Ações sugeridas                                      ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Novos Componentes

```text
1. QuickStatsCards
   - 4 cards com métricas principais
   - Cores indicativas (verde/amarelo/vermelho)
   - Ícones contextuais

2. SummarySection (Collapsible)
   - Título com ícone
   - Conteúdo expansível
   - Badge de status quando relevante

3. PerformanceGauge
   - Indicador visual de % entregas no prazo
   - Cores gradientes baseadas na performance

4. TeamPerformanceList
   - Lista de executores com suas métricas
   - Avatar, nome, demandas, taxa de conclusão

5. LoadingState
   - Skeleton animado mais elaborado
   - Mensagens de progresso em etapas
```

### 2.3 Design Visual

```text
Cores e Estilo:
- Gradientes sutis nos headers
- Cards com sombras suaves
- Badges coloridos para status
- Animações de entrada suaves (sem flickering)
- Ícones Lucide consistentes

Paleta:
- Performance alta: emerald-500
- Performance média: amber-500  
- Performance baixa: red-500
- Neutro: slate/muted
- Destaque: primary (roxo/azul do sistema)
```

---

## Fase 3: Implementação Técnica

### 3.1 Arquivos a Modificar

1. **`supabase/functions/board-summary/index.ts`**
   - Expandir queries de dados
   - Adicionar cálculos de métricas
   - Novo system prompt estruturado
   - Retornar métricas junto com o stream

2. **`src/pages/BoardSummary.tsx`**
   - Novo layout com cards de métricas
   - Componente FormattedSummary refatorado
   - Estados para métricas pré-análise
   - Loading states melhorados

### 3.2 Queries do Backend

```sql
-- Demandas com métricas de prazo
SELECT 
  d.id, d.title, d.priority, d.created_at, d.due_date, d.delivered_at,
  d.time_in_progress_seconds,
  ds.name as status_name,
  s.name as service_name,
  CASE 
    WHEN d.delivered_at IS NOT NULL AND d.due_date IS NOT NULL 
    THEN d.delivered_at <= d.due_date 
    ELSE NULL 
  END as delivered_on_time,
  CASE
    WHEN d.delivered_at IS NULL AND d.due_date < NOW()
    THEN true
    ELSE false
  END as is_overdue
FROM demands d
LEFT JOIN demand_statuses ds ON d.status_id = ds.id
LEFT JOIN services s ON d.service_id = s.id
WHERE d.board_id = :boardId AND d.archived = false;

-- Membros com roles e performance
SELECT 
  bm.user_id, bm.role,
  p.full_name, p.avatar_url,
  COUNT(DISTINCT da.demand_id) as assigned_count,
  COUNT(DISTINCT CASE WHEN d.delivered_at IS NOT NULL THEN da.demand_id END) as completed_count
FROM board_members bm
JOIN profiles p ON bm.user_id = p.id
LEFT JOIN demand_assignees da ON da.user_id = bm.user_id
LEFT JOIN demands d ON d.id = da.demand_id AND d.board_id = :boardId
WHERE bm.board_id = :boardId
GROUP BY bm.user_id, bm.role, p.full_name, p.avatar_url;

-- Time entries por executor
SELECT 
  dte.user_id,
  p.full_name,
  SUM(COALESCE(dte.duration_seconds, 0)) as total_seconds,
  COUNT(DISTINCT dte.demand_id) as demand_count
FROM demand_time_entries dte
JOIN demands d ON d.id = dte.demand_id
JOIN profiles p ON p.id = dte.user_id
WHERE d.board_id = :boardId
GROUP BY dte.user_id, p.full_name;

-- Solicitações por requester
SELECT 
  dr.created_by,
  p.full_name,
  COUNT(*) as request_count,
  COUNT(*) FILTER (WHERE dr.status = 'pending') as pending,
  COUNT(*) FILTER (WHERE dr.status = 'approved') as approved,
  COUNT(*) FILTER (WHERE dr.status = 'rejected') as rejected
FROM demand_requests dr
JOIN profiles p ON dr.created_by = p.id
WHERE dr.board_id = :boardId
GROUP BY dr.created_by, p.full_name;
```

---

## Detalhes Técnicos Adicionais

### Modelo de IA
- Usar `google/gemini-3-flash-preview` (modelo padrão recomendado)
- Contexto estruturado em JSON para análise precisa
- Stream de resposta mantido para UX fluida

### Tratamento de Erros
- Mensagens de erro amigáveis em português
- Fallback para dados insuficientes
- Rate limiting handling (429/402)

### Performance
- Queries otimizadas com JOINs
- Limite de período (últimos 90 dias por padrão)
- Caching potencial do resumo gerado

---

## Arquivos a Serem Modificados (2 total)

1. `supabase/functions/board-summary/index.ts` - Refatoração completa
2. `src/pages/BoardSummary.tsx` - Novo design e componentes

---

## Resultado Esperado

- Análise completa e precisa da performance do quadro
- Design moderno e consistente com a identidade visual do sistema
- Métricas visuais antes do resumo da IA para contexto rápido
- Insights acionáveis sobre eficiência da equipe
- Identificação clara de gargalos e oportunidades de melhoria
- Padrões de solicitação identificados por requester
- Totalmente funcional e sem erros
