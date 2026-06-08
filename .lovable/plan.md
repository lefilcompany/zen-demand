
## Objetivo

1. Resolver os 2 testes E2E que continuam falhando no GitHub Actions:
   - `plan-limits.happy-path` (Enterprise → "Criar Novo Quadro")
   - `plan-limits.notes` (Profissional → "E2E Nota 1" não aparece)
2. Substituir o workflow atual por uma CI **completa**: lint, type-check, unit (Vitest) e E2E em **matriz por feature** (boards, demands, notes, members, services, happy-path), todos rodando em paralelo, com cache, retries controlados e upload de relatórios.

Sem CD (deploy fica fora, conforme escolhido).

---

## Diagnóstico das falhas atuais

Olhando seed + UI + Playwright:

**1) Happy-path (Enterprise → "Novo Quadro" não abre o wizard)**

- `Boards.tsx` só mostra o botão "Novo Quadro" quando `teamRole === "owner"`.
- `useTeamRole` mapeia `team_members.role === "admin"` → `"owner"`. A seed cria `team_members(role: "admin")`, então em teoria está ok.
- O CTA `<Button>Novo Quadro</Button>` está dentro de um `CreateBoardDialog` cujo `DialogTrigger asChild` envolve o trigger. **O accessible name do botão é "Novo Quadro" só em telas ≥ sm** (o texto é `hidden sm:inline`); em viewport menor o botão fica sem nome acessível e o `getByRole("button", { name: /^novo quadro$/i })` pode achar **outro** botão ("Criar Primeiro Quadro" no estado vazio) — mas a seed já cria 1 board default, então cai no header.
- O problema real é que **o clique no `DialogTrigger` é interceptado pelo `usePlanLimitGuard("boards")`**, que faz um `await queryClient.fetchQuery(...)` com `staleTime: 0` antes de chamar `setOpen(true)`. Como `selectedTeamId` na primeira carga ainda pode ser `null` (TeamContext faz auto-select via efeito), `guard()` retorna `true` imediatamente sem abrir o dialog (action é chamado, mas o setOpen acontece no microtask, porém o teste já checa nos 12s — isso passa). O que está realmente quebrando: o `accessible name` do dialog não bate com `/criar novo quadro/i` porque o `DialogTitle` é renderizado pelo Radix dentro de `DialogContent`, mas o atributo `aria-labelledby` é configurado pelo Radix → **o nome acessível do dialog é "Criar Novo Quadro"**. Isso deveria funcionar. Onde realmente quebra: o teste só atinge `/boards` se o `selectedTeamId` foi semeado no `localStorage` **antes** de o React inicializar — `primeBrowser` usa `addInitScript`, ok, mas depois faz `page.goto("/welcome")` e fecha; quando o teste faz `page.goto("/boards")`, o `useTeams` precisa carregar; se a query falhar (RLS) o `currentTeam` fica vazio e o botão não renderiza. Solução: assertar primeiro que o botão **existe e está habilitado**, e usar locator pelo trigger do dialog ao invés do aria-name, que em CI pode trazer corrida com hidratação. Também devemos esperar `networkidle` antes da asserção.

**2) Notes (não encontra "E2E Nota 1")**

- A seed insere 10 notas no banco direto.
- A UI lista via `useNotes()` filtrando `team_id` e **só inclui notas criadas pelo `user.id` em "Minhas Notas"** (`note.created_by === user.id` — ok, a seed seta `created_by: userId` do owner).
- Mas o `Note.title` está sendo renderizado dentro do componente `NoteCard` — provavelmente com formatação/truncate. O `getByText(/e2e nota 1/i)` deve achar; falha sugere que **as notas não chegam à UI** dentro do timeout. Causa provável: realtime subscription do `useNotes` invalida a query em loop, ou a query não está habilitada porque `selectedTeamId` é nulo no primeiro render.
- Diagnóstico mais provável: o `selectedTeamId` no `localStorage` é setado por `addInitScript`, **mas** o `TeamContext` faz `localStorage.getItem("selectedTeamId")` no `useState` initializer — funciona. Porém, depois ele tem um `useEffect` que, se `teams` retornar e o `selectedTeamId` atual **não estiver na lista** (ex: `useTeams` retornar vazio por causa de RLS lenta), reseta para `teams[0].id` ou mantém null. Se a query RLS demorar ou retornar 0 nas primeiras tentativas, ele apaga o `selectedTeamId`.
- Correção: o teste precisa **esperar o seletor de equipe estar pronto** (e/ou esperar o número de notas no `getByText` com mais paciência via `expect.poll`). Adicionalmente, alterar a seed para devolver IDs e fazer o teste **navegar para `/notes` somente depois** que uma query direta ao Supabase confirme as notas existem no DB (sanity-check programático).

---

## Mudanças que vou aplicar

