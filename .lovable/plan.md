
Objetivo: corrigir de forma completa o fluxo de **Criar/Editar Etapa** no Kanban, garantindo que todas as funcionalidades funcionem (nome, cor, tipo de aprovação, visibilidade por papel) e que o formulário seja sempre navegável com scroll em qualquer tela.

### 1) Diagnóstico consolidado (o que está quebrando hoje)
- **Backend (RLS) bloqueando criação/edição** de `demand_statuses` para admins de quadro:
  - A policy atual de `demand_statuses` usa `is_board_admin_or_moderator(board_id, auth.uid())` com ordem invertida.
  - Não existe policy de **UPDATE** para admins de quadro em `demand_statuses`.
- **Fluxo de edição no frontend** atualiza `demand_statuses` antes de `board_statuses`; quando a primeira falha, o update todo “parece quebrado”.
- **Layout do painel de criação/edição** usa `max-h` sem altura fixa em toda a cadeia flex em alguns cenários, causando perda de scroll e botão fora da área visível.
- Em larguras intermediárias (ex.: ~1180), o painel lateral flutuante pode ficar apertado/ruim de usar.

---

### 2) Correção de backend (migração)
Vou aplicar uma migração para `demand_statuses`:
1. Recriar policy de INSERT com ordem correta:
   - `is_board_admin_or_moderator(auth.uid(), board_id)`
2. Recriar policy de DELETE com ordem correta.
3. Criar policy de UPDATE para admins/moderadores do quadro:
   - `USING` e `WITH CHECK` com `board_id IS NOT NULL AND is_board_admin_or_moderator(auth.uid(), board_id)`

Resultado esperado:
- Admin/moderador de quadro consegue criar/editar status do próprio quadro.
- Status globais continuam protegidos (sem liberar edição indevida para não-admin global).

---

### 3) Ajuste do fluxo “Criar Etapa” (frontend)
No `KanbanStagesManager` + hook `useCreateCustomStatus`:
- Passar `visible_to_roles` já no insert de `board_statuses` (sem query “pegar último criado”, que hoje é frágil).
- Retornar `board_status` criado no mutation para atualização local mais confiável.
- Manter campos:
  - nome
  - cor
  - tipo de aprovação
  - visibilidade por papel
- Garantir invalidação/refetch consistente após criar.

Resultado esperado:
- “Criar Etapa” salva tudo de uma vez e reflete corretamente no modal e no board.

---

### 4) Ajuste do fluxo “Editar Etapa” (frontend)
No `handleEditStatus`:
- Separar updates:
  - `board_statuses`: sempre atualizar `adjustment_type` e `visible_to_roles`.
  - `demand_statuses`: atualizar `name/color` apenas quando permitido (status do quadro).
- Evitar que falha em nome/cor impeça salvar visibilidade/aprovação.
- Melhorar mensagens de erro/sucesso para indicar exatamente o que foi salvo.

Resultado esperado:
- O botão “Salvar” funciona de forma previsível.
- “Update não funciona” deixa de ocorrer por bloqueio de fluxo único.

---

### 5) Correção de responsividade + scroll (principal dor atual)
No `KanbanStagesManager.tsx`:
- Tornar o container de formulário uma estrutura estável:
  - wrapper com `h-[85vh]`, `overflow-hidden`, `flex flex-col`
  - conteúdo com `flex-1 min-h-0 overflow-y-auto`
  - rodapé de ações com `shrink-0` e sempre visível
- Ajustar breakpoint do painel lateral:
  - painel flutuante só em telas largas (`xl`)
  - em telas menores, o editor abre como painel principal (não comprimido)
- Garantir largura responsiva segura para editor (`w-[92vw]`, `sm:w-[...]`, `max-w-[...]`).

Resultado esperado:
- Sempre dá para rolar até o final.
- Botão “Criar Etapa/Salvar” sempre aparece.
- UX consistente em desktop, notebook menor, tablet e mobile.

---

### 6) Hardening e validação final
- Corrigir acesso defensivo em contadores para evitar erro intermitente (`demandCounts?.[id]`).
- Testar cenários:
  1. Criar etapa com todos os campos
  2. Editar etapa custom
  3. Editar visibilidade/tipo em etapa padrão
  4. Scroll e botão visível em 1180x718, 1024x768 e mobile
  5. Persistência após fechar/reabrir modal

---

### Arquivos que serão ajustados
- `supabase/migrations/<nova_migracao>.sql` (RLS de `demand_statuses`)
- `src/components/KanbanStagesManager.tsx`
- `src/hooks/useBoardStatuses.ts`

---

### Detalhes técnicos (resumo)
- Causa-raiz principal: policy RLS incorreta + ausência de UPDATE policy em `demand_statuses`.
- Causa-raiz de UI: cadeia flex/altura sem travamento total em alguns breakpoints.
- Estratégia: corrigir permissões, tornar create/edit transacionalmente mais robusto, e padronizar layout com área rolável + rodapé fixo.
