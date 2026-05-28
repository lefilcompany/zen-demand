# E2E Plan Limits — Playwright

Suíte que valida, em navegador real, que os limites de plano (boards, members, demands mensais, services, notes) são respeitados pela UI e pelos triggers do banco.

## Como funciona

1. **Edge function `e2e-seed`** (em `supabase/functions/e2e-seed`) cria, sob demanda, um usuário, uma equipe, uma `subscription` ativa do plano escolhido e pré-popula o recurso alvo até o limite. Protegida por `x-e2e-secret`.
2. **Fixtures Playwright** (`e2e/fixtures/`):
   - `seed.ts` → chama a edge function (`seedTeam`, `seedExtraUser`, `cleanupEmails`).
   - `auth.ts` → login programático via `supabase-js` + injeta `selectedTeamId` no `localStorage`.
   - `test.ts` → expõe `seeded(plan, fill)` e `loginAs(team)` e faz cleanup automático.
3. **Specs** em `e2e/tests/`:
   - `plan-limits.boards.spec.ts`
   - `plan-limits.demands.spec.ts`
   - `plan-limits.services.spec.ts`
   - `plan-limits.notes.spec.ts` (Starter=0 + Profissional=10)
   - `plan-limits.members.spec.ts` (via RPC `join_team_with_code`)
   - `plan-limits.happy-path.spec.ts` (Enterprise = sem bloqueios)

## Pré-requisitos

1. Adicione o secret `E2E_SEED_SECRET` no projeto Cloud (qualquer string forte). Ele:
   - é usado pela edge function para autorizar chamadas.
   - precisa estar **também no seu shell local** (ou em `.env`) para os testes chamarem a função.
2. Instale o navegador do Playwright (uma vez):
   ```bash
   npx playwright install chromium
   ```

## Rodando localmente

```bash
# Opcional: export do secret no shell (já presente no Cloud)
export E2E_SEED_SECRET="o-mesmo-valor-cadastrado-no-cloud"

# Sobe o Vite em background automaticamente (port 8080) e roda a suíte
npm run e2e

# UI interativa
npm run e2e:ui

# Apenas um arquivo
npx playwright test e2e/tests/plan-limits.boards.spec.ts
```

A configuração (`playwright.config.ts`) usa `webServer` para subir `npm run dev` antes da suíte, então não precisa rodar o dev server manualmente.

## Limpeza

Cada teste limpa os usuários/equipes que criou via `cleanupEmails`. Se uma rodada cair no meio, basta remover manualmente usuários com prefixo `e2e+` na tabela de auth.

## Limitações conhecidas

- Roda serialmente (`workers: 1`) para evitar corrida com os triggers compartilhados.
- O teste de **members** valida o trigger no nível do RPC `join_team_with_code` em vez do fluxo de aprovação manual (que exige round-trip do admin).
