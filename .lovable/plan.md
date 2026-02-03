
# Plano: Período de Teste de 3 Meses e Bloqueio Após Expiração

## Visão Geral

Implementar um sistema onde todo novo usuário recebe automaticamente 3 meses de uso gratuito do SoMA. Após esse período, o acesso ao sistema será bloqueado e o usuário verá uma tela com os planos disponíveis para assinatura.

---

## Como Vai Funcionar

```text
Usuário cria conta → Inicia trial de 3 meses
                              ↓
              ┌───────────────────────────────┐
              │  Período de Trial Ativo       │
              │  (Acesso completo ao sistema) │
              └───────────────────────────────┘
                              ↓
                    Trial expira (3 meses)
                              ↓
              ┌───────────────────────────────┐
              │   Acesso Bloqueado            │
              │   Tela de Planos exibida      │
              │   (Precisa assinar para usar) │
              └───────────────────────────────┘
```

---

## Alterações Necessárias

### 1. Banco de Dados

**Adicionar coluna `trial_ends_at` na tabela `profiles`:**

A coluna armazenará quando o trial de 3 meses expira para cada usuário. Será preenchida automaticamente quando o profile é criado.

```sql
-- Adicionar coluna de data de expiração do trial
ALTER TABLE profiles 
ADD COLUMN trial_ends_at timestamptz DEFAULT (now() + interval '3 months');

-- Atualizar profiles existentes para ter trial ativo
UPDATE profiles 
SET trial_ends_at = created_at + interval '3 months'
WHERE trial_ends_at IS NULL;
```

### 2. Hook para Verificar Status do Trial

**Criar `src/hooks/useTrialStatus.ts`:**

Hook que verifica se o usuário ainda está no período de trial ou se expirou.

```typescript
// Retorna:
// - isLoading: se está carregando
// - isTrialActive: se o trial ainda está ativo
// - trialEndsAt: data de expiração
// - daysRemaining: dias restantes
// - isTrialExpired: se o trial expirou
```

### 3. Componente de Bloqueio

**Criar `src/components/TrialExpiredBlock.tsx`:**

Tela que aparece quando o trial expira, mostrando:
- Mensagem de que o período de teste acabou
- Cards dos planos disponíveis
- Botão para assinar
- Opção de sair da conta

### 4. Atualizar Layout Protegido

**Modificar `src/components/ProtectedLayout.tsx`:**

Adicionar verificação do trial antes de renderizar o conteúdo:
- Se trial expirou E equipe não tem assinatura ativa → mostrar `TrialExpiredBlock`
- Se trial ativo OU equipe tem assinatura → mostrar conteúdo normal

### 5. Banner de Aviso no Dashboard

**Criar `src/components/TrialBanner.tsx`:**

Banner que aparece no topo do dashboard mostrando:
- Quantos dias restam do trial
- Botão para conhecer os planos
- Cores que mudam conforme se aproxima do fim (verde → amarelo → vermelho)

### 6. Atualizar Traduções

**Adicionar em `src/locales/pt-BR.json`:**

```json
"trial": {
  "title": "Período de Teste",
  "daysRemaining": "{{days}} dias restantes no seu período de teste",
  "lastDay": "Último dia do seu período de teste!",
  "expired": "Período de Teste Encerrado",
  "expiredDescription": "Seu período de teste gratuito de 3 meses chegou ao fim.",
  "choosePlan": "Escolha um plano para continuar usando o SoMA",
  "viewPlans": "Ver Planos"
}
```

---

## Resumo das Mudanças

| Arquivo | Alteração |
|---------|-----------|
| Migration SQL | Adicionar coluna `trial_ends_at` em `profiles` |
| `src/hooks/useTrialStatus.ts` | Novo hook para verificar status do trial |
| `src/components/TrialExpiredBlock.tsx` | Nova tela de bloqueio com planos |
| `src/components/TrialBanner.tsx` | Banner de aviso de dias restantes |
| `src/components/ProtectedLayout.tsx` | Verificação de trial e bloqueio |
| `src/locales/pt-BR.json` | Traduções do trial |
| `src/locales/en-US.json` | Traduções do trial (inglês) |
| `src/locales/es.json` | Traduções do trial (espanhol) |

---

## Detalhes Técnicos

### Lógica de Verificação do Trial

```typescript
// Usuário pode usar o sistema se:
// 1. Trial ainda não expirou (trial_ends_at > now), OU
// 2. A equipe selecionada tem uma assinatura ativa

const canUseSystem = isTrialActive || hasActiveSubscription;
```

### Fluxo de Bloqueio

1. Usuário faz login
2. Sistema verifica `trial_ends_at` do profile
3. Se expirou, verifica se a equipe tem assinatura
4. Se não tem assinatura, exibe tela de bloqueio
5. Se assinar, libera acesso imediatamente

### Trigger para Novos Usuários

A coluna `trial_ends_at` tem um default de `now() + 3 months`, então todo novo usuário automaticamente recebe o trial de 3 meses ao criar a conta.
