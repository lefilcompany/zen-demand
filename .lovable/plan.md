

## Problema

Quando o timer é pausado (no detalhe da demanda, no Kanban ou na sidebar), a sidebar continua mostrando o timer rodando por até 30 segundos. Isso acontece porque:

1. O `useStopUserTimer` faz **optimistic update** apenas na query `user-demand-time` (a da página de detalhe), mas **não** atualiza otimisticamente a query `active-timer-demands` (a da sidebar)
2. A sidebar depende de `invalidateQueries` que, embora force refetch, tem latência de rede — durante esse tempo o timer continua visualmente ativo
3. O mesmo problema ocorre ao iniciar: o `useStartUserTimer` não atualiza otimisticamente a sidebar

## Solução

Adicionar **optimistic updates** para a query `active-timer-demands` nas mutações de start e stop em `src/hooks/useUserTimeTracking.ts`:

### No `useStopUserTimer` — `onMutate`:
- Remover otimisticamente a demanda da lista `active-timer-demands`, fazendo a sidebar sumir o timer **instantaneamente**

### No `useStartUserTimer` — `onMutate`:
- Adicionar otimisticamente a demanda na lista `active-timer-demands`, fazendo a sidebar mostrar o timer **instantaneamente**
- Remover otimisticamente timers de outras demandas (já que só 1 fica ativo por vez)

### Rollback:
- Em caso de erro, restaurar o snapshot anterior de `active-timer-demands`

### Arquivo alterado
- `src/hooks/useUserTimeTracking.ts` — adicionar optimistic updates para `active-timer-demands` em ambas as mutações (start/stop)

