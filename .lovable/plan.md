

# Admin Dashboard Completo - Plano de Implementação

## Objetivo
Transformar o dashboard do painel admin de 4 cards simples em um painel completo e acionável, com métricas de crescimento, distribuição por planos, equipes recentes, trials expirando, e visão geral que ajude o admin a tomar decisões para aumentar a base de usuários.

## Layout do Dashboard

```text
┌─────────────────────────────────────────────────────────┐
│  Header: "Dashboard" + Subtítulo + Última atualização   │
├────────┬────────┬────────┬────────┬────────┬────────────┤
│ Equipes│Usuários│Assin.  │ Trial  │Cupons  │ Demandas   │
│   5    │  42    │   1    │   3    │   1    │   248      │
│ +20%▲  │ +15%▲  │        │ ⚠ exp  │        │            │
├────────┴────────┴────────┴────────┴────────┴────────────┤
│                                                         │
│  ┌──────────────────────┐  ┌──────────────────────────┐ │
│  │ Crescimento Mensal   │  │ Distribuição por Plano   │ │
│  │ (AreaChart usuários  │  │ (PieChart: Free/Pro/Ent) │ │
│  │  e equipes por mês)  │  │                          │ │
│  └──────────────────────┘  └──────────────────────────┘ │
│                                                         │
│  ┌──────────────────────┐  ┌──────────────────────────┐ │
│  │ Equipes Recentes     │  │ Trials Expirando         │ │
│  │ (últimas 5 equipes   │  │ (equipes com trial       │ │
│  │  criadas com status) │  │  acabando em 7 dias)     │ │
│  └──────────────────────┘  └──────────────────────────┘ │
│                                                         │
│  ┌──────────────────────────────────────────────────────┐│
│  │ Usuários Recentes (últimos 5 cadastros)             ││
│  └──────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

## Implementação

### 1. Expandir `useAdminStats` hook
Adicionar queries para buscar dados mais ricos:
- **Total de demandas** no sistema inteiro
- **Trials ativos** (subscriptions com status `trialing`)
- **Novos usuários nos últimos 30 dias** (para calcular crescimento)
- **Novas equipes nos últimos 30 dias**

### 2. Criar hook `useAdminDashboardData`
Novo hook dedicado para dados do dashboard completo:
- **Equipes recentes**: últimas 5 equipes com subscription info
- **Trials expirando**: equipes com `trial_ends_at` nos próximos 7 dias
- **Usuários recentes**: últimos 5 perfis criados
- **Distribuição por plano**: contagem de subscriptions agrupada por plano
- **Crescimento mensal**: perfis e equipes criados por mês (últimos 6 meses)

### 3. Redesenhar `AdminDashboard.tsx`
Compor o dashboard com seções:

**a) Stat Cards (6 cards em grid)**
- Total de Equipes, Total de Usuários, Assinaturas Ativas, Trials Ativos, Cupons Ativos, Total de Demandas
- Cada card com ícone, valor grande e indicador de variação mensal (seta verde/vermelha)

**b) Gráfico de Crescimento (AreaChart - Recharts)**
- Linha de usuários e equipes novos por mês nos últimos 6 meses
- Usa `ResponsiveContainer`, `AreaChart`, `Area`, `XAxis`, `YAxis`, `Tooltip`

**c) Distribuição por Plano (PieChart - Recharts)**
- Donut chart mostrando quantas equipes estão em cada plano
- Reutiliza padrão visual do `DeliveryStatusChart` existente

**d) Equipes Recentes (tabela compacta)**
- Nome, data de criação, plano, status da assinatura
- Link para `/admin/teams`

**e) Trials Expirando (lista de alertas)**
- Equipes cujo trial acaba em 7 dias, com contagem regressiva
- Destaque visual em vermelho/amarelo para urgência
- Ação rápida de "Ver equipe"

**f) Usuários Recentes (lista compacta)**
- Avatar, nome, email, data de cadastro
- Link para `/admin/users`

### 4. Arquivos Modificados
- `src/hooks/admin/useAdminStats.ts` — expandir com mais contagens
- `src/hooks/admin/useAdminDashboardData.ts` — **novo** hook para dados detalhados
- `src/pages/admin/AdminDashboard.tsx` — redesenhar completamente

### Detalhes Técnicos
- Todas as queries usam Supabase client-side com as tabelas existentes (`teams`, `profiles`, `subscriptions`, `demands`, `plans`, `trial_coupons`)
- Gráficos usam Recharts (já instalado no projeto)
- Crescimento mensal calculado client-side agrupando `created_at` por mês
- Nenhuma migração de banco necessária — tudo usa dados existentes

