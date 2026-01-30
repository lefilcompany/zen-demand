

# Plano de Implementação: Sistema de Planos e Assinaturas SoMA

## Resumo Executivo

Este plano implementará um sistema completo de monetização para o SoMA com 4 planos de assinatura:
- **Starter** (R$ 59/mês): 1 equipe, 1 quadro, 3 membros, 30 demandas/mês
- **Profissional** (R$ 97/mês): 1 equipe, 5 quadros, 10 membros, 200 demandas/mês
- **Business** (R$ 247/mês): 1 equipe, 15 quadros, 30 membros, 500 demandas/mês
- **Enterprise** (R$ 497+/mês): Recursos ilimitados

---

## Fase 1: Estrutura do Banco de Dados

### 1.1 Criar tabela `plans` (Planos disponíveis)
```sql
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  billing_period TEXT NOT NULL DEFAULT 'monthly',
  max_teams INTEGER DEFAULT 1,
  max_boards INTEGER DEFAULT 1,
  max_members INTEGER DEFAULT 3,
  max_demands_per_month INTEGER DEFAULT 30,
  max_services INTEGER DEFAULT 5,
  max_notes INTEGER DEFAULT 0,
  features JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.2 Criar tabela `subscriptions` (Assinaturas das equipes)
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  cancel_at_period_end BOOLEAN DEFAULT false,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id)
);
```

### 1.3 Criar tabela `usage_records` (Controle de uso mensal)
```sql
CREATE TABLE usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  demands_created INTEGER DEFAULT 0,
  members_count INTEGER DEFAULT 0,
  boards_count INTEGER DEFAULT 0,
  notes_count INTEGER DEFAULT 0,
  storage_bytes BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.4 Inserir planos iniciais
```sql
INSERT INTO plans (name, slug, description, price_cents, max_boards, max_members, max_demands_per_month, max_services, max_notes, features, sort_order) VALUES
('Starter', 'starter', 'Ideal para freelancers e pequenos projetos', 5900, 1, 3, 30, 5, 0, '{"time_tracking": "basic", "notifications": "in_app", "support": "docs"}', 1),
('Profissional', 'profissional', 'Para agências pequenas e equipes de marketing', 9700, 5, 10, 200, 20, 10, '{"time_tracking": "full", "notifications": "push_email", "reports": "pdf_csv", "support": "email", "share_external": true}', 2),
('Business', 'business', 'Para agências médias e escritórios', 24700, 15, 30, 500, -1, -1, '{"time_tracking": "full", "notifications": "push_email", "reports": "advanced", "ai_summary": true, "contracts": true, "support": "priority"}', 3),
('Enterprise', 'enterprise', 'Solução personalizada para grandes empresas', 49700, -1, -1, -1, -1, -1, '{"time_tracking": "full", "notifications": "all", "reports": "whitelabel", "ai_summary": true, "contracts": true, "api": true, "support": "dedicated", "sla": true}', 4);
```

### 1.5 Políticas RLS
- Plans: Leitura pública para todos (usuários autenticados)
- Subscriptions: Apenas membros da equipe podem visualizar; apenas admins podem modificar
- Usage Records: Apenas membros da equipe podem visualizar

---

## Fase 2: Hooks e Lógica de Negócio

### 2.1 Criar `src/hooks/usePlans.ts`
- `usePlans()`: Lista todos os planos ativos
- `usePlanDetails(planId)`: Detalhes de um plano específico

### 2.2 Criar `src/hooks/useSubscription.ts`
- `useTeamSubscription(teamId)`: Busca assinatura atual da equipe
- `useSubscriptionLimits(teamId)`: Retorna limites baseados no plano
- `useCanCreateResource(teamId, resourceType)`: Verifica se pode criar demanda/board/membro
- `useCreateSubscription()`: Mutation para criar assinatura
- `useUpdateSubscription()`: Mutation para upgrade/downgrade
- `useCancelSubscription()`: Mutation para cancelar

### 2.3 Criar `src/hooks/useUsageRecords.ts`
- `useCurrentUsage(teamId)`: Uso atual do período
- `useUsageHistory(teamId)`: Histórico de uso

### 2.4 Atualizar hooks existentes
- `useBoardScope.ts`: Integrar com limites do plano
- `useTeamScope.ts`: Adicionar verificação de limites
- `useDemands.ts`: Verificar limite antes de criar

---

## Fase 3: Componentes de UI

### 3.1 Criar página de Pricing `src/pages/Pricing.tsx`
- Cards comparativos dos 4 planos
- Destaque visual no plano recomendado (Profissional)
- Toggle mensal/anual com desconto
- Botões de CTA para cada plano
- FAQ sobre planos

### 3.2 Criar componente `src/components/PlanCard.tsx`
- Card individual de plano com:
  - Nome e preço
  - Lista de recursos incluídos
  - Badge "Popular" para destaque
  - Botão de ação contextual

### 3.3 Criar componente `src/components/SubscriptionBadge.tsx`
- Badge mostrando plano atual
- Indicador de trial/expiração

### 3.4 Criar componente `src/components/UsageMeter.tsx`
- Barra de progresso de uso
- Alertas visuais ao aproximar do limite

### 3.5 Criar componente `src/components/UpgradePrompt.tsx`
- Modal/banner de upgrade quando limite atingido
- Comparativo rápido com próximo plano

### 3.6 Atualizar `src/components/ScopeOverviewCard.tsx`
- Integrar com dados do plano
- Mostrar nome do plano atual
- Link para upgrade

---

## Fase 4: Integração com Stripe

### 4.1 Habilitar Stripe no projeto
- Usar ferramenta de integração Stripe do Lovable
- Configurar produtos e preços no Stripe Dashboard

### 4.2 Criar Edge Function `supabase/functions/create-checkout/index.ts`
- Recebe `planId` e `teamId`
- Cria sessão de checkout no Stripe
- Retorna URL de pagamento

### 4.3 Criar Edge Function `supabase/functions/stripe-webhook/index.ts`
- Processa eventos do Stripe:
  - `checkout.session.completed`: Ativa assinatura
  - `invoice.payment_succeeded`: Renova assinatura
  - `customer.subscription.deleted`: Cancela assinatura
  - `invoice.payment_failed`: Marca como inadimplente

### 4.4 Criar página de sucesso `src/pages/SubscriptionSuccess.tsx`
- Confirmação visual de assinatura
- Resumo do plano ativado
- Próximos passos

---

## Fase 5: Gatilhos e Automações

### 5.1 Trigger para atualizar usage_records
```sql
CREATE OR REPLACE FUNCTION update_usage_on_demand_create()
RETURNS TRIGGER AS $$
BEGIN
  -- Incrementa contador de demandas no período atual
  INSERT INTO usage_records (team_id, period_start, period_end, demands_created)
  VALUES (NEW.team_id, date_trunc('month', now()), date_trunc('month', now()) + interval '1 month', 1)
  ON CONFLICT (team_id, period_start)
  DO UPDATE SET demands_created = usage_records.demands_created + 1, updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 5.2 Função para verificar limites
