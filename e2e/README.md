# Testes automatizados — SoMA+

## Pipeline CI (`.github/workflows/ci.yml`)

Disparado em `push`/`pull_request` para `main`, manual (`workflow_dispatch`) e diariamente às 03:00 UTC.

Jobs (todos em paralelo após o lint):

```
lint-and-typecheck   →  eslint + tsc --noEmit
unit                 →  vitest run (testes em src/**/*.test.{ts,tsx})
e2e (matriz)         →  playwright para cada spec:
                         - boards
                         - demands
                         - notes
                         - members
                         - services
                         - happy-path
```

Cada job E2E sobe o Vite (`npm run dev`) via `playwright.config.ts > webServer`, faz seed via edge function `e2e-seed` e publica:
- `playwright-report-<spec>` sempre
- `playwright-traces-<spec>` em falhas

## Secrets necessários no repositório

Em **Settings → Secrets and variables → Actions**:

- `E2E_SEED_SECRET` — mesmo valor configurado em **Lovable Cloud → Secrets**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

## Rodando localmente

```bash
# 1. exporte o secret (mesmo cadastrado no Cloud)
export E2E_SEED_SECRET="..."

# 2. instale o Chromium (uma vez)
bunx playwright install chromium

# 3. rode tudo
bun run e2e

# ou um arquivo só
bunx playwright test e2e/tests/plan-limits.boards.spec.ts

# UI interativa
bun run e2e:ui
```

## Scripts úteis

| Comando | O que faz |
|---|---|
| `bun run lint` | ESLint |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run test` | Vitest unit suite |
| `bun run e2e` | Playwright completo |

## Limitações conhecidas

- Workers Playwright = 1 (seed mutável compartilha estado).
- O teste de **members** valida via RPC `join_team_with_code` (não o fluxo manual de aprovação).
- Resíduos após crash: usuários com prefixo `e2e+` podem ser removidos no painel de auth.
