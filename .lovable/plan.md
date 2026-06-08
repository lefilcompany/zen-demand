
# Plano — Corrigir agendamento de demandas recorrentes

## Decisões confirmadas
- **Opção A**: cron em produção autenticado via `CRON_SECRET`.
- **Frequência prod**: `0 * * * *` (a cada hora).
- **Secrets**: `CRON_SECRET` distintos em dev e prod.
- **Job órfão (jobid 5)**: remover só o cron, manter o `recurring_demand` `7339291f…`.
- **Backfill**: B3 puro — reset `next_run_date = CURRENT_DATE` e `last_generated_at = NULL` para as 10 recorrências atrasadas; uma geração por recorrência, sem recuperar dias perdidos.
- **CI**: continuar com `bun`.

## Passo a passo

### 1. Secrets
1. Gerar `CRON_SECRET` (48 bytes hex) distintos para dev e prod e adicionar via `secrets--add_secret` em cada ambiente.
2. Validar com `fetch_secrets` em ambos.

### 2. Refator do edge function (TDD-friendly)
Em `supabase/functions/process-recurring-demands/`:
- Extrair para `lib.ts` (funções puras, sem I/O):
  - `calculateNextRunDate(frequency, dayOfWeek?, dayOfMonth?, fromDate)`
  - `adjustToBusinessDay(date)` (regra atual: sábado/domingo → segunda)
  - `calculateBusinessDueDate(startDate, businessDays)`
  - `isAuthorized(authHeader, cronSecret)` (pura, retorna boolean)
- `index.ts` passa a importar de `lib.ts`. Adicionar log estruturado quando 401 (registra prefixo do header recebido, sem expor o secret).
- Nenhuma mudança de comportamento de geração — apenas separação para testabilidade.

### 3. Limpeza de cron jobs (dev)
- `DELETE` jobid 4 (`process-recurring-demands-daily`, anon key apontando p/ prod).
- `DELETE` jobid 5 (`fix-creator-recurrence-once`). Não tocar no registro `7339291f…`.
- Manter jobid 2 (dev) ajustando para usar `CRON_SECRET` dev.

### 4. Cron em produção
Via `supabase--insert` (não migration), com env `production`:
```sql
select cron.schedule(
  'process-recurring-demands-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url:='https://dcojvsftpzwfhgvamdgm.supabase.co/functions/v1/process-recurring-demands',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || current_setting('app.cron_secret', true)
    ),
    body:='{}'::jsonb
  );
  $$
);
```
(O valor do `CRON_SECRET` será gravado como GUC do banco prod via `ALTER DATABASE`/`SET` por meio de uma `supabase--insert` específica, ou embutido literal no `cron.schedule` — definirei a tática segura no momento da execução para não logar o secret.)

### 5. Backfill B3
`supabase--insert` em **prod**:
```sql
UPDATE public.recurring_demands
SET next_run_date = CURRENT_DATE,
    last_generated_at = NULL
WHERE is_active = true
  AND next_run_date < CURRENT_DATE;
```
Após o primeiro tick (≤ 1h), validar com `read_query` que cada recorrência gerou 1 demanda nova.

### 6. Testes (TDD vertical — um por vez, RED → GREEN)
`supabase/functions/process-recurring-demands/lib_test.ts` (Deno):
- daily → soma 1 dia
- weekly com `day_of_week` → próxima ocorrência correta
- monthly com `day_of_month=13` em mês cujo dia cai no sábado → ajusta para segunda
- monthly com `day_of_month=31` em fevereiro → último dia útil do mês
- `isAuthorized`: aceita `Bearer <secret>`, rejeita ausente/diferente/prefixo errado

`supabase/functions/process-recurring-demands/index_test.ts` (integração leve):
- 401 sem header
- 401 com bearer inválido
- 200 com bearer válido (mockando supabase client via injeção)

Rodar com `supabase--test_edge_functions`.

### 7. CI (`.github/workflows/ci.yml`)
Manter `bun` (já confirmado). Adicionar/garantir jobs:
- `bun install --frozen-lockfile`
- `bun run lint`
- `bun run build`
- `bunx vitest run` (unitários frontend, se existirem)
- Step Deno: `denoland/setup-deno@v1` + `deno test -A supabase/functions/process-recurring-demands/`

### 8. Validação manual pós-deploy
- `curl` no endpoint prod sem header → 401.
- `curl` com `Authorization: Bearer <CRON_SECRET prod>` → 200.
- `edge_function_logs` (env=production) sem erros.
- `read_query` em prod confirmando novas linhas em `demands` com `recurring_demand_id` preenchido após o primeiro tick.

## Arquivos afetados
- `supabase/functions/process-recurring-demands/index.ts` (refator)
- `supabase/functions/process-recurring-demands/lib.ts` (novo)
- `supabase/functions/process-recurring-demands/lib_test.ts` (novo)
- `supabase/functions/process-recurring-demands/index_test.ts` (novo)
- `.github/workflows/ci.yml` (adiciona step Deno)
- DB: 2 secrets, 3 deletes/inserts em `cron.job`, 1 update em `recurring_demands` (prod).

## Riscos / pontos de atenção
- Embutir o `CRON_SECRET` literal dentro do corpo do `cron.schedule` o deixa visível em `cron.job` para quem tem acesso ao banco. Mitigação: usar GUC (`app.cron_secret`) ou tabela cifrada. Decidirei a tática segura na execução; se não houver caminho seguro, **paro e pergunto antes de gravar o secret em texto plano**.
- Não há recuperação de dias perdidos (B3 acordado).
- Não tocarei no registro `7339291f…` nem em outras lógicas de geração.

Skills aplicadas: **tdd** (slices verticais — um teste por vez) e **caveman** (parar e perguntar diante de conflito/incerteza, sem decidir sozinho).
