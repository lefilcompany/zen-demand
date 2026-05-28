## Objetivo

Validar end-to-end, em navegador real, que os limites de plano são respeitados em todos os pontos de criação (quadros, membros, demandas mensais, serviços e notas), com toast de "Limite atingido" e abertura do modal de planos.

## Por que Playwright

- Suporte nativo TS/Vite/React, melhor que Cypress para múltiplos contextos de auth e que Selenium em ergonomia.
- `webServer` integrado sobe o `npm run dev` automaticamente antes da suíte.
- `storageState` por projeto permite logar uma vez por plano e reaproveitar a sessão.
- Tracing/HAR/screenshots facilitam debug de falhas.

## Estratégia de seed (descartável por execução)

Não é viável criar usuários direto do navegador (precisa de service_role). Criaremos uma **edge function de teste** `e2e-seed`, protegida por um secret, que executa toda a montagem usando a service_role key.

Operações da edge function:
- `seed`: recebe `{ plan: "starter"|"pro"|"business", scenario: "at_limit"|"below_limit", resource: "boards"|"members"|"demands"|"services"|"notes" }` e retorna `{ email, password, teamId, boardId }`.
  - Cria usuário via `auth.admin.createUser` (email confirmado).
  - Cria equipe + `team_members` (owner).
  - Insere `subscriptions` ativa apontando para o `plan_id` correto.
  - Cria 1 quadro padrão + 5 status base.
  - Pré-popula a equipe **até bater o limite** quando `scenario = at_limit` (ex.: para Starter+boards, já cria 1 board; para members, adiciona N-1 convidados fictícios; para demands, insere N demandas no mês corrente; idem services/notes). Inserts feitos com service_role para bypass dos triggers `PLAN_LIMIT_*`.
- `cleanup`: recebe `{ email }` e remove o usuário (cascata cuida do resto).

A função fica gated por header `x-e2e-secret` validado contra o secret `E2E_SEED_SECRET`. Não é exposta em produção (verifica `Deno.env.get("APP_ENV") !== "production"` ou simplesmente exige o secret que só existe em dev).

## Estrutura da suíte

```text
e2e/
  playwright.config.ts
  fixtures/
    seed.ts              # helpers para chamar e2e-seed / cleanup
    auth.ts              # login programático via supabase-js (sessão p/ storageState)
  tests/
    plan-limits.boards.spec.ts
    plan-limits.members.spec.ts
    plan-limits.demands.spec.ts
    plan-limits.services.spec.ts
    plan-limits.notes.spec.ts
    plan-limits.happy-path.spec.ts   # plano Pro/Business cria sem erro
```

Cada teste segue o padrão:
1. `beforeEach` → chama `seed({plan, scenario:"at_limit", resource})`, faz login programático e injeta cookies/localStorage.
2. `page.goto("/")` no contexto da equipe semeada.
3. Clica no CTA real (`Novo Quadro` / `Nova Demanda` / `Novo Serviço` / `Nova Nota` / `Adicionar membro`).
4. Espera o toast contendo "Limite" e o botão "Ver planos".
5. Clica em "Ver planos" e valida que o `PlansModal` abre.
6. `afterEach` → `cleanup({email})`.

Casos negativos cobertos:
- **Boards (Starter)**: 1 quadro já criado → clique em "Novo Quadro" abre toast, wizard não abre.
- **Members**: limite atingido → `AddBoardMemberDialog` bloqueia antes de abrir.
- **Demands mensais**: cota do mês cheia → `openCreateDemand` no topbar e no calendário disparam toast.
- **Services / Notes**: botões disparam guard antes do form.

Casos positivos (sanity):
- Plano `business` (limites altos) cria 1 quadro / 1 demanda / 1 serviço / 1 nota sem toast de limite.

## Detalhes técnicos

- **playwright.config.ts**: `webServer: { command: 'npm run dev', url: 'http://localhost:8080', reuseExistingServer: !process.env.CI, timeout: 120_000 }`, `baseURL: 'http://localhost:8080'`, browsers: chromium (headless), `trace: 'retain-on-failure'`.
- **Auth helper**: usa `@supabase/supabase-js` com `signInWithPassword` no Node, pega `access_token`/`refresh_token`, injeta no `localStorage` com a chave que o app espera (`sb-<projectRef>-auth-token`). Evita digitar credenciais na UI a cada teste.
- **Seleção de equipe**: após login, set explícito de `lastSelectedTeamId` no localStorage para a equipe semeada (o app já usa esse padrão segundo a memória `Multi-account Limit`).
- **Secrets**: `E2E_SEED_SECRET` adicionado via tool de secrets. Os testes leem `VITE_SUPABASE_URL` do `.env` e `E2E_SEED_SECRET` do `process.env`.
- **package.json scripts**: `"e2e": "playwright test"`, `"e2e:ui": "playwright test --ui"`. Devs: `@playwright/test`, `dotenv`, `@supabase/supabase-js` (já presente).
- **CI hygiene**: cada teste usa email único (`e2e+${uuid}@soma.test`) para isolamento total — sem colisão entre runs paralelos.
- **`.gitignore`**: `e2e/.auth/`, `playwright-report/`, `test-results/`.

## Migração necessária

Nenhuma alteração de schema. Apenas a nova edge function `e2e-seed` (não toca em `supabase/config.toml` além do bloco padrão).

## Entregáveis

1. `supabase/functions/e2e-seed/index.ts` — seed + cleanup com service_role e validação do secret.
2. `playwright.config.ts` + pasta `e2e/` com fixtures e 6 specs.
3. Atualização de `package.json` (scripts + devDeps) e `.gitignore`.
4. Secret `E2E_SEED_SECRET` (será solicitado via add_secret no momento do build).
5. README curto em `e2e/README.md` explicando como rodar (`npm run e2e`).

## Fora de escopo

- Testes de Stripe real (apenas mock de subscription via insert direto).
- Testes de e-mails enviados.
- Validação de planos via Pricing/checkout UI.
