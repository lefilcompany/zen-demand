## Objetivo

Remover a obrigatoriedade de escolher um plano e pagar no momento do cadastro. Ao criar conta + equipe, o usuário recebe automaticamente **3 dias de teste gratuito** com acesso completo. Após esses 3 dias, ao logar, a plataforma fica bloqueada por um modal/tela mostrando os planos disponíveis — clicar em um plano leva ao checkout do Stripe (mesmo fluxo já existente hoje).

## Fluxo novo (resumo)

```text
Hoje:   Equipe → Escolher Plano → Confirmar → Stripe Checkout → App
Novo:   Equipe → (cria automaticamente trial 3 dias) → App
            ↓ após 3 dias
        Login → Tela bloqueada com planos → Stripe Checkout → App
```

## Mudanças

### 1. Backend — criar trial automaticamente

Migração que ajusta a função/trigger de criação de equipe (ou adiciona uma nova trigger em `teams`) para que, ao criar uma equipe, seja inserido em `subscriptions`:

- `team_id` = nova equipe
- `plan_id` = plano "trial" (o primeiro plano pago, ex.: `profissional`, definido por config — sugiro o plano mais popular para o usuário sentir o produto completo durante o trial)
- `status = 'trialing'`
- `current_period_start = now()`
- `trial_ends_at = now() + interval '3 days'`
- `current_period_end = trial_ends_at`

Só cria se ainda não existir subscription para a equipe (evita duplicar quando o usuário tem cupom de trial estendido).

### 2. Frontend — `src/pages/GetStarted.tsx`

Simplificar para **um único passo**: criar equipe + (autenticar se necessário). Remover `PlanSelectionStep` e `ConfirmStep` do fluxo principal:

- `step` vira fixo em `1` (TeamStep).
- Após `createTeam.mutateAsync(...)`, o trial é criado pela trigger no banco; navegamos direto para `/`.
- Manter o fluxo de cupom já existente intacto.
- Remover uso de `useCreateCheckout` no get-started (não é mais necessário ali).
- `StepIndicator` removido ou ajustado para refletir o passo único.

### 3. Frontend — bloqueio pós-trial

O bloqueio **já existe** em `ProtectedLayout.tsx` via `TrialExpiredBlock` quando `subscription.status === 'trialing'` e `isTrialExpired`. Aproveitamos isso. Ajustes mínimos:

- Em `src/components/PlanCard.tsx`/`TrialExpiredBlock.tsx`: garantir que ao clicar em um plano, dispare `useCreateCheckout` com o `teamId` atual e redirecione para a URL do Stripe (hoje o `onSelect` não está conectado em `TrialExpiredBlock`).
- Texto do bloco atualizado para "Seu teste gratuito de 3 dias terminou".

### 4. Limpeza

- `Pricing.tsx` e demais entradas de seleção de plano continuam funcionando (usuários ativos podem trocar de plano), mas o link "Comece agora" passa a levar apenas ao cadastro de equipe, sem `?plan=...`.
- Componentes `PlanSelectionStep` e `ConfirmStep` ficam sem uso no fluxo de onboarding; podemos removê-los ou deixá-los para reuso futuro (sugiro deixar, sem custo).

## Pontos técnicos

- A trigger de criação de trial é `SECURITY DEFINER` para conseguir inserir em `subscriptions` independentemente da RLS do usuário.
- O plano usado para o trial é configurável; default sugerido: plano `profissional` (slug). Se ele não existir, faz fallback para o primeiro plano ativo por `sort_order`.
- `useTrialStatus` e a checagem em `ProtectedLayout` já tratam corretamente `status='trialing' + trial_ends_at no passado` → mostra `TrialExpiredBlock`. Nenhuma mudança de lógica de gate.

## Confirmação rápida

Antes de implementar, só confirma:

1. **Plano usado durante o trial**: liberar **todas as features** (equivalente ao plano mais alto, ex.: `business`) ou apenas o `profissional`? Recomendo `business` para o usuário experimentar tudo nos 3 dias.
2. **Tela de bloqueio**: manter a tela cheia atual (`TrialExpiredBlock`) ou prefere modal sobre o app? Recomendo manter tela cheia — mais claro e impede uso acidental.