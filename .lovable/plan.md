
# Plano: Corrigir Tela de Gerenciamento de Tempo

## Problemas Identificados

### 1. Erro de DOM Nesting (button dentro de button)
O console mostra o erro:
```
validateDOMNesting(...): <button> cannot appear as a descendant of <button>
```
Em `UserDetailTimeRow.tsx`, linha 127-134, há um `<button>` para navegação ao perfil do usuário dentro do `CollapsibleTrigger` (que já é um `<Button>`). Isso é inválido em HTML.

### 2. Cálculo de Tempo Duplicado
No `TimeManagement.tsx`, o `groupedByDemand` calcula a duração de duas formas:
- Usa `entry.duration_seconds` para entradas concluídas
- Recalcula `(ended_at - started_at)` para entradas ativas

Isso pode causar inconsistência porque o campo `duration_seconds` já contém o valor correto.

### 3. Tempo Total Não Atualizando em Tempo Real
O tempo total no card "Tempo Total" usa `liveTotalTime`, mas o cálculo base (`totals.totalTime`) soma apenas `duration_seconds` das entradas concluídas, não considerando corretamente os timers ativos.

---

## Correções Propostas

### 1. Corrigir `UserDetailTimeRow.tsx`
**Problema**: `<button>` dentro de `<Button>` (CollapsibleTrigger)

**Solução**: Usar `<span>` com `role="link"` e `tabIndex={0}` para o nome do usuário, ou mover a ação de navegação para fora do trigger.

```tsx
// ANTES (errado):
<button type="button" onClick={...}>
  {userData.profile.full_name}
</button>

// DEPOIS (correto):
<span
  role="link"
  tabIndex={0}
  onClick={(e) => {
    e.stopPropagation();
    navigate(`/user/${userData.userId}`);
  }}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.stopPropagation();
      navigate(`/user/${userData.userId}`);
    }
  }}
  className="font-medium truncate hover:text-primary hover:underline cursor-pointer transition-colors"
>
  {userData.profile.full_name}
</span>
```

### 2. Corrigir `DemandDetailTimeRow.tsx`
**Mesmo problema**: `<button>` dentro do CollapsibleTrigger

**Solução**: Mesma abordagem - usar `<span>` com role="link"

### 3. Corrigir Cálculo de Tempo em `TimeManagement.tsx`
**Problema**: O `groupedByDemand` calcula duração de forma inconsistente

**Solução**: Sempre usar `entry.duration_seconds` já que este é atualizado quando o timer para. Para timers ativos, o `useLiveTimer` já calcula o tempo decorrido desde `started_at`.

```tsx
// groupedByDemand - usar apenas duration_seconds
filteredEntries.forEach((entry) => {
  const demandId = entry.demand_id;
  const duration = entry.duration_seconds || 0; // ← Simplificado
  const isActive = !entry.ended_at;
  // ...resto igual
});
```

### 4. Ajustar `useBoardTimeEntries.ts` para Tempo Real
O hook já tem realtime configurado, mas vamos garantir que as invalidações de queries estão corretas.

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/UserDetailTimeRow.tsx` | Trocar `<button>` por `<span>` com role="link" |
| `src/components/DemandDetailTimeRow.tsx` | Trocar `<button>` por `<span>` com role="link" |
| `src/pages/TimeManagement.tsx` | Simplificar cálculo de duração no groupedByDemand |

---

## Detalhes Técnicos

### Correção UserDetailTimeRow.tsx (linhas 127-136)
```tsx
// Substituir button por span acessível
<span
  role="link"
  tabIndex={0}
  onClick={(e) => {
    e.stopPropagation();
    navigate(`/user/${userData.userId}`);
  }}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.stopPropagation();
      navigate(`/user/${userData.userId}`);
    }
  }}
  className="font-medium truncate hover:text-primary hover:underline cursor-pointer transition-colors"
>
  {userData.profile.full_name}
</span>
```

### Correção DemandDetailTimeRow.tsx (linhas 92-102)
```tsx
// Mesmo padrão para o título da demanda
<span
  role="link"
  tabIndex={0}
  onClick={(e) => {
    e.stopPropagation();
    navigate(`/demands/${demandData.demand.id}`);
  }}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.stopPropagation();
      navigate(`/demands/${demandData.demand.id}`);
    }
  }}
  className="font-medium truncate hover:text-primary hover:underline cursor-pointer transition-colors"
  title={demandData.demand.title}
>
  {truncateText(demandData.demand.title)}
</span>
```

### Correção TimeManagement.tsx (linhas 177-217)
```tsx
// Simplificar cálculo - usar apenas duration_seconds
const groupedByDemand = useMemo(() => {
  const grouped = new Map<string, GroupedByDemand>();

  filteredEntries.forEach((entry) => {
    const demandId = entry.demand_id;
    const duration = entry.duration_seconds || 0; // ← Usar diretamente
    const isActive = !entry.ended_at;

    if (!grouped.has(demandId)) {
      grouped.set(demandId, {
        demand: entry.demand,
        entries: [],
        totalSeconds: 0,
        users: new Map(),
        hasActiveTimer: false,
      });
    }

    const group = grouped.get(demandId)!;
    group.entries.push(entry);
    group.totalSeconds += duration;
    if (isActive) group.hasActiveTimer = true;

    // Track per-user time
    if (entry.profile) {
      const userId = entry.user_id;
      if (!group.users.has(userId)) {
        group.users.set(userId, { profile: entry.profile, totalSeconds: 0 });
      }
      group.users.get(userId)!.totalSeconds += duration;
    }
  });

  return Array.from(grouped.values()).sort((a, b) => {
    if (a.hasActiveTimer && !b.hasActiveTimer) return -1;
    if (!a.hasActiveTimer && b.hasActiveTimer) return 1;
    return b.totalSeconds - a.totalSeconds;
  });
}, [filteredEntries]);
```

---

## Resultado Esperado

Após as correções:
1. ✅ Erro de DOM nesting eliminado
2. ✅ Tempos calculados corretamente
3. ✅ Timers ativos mostrando tempo em tempo real
4. ✅ Cards de estatísticas (Tempo Total, Média/Usuário, etc.) atualizando corretamente
5. ✅ Ranking de usuários com tempos ao vivo funcionando
