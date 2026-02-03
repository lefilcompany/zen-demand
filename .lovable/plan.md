
# Plano: Permitir Reentrada em Equipes Após Remoção

## Problema Identificado
Quando um usuário é removido de uma equipe, ele não consegue solicitar entrada novamente porque:
- O registro em `team_join_requests` permanece com `status = 'approved'`
- A página de entrada (`JoinTeam`) verifica apenas o status do request, não se o usuário ainda está em `team_members`
- A interface mostra "você já é membro!" mesmo quando o usuário foi removido

## Solução Proposta

### Abordagem
Adicionar uma verificação dupla: verificar se existe um request aprovado **E** se o usuário realmente está na tabela `team_members`. Se o request está aprovado mas o usuário não está mais em `team_members`, ele foi removido e deve poder solicitar entrada novamente.

---

## Alterações

### 1. Hook `useTeamJoinRequests.ts`

**Criar novo hook para verificar membership:**
```typescript
// Verificar se o usuário é membro ativo da equipe
export function useIsTeamMember(teamId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-team-member", teamId, user?.id],
    queryFn: async () => {
      if (!user || !teamId) return false;

      const { data, error } = await supabase
        .from("team_members")
        .select("id")
        .eq("team_id", teamId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!user && !!teamId,
  });
}
```

**Atualizar mutação `useCreateJoinRequest`:**
- Além de deletar requests `rejected`, também deletar requests `approved` quando o usuário não está mais em `team_members`

```typescript
mutationFn: async ({ teamId, message }) => {
  // Deletar requests anteriores (rejected OU approved se foi removido)
  await supabase
    .from("team_join_requests")
    .delete()
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .in("status", ["rejected", "approved"]);
  
  // Criar novo request...
}
```

### 2. Página `JoinTeam.tsx`

**Importar e usar novo hook:**
```typescript
import { 
  useTeamByAccessCode, 
  useCreateJoinRequest, 
  useExistingRequest,
  useIsTeamMember  // Novo
} from "@/hooks/useTeamJoinRequests";
```

**Verificar membership ativo:**
```typescript
const { data: isActiveMember, isLoading: isLoadingMember } = useIsTeamMember(teamPreview?.id || null);
```

**Atualizar lógica de bloqueio:**
```typescript
// Só bloqueia se:
// 1. Request está pendente, OU
// 2. Request está aprovado E usuário ainda é membro ativo
const hasBlockingRequest = existingRequest && (
  existingRequest.status === "pending" ||
  (existingRequest.status === "approved" && isActiveMember)
);

// Pode submeter se:
// 1. Não tem request, OU
// 2. Request foi rejeitado, OU
// 3. Request foi aprovado MAS usuário foi removido (não é mais membro)
const canSubmitRequest = !existingRequest || 
  existingRequest.status === "rejected" ||
  (existingRequest.status === "approved" && !isActiveMember);
```

**Atualizar mensagem de status para usuário removido:**
```typescript
const getStatusBadge = () => {
  if (!existingRequest) return null;
  
  // Se foi aprovado mas não é mais membro, mostrar mensagem diferente
  if (existingRequest.status === "approved" && !isActiveMember) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-amber-500/10 text-amber-600 border-amber-500/20">
        <UserMinus className="h-5 w-5 flex-shrink-0" />
        <span className="font-medium text-sm">
          Você foi removido desta equipe. Solicite entrada novamente.
        </span>
      </div>
    );
  }
  
  // ... resto da lógica existente
};
```

---

## Fluxo Final

```text
Usuário digita código → Equipe encontrada
                              ↓
          ┌─────────────────────────────────────┐
          │     Verifica request existente      │
          │     E se é membro ativo             │
          └─────────────────────────────────────┘
                              ↓
    ┌──────────────────┬──────────────────┬──────────────────┐
    │   Sem request    │  Request pending │ Approved + Ativo │
    │   OU rejeitado   │                  │                  │
    │   OU removido    │                  │                  │
    └────────┬─────────┴────────┬─────────┴────────┬─────────┘
             ↓                  ↓                  ↓
     [Formulário OK]    [Aguarde aprovação]  [Já é membro!]
```

---

## Resumo das Mudanças

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useTeamJoinRequests.ts` | Novo hook `useIsTeamMember` + atualizar `useCreateJoinRequest` para limpar requests antigos |
| `src/pages/JoinTeam.tsx` | Usar novo hook + atualizar lógica de `hasBlockingRequest` e `canSubmitRequest` + nova mensagem para usuários removidos |