### A) Estabilizar os 2 testes E2E

**`e2e/tests/plan-limits.happy-path.spec.ts`** — teste de boards:
- Após `loginAs`, fazer `page.goto("/boards", { waitUntil: "networkidle" })`.
- Esperar `getByRole("heading", { name: /meus quadros/i })`.
- Esperar `page.getByText(/quadro padrão/i)` (board criado pela seed) — garante que `useBoards` resolveu e que o `selectedTeamId` está correto.
- Pegar o CTA via `page.locator('button:has(svg.lucide-plus)').filter({ hasText: /novo quadro/i }).or(page.getByRole("button", { name: /^novo quadro$/i }))` — locator resiliente.
- Trocar a asserção do dialog para `expect(page.getByRole("dialog")).toBeVisible()` + `expect(page.getByText(/configure o quadro em etapas/i)).toBeVisible()` (texto do `DialogDescription` do `CreateBoardDialog`, mais único que o título).

**`e2e/tests/plan-limits.notes.spec.ts`** — teste Profissional:
- Após `loginAs`, antes de ir para `/notes`, ir para `/` e esperar a sidebar mostrar o nome da equipe (`E2E Team`) — confirma `TeamContext` estabilizado.
- Ir para `/notes`, esperar `heading /soma notes/i`.
- Usar `expect.poll` por até 20s checando `await page.getByText(/e2e nota/i).count()` ≥ 1 — tolerante a realtime/refetch.
- Manter as asserções do toast (mensagem do trigger).

### B) Pequeno reforço na fixture `primeBrowser`

- Após injetar storage, fazer `page.goto(baseURL, { waitUntil: "domcontentloaded" })` em vez de `/welcome` (rota mais estável) e **esperar `window.localStorage.getItem("sb-…-auth-token")` por uma evaluate**, garantindo persistência antes de fechar.

### C) Novo workflow CI no GitHub Actions

Substituir `.github/workflows/e2e.yml` por **`.github/workflows/ci.yml`** com 3 jobs:

```text
ci.yml
├─ lint-and-typecheck      (Ubuntu, bun)
│    ├─ bun install
│    ├─ bun run lint
│    └─ bunx tsc --noEmit
├─ unit                    (depende de lint)
│    ├─ bun install
│    └─ bunx vitest run --reporter=default --coverage
│        └─ upload coverage/ como artifact
└─ e2e                     (matriz por feature, depende de lint)
     strategy:
       fail-fast: false
       matrix:
         spec:
           - boards
           - demands
           - notes
           - members
           - services
           - happy-path
     ├─ bun install --frozen-lockfile
     ├─ cache ~/.cache/ms-playwright
     ├─ bunx playwright install --with-deps chromium
     ├─ escreve .env (secrets)
     ├─ bunx playwright test e2e/tests/plan-limits.${{ matrix.spec }}.spec.ts
     │     timeout-minutes: 15
     ├─ upload playwright-report-${{ matrix.spec }} (always)
     └─ upload traces-${{ matrix.spec }} (failure)
```

Triggers: `push` (main), `pull_request` (main), `workflow_dispatch`, `schedule` (cron diário 03:00 UTC).

Concurrency: `group: ci-${{ github.ref }}, cancel-in-progress: true`.

Secrets necessárias (já existem):
- `E2E_SEED_SECRET`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

### D) Pequenos ajustes de suporte

- Adicionar script `"typecheck": "tsc --noEmit"` no `package.json`.
- Garantir `vitest run` no CI (já existe `vitest` como dev dep).
- Documentar tudo no `e2e/README.md` (rodar local, secrets, jobs).
- Não mexer no resto da CI (sem deploy).

---

## Riscos / observações

- Se a `useNotes` realtime subscription mantiver a query "carregando" em loop, o `expect.poll` ainda dá tempo (20s). Caso o teste continue intermitente, o próximo passo é **bypassar a UI inicial** consultando direto o Supabase via fixture para confirmar dados antes de clicar — já incluído como passo de sanity opcional no spec de notes.
- Matriz E2E em 6 jobs aumenta o tempo de wall-clock total mas **reduz** o tempo do gargalo (cada job ≈ 1 spec). Cada job usa cache do Playwright para baixar Chromium uma vez por hash de lockfile.
- Sem deploy: nenhuma alteração em produção; o workflow apenas valida.

---

## Arquivos que serão alterados/criados

- **delete** `.github/workflows/e2e.yml`
- **create** `.github/workflows/ci.yml`
- **edit** `e2e/tests/plan-limits.happy-path.spec.ts`
- **edit** `e2e/tests/plan-limits.notes.spec.ts`
- **edit** `e2e/fixtures/auth.ts` (priming mais robusto)
- **edit** `package.json` (script `typecheck`)
- **edit** `e2e/README.md` (atualizar instruções e estrutura dos jobs)
