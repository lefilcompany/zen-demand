

# Plano: Implementar Seleção de Planos no Fluxo de Criação de Equipe

## Objetivo
Integrar a seleção de planos de assinatura no fluxo de criação de equipe, permitindo que o usuário escolha seu plano antes/durante a criação da equipe e seja redirecionado para o Stripe Checkout.

## Visão Geral do Fluxo

```text
Criar Equipe → Selecionar Plano → Stripe Checkout → Sucesso → Dashboard
     │                                     │
     └── (dados da equipe guardados) ──────┘
```

---

## Abordagem

Vamos implementar um **fluxo em etapas** na página de criação de equipe:

1. **Etapa 1**: Preencher dados da equipe (nome, descrição, código de acesso)
2. **Etapa 2**: Selecionar plano de assinatura
3. **Etapa 3**: Checkout no Stripe (externo)
4. **Retorno**: Página de sucesso com equipe criada e plano ativo

---

## Arquivos a Modificar/Criar

### 1. `src/pages/CreateTeam.tsx`
**Modificações:**
- Adicionar estado para controlar etapas (`step: 1 | 2`)
- Na etapa 1: formulário atual de criação de equipe
- Na etapa 2: exibir cards de planos usando `PlanCard` reutilizado
- Ao selecionar um plano, criar a equipe E iniciar checkout
- Guardar dados do formulário entre etapas
- Adicionar navegação entre etapas (voltar/avançar)

### 2. `src/hooks/useCheckout.ts`
**Modificações:**
- Criar uma nova mutation `useCreateTeamWithCheckout` que:
  1. Cria a equipe
  2. Inicia o checkout do Stripe com o `teamId` recém-criado
  3. Retorna a URL do checkout

### 3. `supabase/functions/create-checkout/index.ts`
**Modificações:**
- Ajustar para aceitar times recém-criados (o criador ainda não é "admin" formalmente no momento da verificação RPC - verificar se funciona)
- Adicionar fallback para verificar se o usuário é o criador da equipe

### 4. `src/locales/pt-BR.json` (e outros idiomas)
**Novas traduções:**
- `createTeam.step1`: "Dados da Equipe"
- `createTeam.step2`: "Escolha seu Plano"
- `createTeam.selectPlanSubtitle`: "Selecione o plano ideal para sua equipe"
- `createTeam.continueToPlans`: "Continuar para Planos"
- `createTeam.creatingTeam`: "Criando equipe..."

---

## Detalhes Técnicos

### Componente de Steps (Etapas)
Criar um indicador visual de progresso com 2 etapas:
- Círculo 1: "Dados" (ativo/completo)
- Círculo 2: "Plano" (ativo/pendente)

### Estado do Formulário
```typescript
const [step, setStep] = useState<1 | 2>(1);
const [formData, setFormData] = useState({
  name: "",
  description: "",
  accessCode: generateAccessCode(),
});
```

### Fluxo de Criação
1. Usuário preenche dados → Clica "Continuar"
2. Exibe seleção de planos (reutiliza `PlanCard`)
3. Ao clicar em um plano:
   - Cria a equipe com `useCreateTeam`
   - Chama `create-checkout` com o novo `teamId`
   - Redireciona para Stripe
4. Após pagamento (Stripe webhook atualiza subscription)
5. Usuário retorna para `/subscription/success`

### Plano Gratuito/Starter
- O plano Starter (R$ 59/mês) é o mais básico
- Opção: Permitir "Começar Grátis" com trial de 14 dias
- Ou simplesmente todos os planos são pagos

---

## Ajustes na Edge Function

A função `create-checkout` verifica se o usuário é admin da equipe:
```typescript
const { data: isAdmin } = await supabase.rpc("is_team_admin", {
  _user_id: userId,
  _team_id: teamId,
});
```

Como a equipe acabou de ser criada no mesmo fluxo, isso deve funcionar. Porém, para garantir:
- Adicionar verificação alternativa se o `created_by` da equipe é o usuário atual

---

## Considerações de UX

1. **Indicador de Progresso**: Mostrar em qual etapa o usuário está
2. **Voltar**: Permitir voltar da etapa 2 para etapa 1
3. **Loading States**: Mostrar loading durante criação + checkout
4. **Erro Handling**: Se o checkout falhar, a equipe já foi criada - informar usuário
5. **Responsividade**: Layout adaptável para mobile (cards em coluna)

---

## Resumo das Alterações

| Arquivo | Ação |
|---------|------|
| `src/pages/CreateTeam.tsx` | Adicionar fluxo multi-step com seleção de planos |
| `src/hooks/useCheckout.ts` | Adicionar hook para criar equipe + checkout |
| `src/locales/pt-BR.json` | Adicionar novas traduções |
| `src/locales/en-US.json` | Adicionar novas traduções |
| `supabase/functions/create-checkout/index.ts` | Verificação alternativa de criador |

