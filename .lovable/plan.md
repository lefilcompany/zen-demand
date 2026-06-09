## Causa raiz do publish travado

O problema **não está no frontend nem no `.env`** — está na edge function `supabase/functions/dashboard-ai-insights/index.ts`, que está com o código corrompido e quebra o deploy do bundle de funções no publish da branch `main` (e o erro real fica mascarado por trás de uma mensagem genérica de "update").

Evidências no arquivo atual:

1. **Bloco duplicado de `req.json()`** (linhas 38–44 e 46–52): a mesma destruturação `const { board_id, is_requester }` é declarada duas vezes no mesmo escopo → erro `Cannot redeclare block-scoped variable`.
2. **Linha 67 órfã**: `.limit(100);` aparece solta logo depois de um `if (!membership) { ... }`, sem nenhuma query encadeada antes → erro de sintaxe.
3. **`demandsQuery` nunca é declarada**, mas é usada nas linhas 70 (`demandsQuery.eq(...)`) e 74 (dentro do `Promise.all`).

Qualquer um desses três pontos faz o `deno check` falhar no momento do publish para Live, e o publish é abortado sem aplicar nenhuma alteração — daí a sensação de "não consigo dar update no sistema". Funciona em dev preview porque essa função específica não está sendo chamada lá no fluxo que você testou, mas o deploy para produção valida todas as funções.

## Correção

Reescrever apenas o trecho quebrado (linhas ~38–71) de `supabase/functions/dashboard-ai-insights/index.ts` para:

- Manter **um único** `const { board_id, is_requester } = await req.json();` com a validação.
- Manter a verificação de `membership` (autorização do board).
- **Reintroduzir a declaração de `demandsQuery`** que foi perdida — uma query em `demands` filtrada por `board_id`, com `select` dos campos usados depois (`demand_statuses(name)`, `services(name)`, `delivered_at`, `due_date`, `is_overdue`, `created_by`) e `.limit(100)` no final.
- Manter o `if (is_requester) demandsQuery.eq("created_by", userId);` logo após.

Nenhuma outra função, hook ou arquivo do frontend será tocado. O resto do arquivo (a partir do `Promise.all`) já está correto e continua igual.

## Validação

1. `deno check supabase/functions/dashboard-ai-insights/index.ts` deve passar.
2. Deploy isolado da função via `supabase--deploy_edge_functions(["dashboard-ai-insights"])` para confirmar que o bundle compila no ambiente real.
3. Depois disso, o publish da `main` volta a funcionar normalmente.

## Fora de escopo

- `.env` / `.gitignore`: já estão corretos (`.env` versionado, chaves `VITE_*` presentes).
- Hooks de realtime: já validados pelos 41 testes da rodada anterior, sem mudança.
- CI / `ENVIRONMENT` secret: já configurado, sem mudança.