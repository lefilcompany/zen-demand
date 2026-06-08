## Diagnóstico (já feito)

- **Backend publicado OK:** `is_published=true`, visibility=public.
- **Bundle em produção:** `index-BNif8ieL.js` servido tanto em `zen-demand.lovable.app` quanto em `pla.soma.lefil.com.br` — ou seja, o site **está no ar e atualizado**.
- **Scan de segurança:** 165 achados, **todos `warn`** (nenhum `error`/crítico). Não bloqueia publish.
- **Migrations de segurança recentes** (`20260528161045`, `20260604155919`, `20260605104046`) mexem só em policies RLS de `demand_interactions`, `team_members`, `demand_statuses`, `demand_requests`. Nenhuma DROP TABLE / GRANT removido / função quebrada.
- **Logs do console** só mostram `INITIAL_SESSION No session` (normal em /auth) e bloqueio do LinkedIn pixel por ad-blocker (irrelevante).
- **Logs "App update check: 2.15.0 == 2.15.0"** vêm do wrapper Lovable, não do app.

**Conclusão preliminar:** publish do código **não está falhando**. O que pode estar acontecendo:
1. Cache do navegador / service worker antigo no device do usuário não pega versão nova.
2. Alguma policy RLS nova quebrou um fluxo silencioso (ex.: `demand_requests` agora exige `is_board_member`, antes era "team executor") — UI parece "não atualizada" porque dados somem.
3. O botão Publish da plataforma deu erro transitório que o usuário interpretou como "publish quebrado".

## Plano (TDD-driven)

### 1. Escrever testes que travam o comportamento das policies novas (RED → GREEN)

Tests Selenium / SQL que cobrem o que a correção de segurança mudou — se algum quebrar, achamos o bug oculto:

- `demand_requests`: membro de board lê pedidos do seu board ✓; não-membro não lê ✗.
- `demand_statuses`: anônimo vê statuses do sistema ✓; vê status custom só se membro do board ✗.
- `demand_interactions` (share público): anônimo lê canal `general` ✓; **NÃO** lê canal `internal` ✗.
- `team_members`: insert direto via Data API por authenticated **falha** ✗; via RPC `join_team_with_code` ✓.

Cada teste = um SQL via service_role + uma chamada via anon/authenticated, comparando resultado esperado.

### 2. Rodar bateria completa

```text
bun run lint
bunx tsc --noEmit
bunx vitest run
deno test supabase/functions/process-recurring-demands/
python -m pytest tests_selenium -q
```

Qualquer regressão → corrige na hora.

### 3. Verificação manual rápida

- Abrir `/auth`, logar, criar demand, abrir share link → garantir que canal `internal` não vaza.
- Tentar joinar team com código → garantir RPC funciona.

### 4. Forçar re-publish limpo

Após verde em tudo:
- Chamar `preview_ui--publish` com summary explícito.
- Instruir usuário a **hard-reload** (Ctrl+Shift+R) ou abrir aba anônima — service worker antigo é o suspeito #1 do "não atualizou".

### 5. Se publish realmente retornar erro da plataforma

- Capturar mensagem exata.
- Se for "security blocker": usar `manage_security_finding` para marcar `warn`s aceitos como ignored (com justificativa).
- Caso contrário: escalar como bug de plataforma (código está OK).

## Detalhes técnicos

- Não vou tocar nas migrations de segurança a menos que um teste prove regressão real.
- Não vou mexer em `client.ts`, `types.ts`, `.env`, `config.toml` (auto-gerados).
- Testes novos vão em `tests_selenium/tests/test_security_policies.py` + SQL helpers em `tests_selenium/helpers.py`.
- TDD vertical: um teste por vez, RED → GREEN, sem escrever bateria toda antes.

## Entrega esperada

- Suite de testes que prova que as correções de segurança **não quebraram** fluxos críticos.
- Site re-publicado, bundle novo no ar.
- Instrução clara ao usuário sobre cache de SW caso ainda veja versão antiga.
