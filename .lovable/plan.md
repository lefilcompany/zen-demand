

## Vincular Trial Totalmente à Equipe

### Problema Atual
O hook `useTrialStatus` lê `profiles.trial_ends_at` (nível do usuário, default 10 dias). Quando um cupom é resgatado, ele atualiza corretamente `subscriptions.trial_ends_at` (nível da equipe), mas o UI continua lendo do profile, mostrando dias errados.

### Plano de Correção

**1. Refatorar `src/hooks/useTrialStatus.ts`**
- Remover a consulta a `profiles.trial_ends_at`
- Usar `useTeamSubscription` (que já existe) para ler `subscriptions.trial_ends_at` da equipe selecionada via `useSelectedTeam`
- Se a subscription tiver status `trialing` e `trial_ends_at`, usar essa data
- Se não houver subscription, considerar trial expirado (sem plano = sem acesso)
- Calcular `totalTrialDays` a partir de `current_period_start` e `trial_ends_at` para a barra de progresso

**2. Atualizar `src/components/SidebarSubscriptionCard.tsx`**
- Ajustar a barra de progresso para usar o `totalTrialDays` retornado pelo hook em vez do valor hardcoded `/90`
- O hook agora também retornará `totalTrialDays` para cálculo correto da porcentagem

**3. Atualizar `src/components/ProtectedLayout.tsx`**
- A lógica `canUseSystem` já verifica `subscription?.status === "active"`, mas precisa incluir `trialing` também
- Ajustar para: `canUseSystem = subscription?.status === "active" || subscription?.status === "trialing" com trial não expirado`

**4. Migration: Atualizar RPC `redeem_trial_coupon`**
- Adicionar `UPDATE profiles SET trial_ends_at = ...` como fallback/sync para manter compatibilidade, garantindo que o profile do usuário que resgatou também fique sincronizado

### Resultado
- Trial é 100% baseado na subscription da equipe
- Cupom de 30 dias mostra corretamente 30 dias
- Barra de progresso reflete a duração real do trial
- Qualquer membro da equipe vê o trial correto da sua equipe

