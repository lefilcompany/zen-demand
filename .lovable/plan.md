

## Diagnóstico da Lentidão

Identifiquei **3 causas principais** que sobrecarregam o banco e deixam o app lento:

### 1. QueryClient sem configuração de cache (causa raiz)
Em `App.tsx` linha 89: `const queryClient = new QueryClient()` — sem **nenhuma** configuração. Isso significa:
- `staleTime = 0`: toda query é considerada "velha" instantaneamente
- Cada vez que um componente monta, muda de aba, ou foca a janela, **todas as queries refazem requisição ao banco**
- Com ~15 hooks ativos simultaneamente (demands, teams, boards, subscription, notifications, profiles, etc.), cada navegação gera **dezenas de requisições paralelas**

### 2. useDataPrecache ainda pesado
Mesmo com o throttle de 30s, o precache faz 6 queries pesadas (demands com JOINs, profiles, boards, teams, services, statuses) a cada ciclo. Como o QueryClient não tem cache, essas queries **duplicam** o que o React Query já busca.

### 3. Invalidações em cascata do Realtime
O `useRealtimeDemands` invalida ~8 query keys a cada mudança de qualquer demanda. Com staleTime=0, cada invalidação dispara refetch imediato de **todos** os hooks dependentes.

---

## Plano de Correção

### Passo 1: Configurar QueryClient com defaults globais (App.tsx)
Adicionar `staleTime: 60_000` (1 minuto) e `gcTime: 300_000` (5 minutos) como defaults. Isso faz com que dados recém-buscados **não sejam re-buscados** por 1 minuto, eliminando a maioria das requisições duplicadas.

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,        // 1 minuto
      gcTime: 5 * 60 * 1000,       // 5 minutos
      refetchOnWindowFocus: false,  // desabilitar refetch no foco
      retry: 2,
    },
  },
});
```

### Passo 2: Reduzir frequência do useDataPrecache
- Aumentar `CACHE_REFRESH_INTERVAL` de 5 para 10 minutos
- Aumentar `MIN_PRECACHE_INTERVAL` de 30s para 2 minutos
- Remover o listener de `visibilitychange` (já não precisa com o staleTime do QueryClient)
- Aumentar delay inicial de 2s para 5s

### Passo 3: Otimizar invalidações do Realtime
No `useRealtimeDemands`, reduzir as invalidações para apenas as queries essenciais (demands do board atual e demand específica), removendo invalidações de queries secundárias que podem esperar o staleTime expirar.

### Arquivos alterados
- `src/App.tsx` — configurar QueryClient
- `src/hooks/useDataPrecache.ts` — reduzir frequência e remover listener redundante
- `src/hooks/useRealtimeDemands.ts` — reduzir invalidações em cascata

### Resultado esperado
- Login: ~70% menos requisições ao banco
- Navegação entre páginas: dados cacheados por 1 minuto, sem re-buscar
- Dashboard: carrega instantaneamente após primeira visita
- Solicitações de Demanda: para de mostrar "Carregando..." indefinidamente
- Realtime: continua funcionando, mas sem avalanche de refetches

