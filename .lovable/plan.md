
# Plano: Refatoração Completa da Tela de Gerenciamento de Tempo

## Resumo Executivo
Redesenhar completamente a tela de Gerenciamento de Tempo para fornecer uma experiência de gestão completa, com foco em visibilidade em tempo real das atividades, rankings competitivos, gráficos de desempenho detalhados e interface 100% responsiva.

---

## O que será entregue

### 1. Dashboard Principal Renovado
- Cards de estatísticas com visual moderno e animações
- Indicadores de atividade ao vivo (timers ativos) em destaque
- Tempo total do quadro com atualização em tempo real
- Contadores de membros, demandas e médias

### 2. Seção "Trabalhando Agora" (Destaque)
- Cards grandes mostrando quem está trabalhando neste momento
- Nome do usuário, demanda atual, e timer ao vivo incrementando a cada segundo
- Avatar do usuário com indicador visual pulsante
- Link direto para a demanda sendo trabalhada

### 3. Gráficos de Desempenho Detalhados
- **Distribuição de Tempo por Usuário**: Gráfico de pizza/donut mostrando proporção
- **Top Demandas por Tempo**: Gráfico de barras horizontal
- **Evolução Diária/Semanal**: Novo gráfico de linha mostrando tendência de produtividade
- **Tempo por Status**: Novo gráfico mostrando onde o tempo está sendo gasto

### 4. Ranking de Membros Aprimorado
- Ranking visual com medalhas (ouro, prata, bronze)
- Indicação de quem está trabalhando agora
- Barras de progresso mostrando proporção relativa
- Quantidade de demandas e tempo total por membro
- Filtragem por role (Admin, Coordenador, Agente)

### 5. Detalhamento por Usuário
- Expandir para ver todas as demandas trabalhadas
- Tempo dedicado a cada demanda
- Status e prioridade de cada demanda
- Timer ao vivo se estiver trabalhando

### 6. Detalhamento por Demanda
- Expandir para ver todos os usuários que trabalharam
- Tempo de cada usuário na demanda
- Indicadores visuais de timer ativo

### 7. Escopo por Quadro
- Ao trocar de quadro, todos os dados atualizam automaticamente
- Membros, tempos e estatísticas são filtrados pelo quadro selecionado
- Título do quadro atual exibido de forma clara

### 8. Interface Responsiva
- **Mobile**: Layout vertical, cards empilhados, gráficos adaptados
- **Tablet**: Grid de 2 colunas, filtros colapsáveis
- **Desktop**: Grid completo, visualização lado a lado

---

## Arquitetura Técnica

### Backend (já existente)
A tabela `demand_time_entries` já possui a estrutura necessária:
- `id`, `demand_id`, `user_id`, `started_at`, `ended_at`, `duration_seconds`

Timer ativo = entrada onde `ended_at IS NULL`

### Hooks a serem criados/modificados:

1. **`useBoardTimeStats`** (novo)
   - Estatísticas agregadas do quadro: tempo total, médias, tendências
   - Dados para gráficos de evolução temporal

2. **Modificar `useBoardTimeEntries`**
   - Adicionar dados de role do usuário (admin/moderator/executor)
   - Melhorar agregação para gráficos

3. **Modificar `useBoardMembersWithTime`**
   - Incluir role do membro para filtragem
   - Adicionar contagem de demandas entregues vs em andamento

### Componentes a criar:

```text
src/pages/TimeManagement.tsx (refatorar completamente)
  |
  +-- StatsOverviewCards.tsx (cards de estatísticas)
  +-- ActiveWorkSection.tsx (quem está trabalhando agora)
  +-- PerformanceCharts.tsx (todos os gráficos)
  +-- MemberRanking.tsx (ranking com medalhas)
  +-- TimeDetailTabs.tsx (tabs por usuário/demanda)
      +-- UserTimeDetail.tsx (detalhes por usuário)
      +-- DemandTimeDetail.tsx (detalhes por demanda)
```