```sql
CREATE OR REPLACE FUNCTION check_subscription_limit(
  _team_id UUID,
  _resource_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  _plan_limit INTEGER;
  _current_usage INTEGER;
BEGIN
  -- Busca limite do plano e uso atual
  -- Retorna TRUE se dentro do limite
END;
$$ LANGUAGE plpgsql;
```

---

## Fase 6: Páginas de Gerenciamento

### 6.1 Criar `src/pages/Billing.tsx`
- Histórico de faturas
- Método de pagamento atual
- Próxima cobrança
- Opções de cancelamento

### 6.2 Atualizar `src/pages/TeamConfig.tsx`
- Adicionar seção de Plano Atual
- Botão de gerenciar assinatura
- Indicadores de uso vs limite

### 6.3 Atualizar menu lateral `src/components/AppSidebar.tsx`
- Adicionar link para Planos/Billing
- Badge de upgrade para planos gratuitos

---

## Fase 7: Traduções

### 7.1 Adicionar chaves em `src/locales/pt-BR.json`
```json
{
  "pricing": {
    "title": "Planos e Preços",
    "subtitle": "Escolha o plano ideal para sua equipe",
    "monthly": "Mensal",
    "yearly": "Anual",
    "yearlyDiscount": "Economize 20%",
    "popular": "Mais Popular",
    "currentPlan": "Plano Atual",
    "upgrade": "Fazer Upgrade",
    "downgrade": "Fazer Downgrade",
    "contactSales": "Falar com Vendas",
    "features": {
      "boards": "{count} quadros",
      "members": "{count} membros",
      "demands": "{count} demandas/mês",
      "unlimited": "Ilimitado"
    }
  },
  "subscription": {
    "active": "Ativa",
    "trial": "Período de Teste",
    "canceled": "Cancelada",
    "pastDue": "Pagamento Pendente",
    "limitReached": "Limite atingido",
    "upgradeRequired": "Upgrade necessário"
  }
}
```

### 7.2 Adicionar traduções em EN e ES

---

## Detalhes Técnicos

### Arquivos a criar:
1. `src/hooks/usePlans.ts`
2. `src/hooks/useSubscription.ts`
3. `src/hooks/useUsageRecords.ts`
4. `src/pages/Pricing.tsx`
5. `src/pages/Billing.tsx`
6. `src/pages/SubscriptionSuccess.tsx`
7. `src/components/PlanCard.tsx`
8. `src/components/SubscriptionBadge.tsx`
9. `src/components/UsageMeter.tsx`
10. `src/components/UpgradePrompt.tsx`
11. `supabase/functions/create-checkout/index.ts`
12. `supabase/functions/stripe-webhook/index.ts`

### Arquivos a modificar:
1. `src/App.tsx` - Adicionar novas rotas
2. `src/components/AppSidebar.tsx` - Link para planos
3. `src/components/ScopeOverviewCard.tsx` - Integrar plano
4. `src/pages/TeamConfig.tsx` - Seção de assinatura
5. `src/hooks/useBoardScope.ts` - Verificar limites
6. `src/locales/*.json` - Traduções

### Dependências:
- Stripe SDK (via integração Lovable)

### Estimativa:
- Banco de dados: ~30 minutos
- Hooks e lógica: ~1 hora
- Componentes UI: ~1.5 horas
- Integração Stripe: ~1 hora
- Testes e ajustes: ~30 minutos

**Total estimado: ~4.5 horas**

