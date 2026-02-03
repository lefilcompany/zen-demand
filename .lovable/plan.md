

# Plano: Página Externa de Checkout Público

## Objetivo
Criar uma página pública (`/get-started`) onde visitantes podem escolher um plano, fazer login/cadastro, e serem redirecionados ao Stripe Checkout. Após o pagamento, retornam ao sistema já logados com a equipe e plano ativos.

## Visão Geral do Fluxo

```text
URL Externa → /get-started?plan=profissional (opcional)
       │
       ▼
┌─────────────────────────────────────────────┐
│  PÁGINA GET STARTED (pública)               │
│  ┌───────────────────────────────────────┐  │
│  │ Etapa 1: Selecionar Plano             │  │
│  │ (cards de planos reutilizados)        │  │
│  └───────────────────────────────────────┘  │
│                    ▼                        │
│  ┌───────────────────────────────────────┐  │
│  │ Etapa 2: Login ou Cadastro            │  │
│  │ (formulário inline + opção cadastro)  │  │
│  └───────────────────────────────────────┘  │
│                    ▼                        │
│  ┌───────────────────────────────────────┐  │
│  │ Etapa 3: Dados da Equipe              │  │
│  │ (nome da equipe, descrição)           │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
                     │
                     ▼
            Cria equipe + Checkout
                     │
                     ▼
              Stripe Checkout
                     │
                     ▼
        /subscription/success (logado)
                     │
                     ▼
               Dashboard (/)
```

---

## Arquivos a Criar/Modificar

### 1. CRIAR: `src/pages/GetStarted.tsx`
Nova página pública com fluxo multi-etapas:

**Etapa 1 - Seleção de Plano:**
- Exibir todos os planos usando `PlanCard`
- Permitir selecionar um plano
- Suporte a query param `?plan=slug` para pré-selecionar

**Etapa 2 - Autenticação:**
- Tabs para Login/Cadastro (similar ao Auth.tsx)
- Se já logado, pular esta etapa
- Após login/cadastro bem-sucedido, avançar automaticamente

**Etapa 3 - Dados da Equipe:**
- Nome da equipe (obrigatório)
- Descrição (opcional)
- Código de acesso auto-gerado
- Botão "Finalizar e Pagar"

**Fluxo de Conclusão:**
1. Criar equipe com `useCreateTeam`
2. Chamar `create-checkout` com teamId e planSlug
3. Redirecionar para Stripe
4. Após pagamento → `/subscription/success`

### 2. MODIFICAR: `src/App.tsx`
- Adicionar rota pública `/get-started` (sem RequireAuth)

### 3. MODIFICAR: `supabase/functions/create-checkout/index.ts`
- Ajustar success_url para incluir parâmetros de retorno
- Garantir que funciona para usuários recém-criados

### 4. MODIFICAR: `src/pages/SubscriptionSuccess.tsx`
- Detectar se usuário não tem equipe selecionada
- Buscar equipe do metadata do checkout
- Selecionar equipe automaticamente
- Redirecionar para dashboard

### 5. ADICIONAR TRADUÇÕES: Locales (pt-BR, en-US, es)
```json
{
  "getStarted": {
    "title": "Comece Agora",
    "subtitle": "Escolha seu plano e crie sua equipe",
    "step1": "Escolha seu Plano",
    "step2": "Faça Login ou Cadastre-se",
    "step3": "Configure sua Equipe",
    "alreadyHaveAccount": "Já tem uma conta?",
    "createAccount": "Criar conta",
    "loginToContinue": "Faça login para continuar",
    "teamInfo": "Informações da Equipe",
    "finishAndPay": "Finalizar e Pagar",
    "processingCheckout": "Processando pagamento..."
  }
}
```

---

## Detalhes Técnicos

### Componente GetStarted - Estrutura de Estado
```typescript
// Estados principais
const [step, setStep] = useState<1 | 2 | 3>(1);
const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
const [teamData, setTeamData] = useState({
  name: "",
  description: "",
  accessCode: generateAccessCode(),
});

// Detecta usuário logado
const { user, loading: authLoading } = useAuth();

// Se usuário já está logado, pula etapa 2
useEffect(() => {
  if (user && step === 2) {
    setStep(3);
  }
}, [user, step]);
```

### Pré-seleção via Query Param
```typescript
const [searchParams] = useSearchParams();
const preSelectedPlanSlug = searchParams.get("plan");

useEffect(() => {
  if (preSelectedPlanSlug && plans) {
    const plan = plans.find(p => p.slug === preSelectedPlanSlug);
    if (plan) {
      setSelectedPlan(plan);
      setStep(user ? 3 : 2); // Pula para login ou dados da equipe
    }
  }
}, [preSelectedPlanSlug, plans, user]);
```

### Fluxo de Checkout
```typescript
const handleFinish = async () => {
  if (!selectedPlan || !teamData.name) return;
  
  setIsProcessing(true);
  try {
    // 1. Criar equipe
    const team = await createTeam.mutateAsync({
      name: teamData.name,
      description: teamData.description,
      accessCode: teamData.accessCode,
    });
    
    // 2. Iniciar checkout
    const checkoutUrl = await createCheckout.mutateAsync({
      planSlug: selectedPlan.slug,
      teamId: team.id,
    });
    
    // 3. Redirecionar para Stripe
    window.location.href = checkoutUrl;
  } catch (error) {
    // Handle error
  }
};
```

### Layout Responsivo
- Desktop: Layout split-screen como Auth.tsx
- Mobile: Etapas em cards empilhados
- Indicador de progresso visual (1 → 2 → 3)

---

## Considerações de UX

1. **Link Externo**: Pode ser usado em landing pages, emails marketing
2. **Deep Link com Plano**: `/get-started?plan=profissional` pré-seleciona
3. **Usuário Já Logado**: Pula etapa de autenticação
4. **Validação em Tempo Real**: Código de acesso único verificado
5. **Loading States**: Feedback durante criação + checkout
6. **Erro Handling**: Mensagens claras se algo falhar

---

## Resumo das Alterações

| Arquivo | Ação |
|---------|------|
| `src/pages/GetStarted.tsx` | **CRIAR** - Página pública de checkout |
| `src/App.tsx` | Adicionar rota `/get-started` como pública |
| `src/pages/SubscriptionSuccess.tsx` | Melhorar detecção de equipe após checkout |
| `src/locales/pt-BR.json` | Adicionar traduções getStarted |
| `src/locales/en-US.json` | Adicionar traduções getStarted |
| `src/locales/es.json` | Adicionar traduções getStarted |