### Fluxo de Dados

```text
BoardContext (quadro selecionado)
       |
       v
useBoardTimeEntries -> Entries com realtime
       |
       v
useBoardMembersWithTime -> Membros + tempo + role
       |
       v
Componentes visuais com cálculos locais (useMemo)
```

---

## Layout da Interface

### Mobile (< 768px)
```text
+--------------------------------+
| Header + Quadro Atual          |
+--------------------------------+
| Card: Tempo Total              |
+--------------------------------+
| Card: Membros Ativos           |
+--------------------------------+
| "Trabalhando Agora" (scroll h) |
+--------------------------------+
| Filtros (colapsível)           |
+--------------------------------+
| Tabs: Usuários | Demandas      |
+--------------------------------+
| Lista expandível               |
+--------------------------------+
```

### Desktop (>= 1024px)
```text
+------------------+------------------+
| Header + Quadro  |   Botão Export   |
+------------------+------------------+
| Stats Card 1 | Stats Card 2 | ... 4 |
+------------------------------------------+
| Seção "Trabalhando Agora" (3 colunas)    |
+------------------------------------------+
| Gráfico Pizza    | Gráfico Barras        |
+------------------------------------------+
| Ranking de Membros (com medalhas)        |
+------------------------------------------+
| Filtros                                  |
+------------------------------------------+
| Tabs: Por Usuário | Por Demanda          |
+------------------------------------------+
| Lista detalhada expansível               |
+------------------------------------------+
```

---

## Implementação em Etapas

### Etapa 1: Preparação dos Hooks
- Modificar `useBoardTimeEntries` para incluir role
- Criar aggregações para gráficos de tendência
- Garantir realtime funcionando corretamente

### Etapa 2: Refatorar TimeManagement.tsx
- Dividir em componentes menores
- Implementar novo layout responsivo
- Melhorar organização visual

### Etapa 3: Seção "Trabalhando Agora"
- Destacar timers ativos
- Timer incrementando em tempo real
- Cards visuais com animações

### Etapa 4: Gráficos de Desempenho
- Distribuição por usuário (Pie/Donut)
- Top demandas (Bar horizontal)
- Manter os gráficos existentes funcionando

### Etapa 5: Ranking de Membros
- Visual com medalhas (1º, 2º, 3º)
- Barras de progresso relativas
- Indicadores de timer ativo
- Incluir TODOS os membros do quadro

### Etapa 6: Detalhamento (Tabs)
- Tab por Usuário: expandir para ver demandas
- Tab por Demanda: expandir para ver usuários
- Timers ao vivo nas expansões

### Etapa 7: Responsividade
- Testar em mobile, tablet e desktop
- Ajustar breakpoints
- Garantir usabilidade em toque

---

## Arquivos que serão modificados

| Arquivo | Ação |
|---------|------|
| `src/pages/TimeManagement.tsx` | Refatoração completa |
| `src/hooks/useBoardTimeEntries.ts` | Adicionar role e melhorias |
| `src/components/LiveUserTimeRow.tsx` | Melhorias visuais |
| `src/components/ActiveDemandCard.tsx` | Melhorias responsivas |
| `src/components/UserDetailTimeRow.tsx` | Ajustes |
| `src/components/DemandDetailTimeRow.tsx` | Ajustes |

---

## Resultado Esperado

Uma tela de gerenciamento de tempo profissional que permite:
- Ver instantaneamente quem está trabalhando e em qual demanda
- Acompanhar tempo em tempo real com incremento a cada segundo
- Analisar distribuição de tempo por gráficos claros
- Identificar top performers pelo ranking
- Filtrar por período, usuário e status de entrega
- Detalhar tempo por usuário ou por demanda
- Usar confortavelmente em qualquer dispositivo
- Dados sempre atualizados automaticamente ao trocar de quadro
